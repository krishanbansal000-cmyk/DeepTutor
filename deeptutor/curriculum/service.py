"""Curriculum service — CRUD, template listing, and template adoption.

Ported from Drona's ``src/lib/curriculum.ts`` and ``src/lib/academics.ts``,
adapted to DeepTutor's per-user JSON storage model.
"""

from __future__ import annotations

from collections import defaultdict

from deeptutor.curriculum.icar_agriculture import ALL_TEMPLATES
from deeptutor.curriculum.models import (
    AcademicStructure,
    AdoptResult,
    CatalogProgram,
    CurriculumTemplate,
    Department,
    Program,
    SemesterGroup,
    Subject,
    Syllabus,
    TemplateDetail,
    TemplateSummary,
)
from deeptutor.curriculum.storage import CurriculumStore, _new_id, _now
from deeptutor.curriculum.taxonomy import flatten_catalog

_ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]


def _roman(n: int) -> str:
    return _ROMAN[n] if 0 < n < len(_ROMAN) else str(n)


def _credit_label(total: int, theory: int, practical: int) -> str:
    return f"{total}({theory}+{practical})"


class CurriculumService:
    """High-level operations on the academic structure and templates."""

    def __init__(self, store: CurriculumStore | None = None) -> None:
        self._store = store or CurriculumStore()

    # ── structure CRUD ──────────────────────────────────────────────────────

    def load_structure(self) -> AcademicStructure:
        return self._store.load()

    def _save(self, structure: AcademicStructure) -> None:
        self._store.save(structure)

    def _find_dept(self, structure: AcademicStructure, dept_id: str) -> Department | None:
        def search(depts: list[Department]) -> Department | None:
            for d in depts:
                if d.id == dept_id:
                    return d
                found = search(d.children)
                if found:
                    return found
            return None
        return search(structure.departments)

    def _find_program(self, structure: AcademicStructure, program_id: str) -> Program | None:
        def search(depts: list[Department]) -> Program | None:
            for d in depts:
                for p in d.programs:
                    if p.id == program_id:
                        return p
                found = search(d.children)
                if found:
                    return found
            return None
        result = search(structure.departments)
        if result:
            return result
        for p in structure.orphan_programs:
            if p.id == program_id:
                return p
        return None

    def _find_subject(self, structure: AcademicStructure, subject_id: str) -> Subject | None:
        def search_programs(programs: list[Program]) -> Subject | None:
            for p in programs:
                for s in p.subjects:
                    if s.id == subject_id:
                        return s
            return None

        def search_depts(depts: list[Department]) -> Subject | None:
            for d in depts:
                found = search_programs(d.programs) or search_depts(d.children)
                if found:
                    return found
            return None

        return search_depts(structure.departments) or search_programs(structure.orphan_programs)

    def _remove_program(self, structure: AcademicStructure, program_id: str) -> bool:
        def from_depts(depts: list[Department]) -> bool:
            for d in depts:
                before = len(d.programs)
                d.programs = [p for p in d.programs if p.id != program_id]
                if len(d.programs) < before:
                    return True
                if from_depts(d.children):
                    return True
            return False

        if from_depts(structure.departments):
            return True
        before = len(structure.orphan_programs)
        structure.orphan_programs = [p for p in structure.orphan_programs if p.id != program_id]
        return len(structure.orphan_programs) < before

    def create_department(
        self, name: str, parent_id: str | None = None, kind: str | None = None
    ) -> Department:
        structure = self.load_structure()
        resolved_kind = kind or ("department" if parent_id else "faculty")
        siblings = self._dept_siblings(structure, parent_id)
        dept = Department(
            id=_new_id(),
            parent_id=parent_id,
            name=name,
            kind=resolved_kind,
            position=max((d.position for d in siblings), default=-1) + 1,
            created_at=_now(),
            updated_at=_now(),
        )
        if parent_id:
            parent = self._find_dept(structure, parent_id)
            if parent:
                parent.children.append(dept)
            else:
                structure.departments.append(dept)
        else:
            structure.departments.append(dept)
        self._save(structure)
        return dept

    def _dept_siblings(self, structure: AcademicStructure, parent_id: str | None) -> list[Department]:
        if parent_id:
            parent = self._find_dept(structure, parent_id)
            return parent.children if parent else []
        return structure.departments

    def create_program(
        self,
        name: str,
        level: str = "bachelor",
        department_id: str | None = None,
        code: str | None = None,
        duration_years: int | None = None,
    ) -> Program:
        structure = self.load_structure()
        if department_id:
            dept = self._find_dept(structure, department_id)
            siblings = dept.programs if dept else []
        else:
            siblings = structure.orphan_programs
        program = Program(
            id=_new_id(),
            department_id=department_id,
            name=name,
            level=level,
            code=code,
            duration_years=duration_years,
            position=max((p.position for p in siblings), default=-1) + 1,
            created_at=_now(),
            updated_at=_now(),
        )
        if department_id and dept:
            dept.programs.append(program)
        else:
            structure.orphan_programs.append(program)
        self._save(structure)
        return program

    def create_subject(
        self,
        program_id: str,
        name: str,
        code: str | None = None,
        semester: int | None = None,
        credit_total: int = 0,
    ) -> Subject:
        structure = self.load_structure()
        program = self._find_program(structure, program_id)
        if not program:
            raise ValueError(f"Program {program_id} not found")
        subject = Subject(
            id=_new_id(),
            program_id=program_id,
            name=name,
            code=code,
            semester=semester,
            credit_total=credit_total,
            position=max((s.position for s in program.subjects), default=-1) + 1,
            created_at=_now(),
            updated_at=_now(),
        )
        program.subjects.append(subject)
        program.updated_at = _now()
        self._save(structure)
        return subject

    def rename_node(
        self, kind: str, node_id: str, patch: dict[str, object]
    ) -> bool:
        structure = self.load_structure()
        if kind == "department":
            dept = self._find_dept(structure, node_id)
            if not dept:
                return False
            if "name" in patch:
                dept.name = str(patch["name"])
            dept.updated_at = _now()
        elif kind == "program":
            program = self._find_program(structure, node_id)
            if not program:
                return False
            for key in ("name", "level", "code", "duration_years"):
                if key in patch:
                    setattr(program, key, patch[key])
            program.updated_at = _now()
        elif kind == "subject":
            subject = self._find_subject(structure, node_id)
            if not subject:
                return False
            for key in ("name", "code", "semester", "category"):
                if key in patch:
                    setattr(subject, key, patch[key])
            subject.updated_at = _now()
        else:
            return False
        self._save(structure)
        return True

    def delete_node(self, kind: str, node_id: str) -> bool:
        structure = self.load_structure()
        if kind == "subject":
            return self._delete_subject(structure, node_id)
        if kind == "program":
            ok = self._remove_program(structure, node_id)
            if ok:
                self._save(structure)
            return ok
        if kind == "department":
            return self._delete_department(structure, node_id)
        return False

    def _delete_subject(self, structure: AcademicStructure, subject_id: str) -> bool:
        def from_programs(programs: list[Program]) -> bool:
            for p in programs:
                before = len(p.subjects)
                p.subjects = [s for s in p.subjects if s.id != subject_id]
                if len(p.subjects) < before:
                    p.updated_at = _now()
                    return True
            return False

        def from_depts(depts: list[Department]) -> bool:
            for d in depts:
                if from_programs(d.programs):
                    return True
                if from_depts(d.children):
                    return True
            return False

        result = from_depts(structure.departments) or from_programs(structure.orphan_programs)
        if result:
            self._save(structure)
        return result

    def _delete_department(self, structure: AcademicStructure, dept_id: str) -> bool:
        def remove_from(depts: list[Department]) -> bool:
            for i, d in enumerate(depts):
                if d.id == dept_id:
                    depts.pop(i)
                    return True
                if remove_from(d.children):
                    return True
            return False

        result = remove_from(structure.departments)
        if result:
            self._save(structure)
        return result

    # ── taxonomy seeding ────────────────────────────────────────────────────

    def apply_catalog(self, selections: list[CatalogProgram]) -> dict[str, int]:
        structure = self.load_structure()
        created = 0
        for sel in selections:
            faculty_id = self._ensure_dept(structure, sel.faculty, "faculty", None)
            dept_id = self._ensure_dept(structure, sel.department, "department", faculty_id)
            dept = self._find_dept(structure, dept_id)
            if dept and any(p.name == sel.name for p in dept.programs):
                continue
            if dept:
                dept.programs.append(
                    Program(
                        id=_new_id(),
                        department_id=dept_id,
                        name=sel.name,
                        level=sel.level.value,
                        position=max((p.position for p in dept.programs), default=-1) + 1,
                        created_at=_now(),
                        updated_at=_now(),
                    )
                )
                created += 1
        self._save(structure)
        return {"programs": created}

    def _ensure_dept(
        self,
        structure: AcademicStructure,
        name: str,
        kind: str,
        parent_id: str | None,
    ) -> str:
        existing = self._find_dept_by_name(structure, name, parent_id)
        if existing:
            return existing.id
        dept = Department(
            id=_new_id(),
            parent_id=parent_id,
            name=name,
            kind=kind,
            position=0,
            created_at=_now(),
            updated_at=_now(),
        )
        if parent_id:
            parent = self._find_dept(structure, parent_id)
            if parent:
                parent.children.append(dept)
            else:
                structure.departments.append(dept)
        else:
            structure.departments.append(dept)
        return dept.id

    def _find_dept_by_name(
        self, structure: AcademicStructure, name: str, parent_id: str | None
    ) -> Department | None:
        def search(depts: list[Department]) -> Department | None:
            for d in depts:
                if d.name == name and (d.parent_id or None) == (parent_id or None):
                    return d
                found = search(d.children)
                if found:
                    return found
            return None
        return search(structure.departments)

    def existing_program_names(self) -> set[str]:
        structure = self.load_structure()
        names: set[str] = set()
        def collect(depts: list[Department]) -> None:
            for d in depts:
                for p in d.programs:
                    names.add(p.name)
                collect(d.children)
        collect(structure.departments)
        for p in structure.orphan_programs:
            names.add(p.name)
        return names

    # ── templates ───────────────────────────────────────────────────────────

    def list_templates(self) -> list[TemplateSummary]:
        summaries: list[TemplateSummary] = []
        for t in ALL_TEMPLATES:
            semesters = {c.semester for c in t.courses}
            summaries.append(
                TemplateSummary(
                    code=t.code,
                    name=t.name,
                    framework=t.framework,
                    degree=t.degree,
                    discipline=t.discipline,
                    description=t.description,
                    duration_years=t.duration_years,
                    total_credits=t.total_credits,
                    exit_awards=t.exit_awards,
                    course_count=len(t.courses),
                    semester_count=len(semesters),
                )
            )
        return summaries

    def get_template(self, code: str) -> TemplateDetail | None:
        t = next((tpl for tpl in ALL_TEMPLATES if tpl.code == code), None)
        if not t:
            return None
        by_sem: dict[int, SemesterGroup] = {}
        for c in t.courses:
            sem = by_sem.get(c.semester)
            if not sem:
                sem = SemesterGroup(
                    year=c.year,
                    semester=c.semester,
                    credits=0,
                    courses=[],
                )
                by_sem[c.semester] = sem
            sem.credits += c.credit[0]
            sem.courses.append({
                "code": c.code,
                "title": c.title,
                "category": c.category,
                "creditLabel": _credit_label(c.credit[0], c.credit[1], c.credit[2]),
                "grading": c.grading,
                "electiveGroup": c.elective_group,
                "hasSyllabus": bool(c.objectives or c.theory or c.practical),
            })
        semesters = sorted(by_sem.values(), key=lambda s: s.semester)
        return TemplateDetail(
            code=t.code,
            name=t.name,
            framework=t.framework,
            degree=t.degree,
            discipline=t.discipline,
            description=t.description,
            duration_years=t.duration_years,
            total_credits=t.total_credits,
            exit_awards=t.exit_awards,
            course_count=len(t.courses),
            semester_count=len(by_sem),
            semesters=semesters,
        )

    def get_template_raw(self, code: str) -> CurriculumTemplate | None:
        return next((tpl for tpl in ALL_TEMPLATES if tpl.code == code), None)

    # ── adopt ───────────────────────────────────────────────────────────────

    def adopt_template(self, code: str) -> AdoptResult | None:
        t = self.get_template_raw(code)
        if not t:
            return None
        structure = self.load_structure()

        # Idempotency: one adoption per template.
        existing = self._find_program_by_template(structure, t.code)
        if existing:
            return AdoptResult(status="exists", program_id=existing.id, name=existing.name)

        # Create a department for the discipline if it doesn't exist.
        dept_id = self._ensure_dept(structure, t.discipline or "Agriculture", "department", None)
        dept = self._find_dept(structure, dept_id)

        program = Program(
            id=_new_id(),
            department_id=dept_id,
            name=t.name,
            level="bachelor",
            code=t.code,
            description=t.description,
            framework=t.framework,
            degree=t.degree,
            total_credits=t.total_credits,
            duration_years=t.duration_years,
            exit_awards=t.exit_awards,
            template_code=t.code,
            position=max((p.position for p in dept.programs), default=-1) + 1 if dept else 0,
            created_at=_now(),
            updated_at=_now(),
        )
        if dept:
            dept.programs.append(program)
        else:
            structure.orphan_programs.append(program)

        # Create subjects from template courses.
        for i, c in enumerate(t.courses):
            marks = c.marks or (0, 0, 0)
            program.subjects.append(
                Subject(
                    id=_new_id(),
                    program_id=program.id,
                    name=c.title,
                    code=c.code,
                    description=c.objectives or "",
                    year=c.year,
                    semester=c.semester,
                    credit_total=c.credit[0],
                    credit_theory=c.credit[1],
                    credit_practical=c.credit[2],
                    category=c.category,
                    grading=c.grading,
                    marks={"theory": marks[0], "internal": marks[1], "practical": marks[2]},
                    syllabus=Syllabus(
                        objectives=c.objectives,
                        theory=c.theory,
                        practical=c.practical,
                        readings=c.readings,
                    ),
                    elective_group=c.elective_group,
                    position=i,
                    created_at=_now(),
                    updated_at=_now(),
                )
            )

        semesters = sorted({c.semester for c in t.courses})
        self._save(structure)
        return AdoptResult(
            status="adopted",
            program_id=program.id,
            name=program.name,
            semesters=len(semesters),
            subjects=len(t.courses),
        )

    def _find_program_by_template(
        self, structure: AcademicStructure, template_code: str
    ) -> Program | None:
        def search(depts: list[Department]) -> Program | None:
            for d in depts:
                for p in d.programs:
                    if p.template_code == template_code:
                        return p
                found = search(d.children)
                if found:
                    return found
            return None
        result = search(structure.departments)
        if result:
            return result
        for p in structure.orphan_programs:
            if p.template_code == template_code:
                return p
        return None

    def reset(self) -> None:
        self._store.reset()


__all__ = ["CurriculumService"]
