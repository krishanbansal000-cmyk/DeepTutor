"""Curriculum module — templates, academic structure, and syllabus management.

Ported from the Drona platform's curriculum features to DeepTutor's
per-user JSON storage model. Provides:
  - Standard academic taxonomy (faculties, departments, programs)
  - Curriculum templates (e.g. ICAR B.Sc. Agriculture)
  - Adopt-a-template into a personal academic structure
  - Department → Program → Subject hierarchy with syllabi
"""

from deeptutor.curriculum.models import (
    CatalogProgram,
    CourseCategory,
    Department,
    ExitAward,
    Grading,
    Level,
    Program,
    Subject,
    Syllabus,
    TemplateCourse,
    TemplateSummary,
    TemplateDetail,
    CurriculumTemplate,
)
from deeptutor.curriculum.service import CurriculumService
from deeptutor.curriculum.storage import CurriculumStore

__all__ = [
    "CatalogProgram",
    "CourseCategory",
    "CurriculumService",
    "CurriculumStore",
    "CurriculumTemplate",
    "Department",
    "ExitAward",
    "Grading",
    "Level",
    "Program",
    "Subject",
    "Syllabus",
    "TemplateCourse",
    "TemplateDetail",
    "TemplateSummary",
]
