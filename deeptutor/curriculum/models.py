"""Pydantic models for the curriculum module."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Level(str, Enum):
    certificate = "certificate"
    diploma = "diploma"
    bachelor = "bachelor"
    master = "master"
    phd = "phd"
    integrated = "integrated"


class Grading(str, Enum):
    graded = "graded"
    non_gradial = "non_gradial"


class CourseCategory(str, Enum):
    core = "core"
    elective = "elective"
    skill = "skill"
    foundation = "foundation"
    experiential = "experiential"
    tour = "tour"


class ExitAward(BaseModel):
    after_year: int = Field(..., alias="afterYear")
    award: str

    model_config = {"populate_by_name": True}


class Syllabus(BaseModel):
    objectives: str | None = None
    theory: str | None = None
    practical: str | None = None
    readings: list[str] = Field(default_factory=list)


class Subject(BaseModel):
    id: str
    program_id: str = Field("", alias="programId")
    name: str
    code: str | None = None
    description: str = ""
    year: int | None = None
    semester: int | None = None
    credit_total: int = Field(0, alias="creditTotal")
    credit_theory: int = Field(0, alias="creditTheory")
    credit_practical: int = Field(0, alias="creditPractical")
    category: str | None = None
    grading: str = "graded"
    marks: dict[str, int] = Field(default_factory=dict)
    syllabus: Syllabus = Field(default_factory=Syllabus)
    elective_group: str | None = Field(None, alias="electiveGroup")
    position: int = 0
    created_at: float = 0.0
    updated_at: float = 0.0

    model_config = {"populate_by_name": True}


class Program(BaseModel):
    id: str
    department_id: str | None = Field(None, alias="departmentId")
    name: str
    level: str = "bachelor"
    code: str | None = None
    description: str = ""
    framework: str | None = None
    degree: str | None = None
    total_credits: int = Field(0, alias="totalCredits")
    duration_years: int | None = Field(None, alias="durationYears")
    exit_awards: list[ExitAward] = Field(default_factory=list, alias="exitAwards")
    template_code: str | None = Field(None, alias="templateCode")
    position: int = 0
    subjects: list[Subject] = Field(default_factory=list)
    created_at: float = 0.0
    updated_at: float = 0.0

    model_config = {"populate_by_name": True}


class Department(BaseModel):
    id: str
    parent_id: str | None = Field(None, alias="parentId")
    name: str
    kind: str = "department"
    position: int = 0
    children: list["Department"] = Field(default_factory=list)
    programs: list[Program] = Field(default_factory=list)
    created_at: float = 0.0
    updated_at: float = 0.0

    model_config = {"populate_by_name": True}


@dataclass
class TemplateCourse:
    """A single course in a curriculum template (uses positional args for brevity)."""

    year: int
    semester: int
    code: str
    title: str
    category: str
    credit: tuple[int, int, int] = (0, 0, 0)
    grading: str = "graded"
    marks: tuple[int, int, int] | None = None
    elective_group: str | None = None
    objectives: str | None = None
    theory: str | None = None
    practical: str | None = None
    readings: list[str] = field(default_factory=list)


class CurriculumTemplate(BaseModel):
    code: str
    name: str
    framework: str = ""
    degree: str = ""
    discipline: str = ""
    description: str = ""
    duration_years: int = Field(0, alias="durationYears")
    total_credits: int = Field(0, alias="totalCredits")
    exit_awards: list[ExitAward] = Field(default_factory=list, alias="exitAwards")
    metadata: dict[str, Any] = Field(default_factory=dict)
    courses: list[TemplateCourse] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class TemplateSummary(BaseModel):
    code: str
    name: str
    framework: str = ""
    degree: str = ""
    discipline: str = ""
    description: str = ""
    duration_years: int = 0
    total_credits: int = 0
    exit_awards: list[ExitAward] = Field(default_factory=list)
    course_count: int = 0
    semester_count: int = 0


class SemesterGroup(BaseModel):
    year: int
    semester: int
    credits: int
    courses: list[dict[str, Any]]


class TemplateDetail(TemplateSummary):
    semesters: list[SemesterGroup] = Field(default_factory=list)


class CatalogProgram(BaseModel):
    faculty: str
    department: str
    name: str
    level: Level


class AdoptResult(BaseModel):
    status: str  # "adopted" | "exists"
    program_id: str = Field("", alias="programId")
    name: str = ""
    semesters: int = 0
    subjects: int = 0

    model_config = {"populate_by_name": True}


class AcademicStructure(BaseModel):
    departments: list[Department]
    orphan_programs: list[Program] = Field(default_factory=list, alias="orphanPrograms")

    model_config = {"populate_by_name": True}


Department.model_rebuild()

__all__ = [
    "AcademicStructure",
    "AdoptResult",
    "CatalogProgram",
    "CourseCategory",
    "CurriculumTemplate",
    "Department",
    "ExitAward",
    "Grading",
    "Level",
    "Program",
    "SemesterGroup",
    "Subject",
    "Syllabus",
    "TemplateCourse",
    "TemplateDetail",
    "TemplateSummary",
]
