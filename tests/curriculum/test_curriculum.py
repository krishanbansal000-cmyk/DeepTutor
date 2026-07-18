"""Tests for the curriculum service."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from deeptutor.curriculum.models import (
    AcademicStructure,
    CatalogProgram,
    Department,
    Level,
    Program,
    Subject,
    Syllabus,
)
from deeptutor.curriculum.service import CurriculumService
from deeptutor.curriculum.storage import CurriculumStore


@pytest.fixture
def tmp_store(tmp_path: Path) -> CurriculumStore:
    return CurriculumStore(root=tmp_path / "curriculum")


@pytest.fixture
def service(tmp_store: CurriculumStore) -> CurriculumService:
    return CurriculumService(store=tmp_store)


class TestTemplates:
    def test_list_templates(self, service: CurriculumService) -> None:
        templates = service.list_templates()
        assert len(templates) >= 1
        icar = next(t for t in templates if t.code == "ICAR-BSC-AGRI")
        assert icar.name == "B.Sc. (Hons) Agriculture"
        assert icar.course_count > 0
        assert icar.semester_count == 8
        assert icar.total_credits == 177

    def test_get_template_detail(self, service: CurriculumService) -> None:
        detail = service.get_template("ICAR-BSC-AGRI")
        assert detail is not None
        assert len(detail.semesters) == 8
        sem1 = detail.semesters[0]
        assert sem1.semester == 1
        assert sem1.year == 1
        assert len(sem1.courses) > 0
        # Check that some courses have syllabi
        has_syllabus = any(c["hasSyllabus"] for c in sem1.courses)
        assert has_syllabus

    def test_get_template_not_found(self, service: CurriculumService) -> None:
        assert service.get_template("NONEXISTENT") is None


class TestAdopt:
    def test_adopt_creates_structure(self, service: CurriculumService) -> None:
        result = service.adopt_template("ICAR-BSC-AGRI")
        assert result is not None
        assert result.status == "adopted"
        assert result.subjects > 0
        assert result.semesters == 8

        structure = service.load_structure()
        # Should have a department for Agriculture
        assert len(structure.departments) >= 1
        # Should have a program with template_code
        found = False
        for dept in structure.departments:
            for prog in dept.programs:
                if prog.template_code == "ICAR-BSC-AGRI":
                    found = True
                    assert len(prog.subjects) == result.subjects
                    # Check first subject has syllabus
                    first = prog.subjects[0]
                    assert first.code is not None
                    assert first.year is not None
                    assert first.semester is not None
        assert found

    def test_adopt_is_idempotent(self, service: CurriculumService) -> None:
        first = service.adopt_template("ICAR-BSC-AGRI")
        assert first is not None
        assert first.status == "adopted"

        second = service.adopt_template("ICAR-BSC-AGRI")
        assert second is not None
        assert second.status == "exists"
        assert second.program_id == first.program_id

    def test_adopt_subject_has_full_syllabus(self, service: CurriculumService) -> None:
        service.adopt_template("ICAR-BSC-AGRI")
        structure = service.load_structure()
        # Find AGR-102 (Fundamentals of Agronomy) — it has full syllabus
        found = False
        for dept in structure.departments:
            for prog in dept.programs:
                for subj in prog.subjects:
                    if subj.code == "AGR-102":
                        found = True
                        assert subj.syllabus.objectives is not None
                        assert subj.syllabus.theory is not None
                        assert subj.syllabus.practical is not None
                        assert len(subj.syllabus.readings) == 3
                        assert subj.credit_total == 3
                        assert subj.credit_theory == 2
                        assert subj.credit_practical == 1
                        assert subj.category == "core"
                        assert subj.marks == {"theory": 50, "internal": 20, "practical": 30}
        assert found


class TestStructureCRUD:
    def test_create_department(self, service: CurriculumService) -> None:
        dept = service.create_department("Science", kind="faculty")
        assert dept.name == "Science"
        assert dept.kind == "faculty"
        assert dept.id != ""

        structure = service.load_structure()
        assert len(structure.departments) == 1
        assert structure.departments[0].name == "Science"

    def test_create_nested_department(self, service: CurriculumService) -> None:
        faculty = service.create_department("Science", kind="faculty")
        dept = service.create_department("Physics", parent_id=faculty.id, kind="department")
        assert dept.parent_id == faculty.id

        structure = service.load_structure()
        assert len(structure.departments) == 1
        assert len(structure.departments[0].children) == 1
        assert structure.departments[0].children[0].name == "Physics"

    def test_create_program(self, service: CurriculumService) -> None:
        dept = service.create_department("Science", kind="faculty")
        prog = service.create_program("B.Sc. Physics", level="bachelor", department_id=dept.id)
        assert prog.name == "B.Sc. Physics"
        assert prog.department_id == dept.id

        structure = service.load_structure()
        assert len(structure.departments[0].programs) == 1

    def test_create_program_orphan(self, service: CurriculumService) -> None:
        prog = service.create_program("B.Sc. Physics", level="bachelor")
        assert prog.department_id is None

        structure = service.load_structure()
        assert len(structure.orphan_programs) == 1

    def test_create_subject(self, service: CurriculumService) -> None:
        prog = service.create_program("B.Sc. Physics", level="bachelor")
        subj = service.create_subject(prog.id, "Mechanics", code="PHY-101", semester=1, credit_total=3)
        assert subj.name == "Mechanics"
        assert subj.program_id == prog.id
        assert subj.code == "PHY-101"

        structure = service.load_structure()
        assert len(structure.orphan_programs[0].subjects) == 1

    def test_rename_department(self, service: CurriculumService) -> None:
        dept = service.create_department("Science")
        ok = service.rename_node("department", dept.id, {"name": "Natural Sciences"})
        assert ok
        structure = service.load_structure()
        assert structure.departments[0].name == "Natural Sciences"

    def test_rename_program(self, service: CurriculumService) -> None:
        prog = service.create_program("B.Sc. Physics")
        ok = service.rename_node("program", prog.id, {"name": "B.Sc. Applied Physics", "level": "master"})
        assert ok
        structure = service.load_structure()
        assert structure.orphan_programs[0].name == "B.Sc. Applied Physics"
        assert structure.orphan_programs[0].level == "master"

    def test_delete_subject(self, service: CurriculumService) -> None:
        prog = service.create_program("B.Sc. Physics")
        subj = service.create_subject(prog.id, "Mechanics")
        ok = service.delete_node("subject", subj.id)
        assert ok
        structure = service.load_structure()
        assert len(structure.orphan_programs[0].subjects) == 0

    def test_delete_program(self, service: CurriculumService) -> None:
        prog = service.create_program("B.Sc. Physics")
        service.create_subject(prog.id, "Mechanics")
        ok = service.delete_node("program", prog.id)
        assert ok
        structure = service.load_structure()
        assert len(structure.orphan_programs) == 0

    def test_delete_department(self, service: CurriculumService) -> None:
        dept = service.create_department("Science")
        service.create_program("B.Sc. Physics", department_id=dept.id)
        ok = service.delete_node("department", dept.id)
        assert ok
        structure = service.load_structure()
        assert len(structure.departments) == 0

    def test_reset(self, service: CurriculumService) -> None:
        service.create_department("Science")
        service.reset()
        structure = service.load_structure()
        assert len(structure.departments) == 0


class TestCatalog:
    def test_apply_catalog(self, service: CurriculumService) -> None:
        selections = [
            CatalogProgram(
                faculty="Science",
                department="Physics",
                name="B.Sc. Physics",
                level=Level.bachelor,
            ),
            CatalogProgram(
                faculty="Science",
                department="Physics",
                name="M.Sc. Physics",
                level=Level.master,
            ),
        ]
        result = service.apply_catalog(selections)
        assert result["programs"] == 2

        structure = service.load_structure()
        # Should have "Science" faculty → "Physics" department → 2 programs
        assert len(structure.departments) == 1
        science = structure.departments[0]
        assert science.name == "Science"
        assert len(science.children) == 1
        physics = science.children[0]
        assert physics.name == "Physics"
        assert len(physics.programs) == 2

    def test_apply_catalog_idempotent(self, service: CurriculumService) -> None:
        selections = [
            CatalogProgram(
                faculty="Science",
                department="Physics",
                name="B.Sc. Physics",
                level=Level.bachelor,
            ),
        ]
        service.apply_catalog(selections)
        result = service.apply_catalog(selections)
        assert result["programs"] == 0  # Already exists

    def test_existing_program_names(self, service: CurriculumService) -> None:
        service.create_program("B.Sc. Physics")
        names = service.existing_program_names()
        assert "B.Sc. Physics" in names


class TestStorage:
    def test_persistence(self, tmp_path: Path) -> None:
        store1 = CurriculumStore(root=tmp_path / "curriculum")
        service1 = CurriculumService(store=store1)
        service1.create_department("Science")

        # New store instance should load the same data
        store2 = CurriculumStore(root=tmp_path / "curriculum")
        service2 = CurriculumService(store=store2)
        structure = service2.load_structure()
        assert len(structure.departments) == 1
        assert structure.departments[0].name == "Science"
