"""Curriculum API router — templates, academic structure, and adoption.

Endpoints:
  GET    /api/v1/curriculum/templates              List curriculum templates
  GET    /api/v1/curriculum/templates/{code}        Get template detail
  POST   /api/v1/curriculum/templates/{code}/adopt  Adopt a template into structure
  GET    /api/v1/curriculum/structure               Get academic structure
  POST   /api/v1/curriculum/structure/departments   Create department
  POST   /api/v1/curriculum/structure/programs      Create program
  POST   /api/v1/curriculum/structure/subjects      Create subject
  PATCH  /api/v1/curriculum/structure/{kind}/{id}   Rename/update node
  DELETE /api/v1/curriculum/structure/{kind}/{id}   Delete node
  GET    /api/v1/curriculum/catalog                 Get standard taxonomy catalog
  POST   /api/v1/curriculum/catalog/apply           Apply catalog selections
  DELETE /api/v1/curriculum/structure               Reset structure
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from deeptutor.curriculum.models import (
    AcademicStructure,
    AdoptResult,
    CatalogProgram,
    Department,
    Program,
    Subject,
    TemplateDetail,
    TemplateSummary,
)
from deeptutor.curriculum.service import CurriculumService
from deeptutor.curriculum.taxonomy import LEVELS, STANDARD_FACULTIES, flatten_catalog, level_label

router = APIRouter()


def _service() -> CurriculumService:
    return CurriculumService()


# ── request models ──────────────────────────────────────────────────────────


class CreateDepartmentBody(BaseModel):
    name: str
    parent_id: str | None = Field(None, alias="parentId")
    kind: str | None = None

    model_config = {"populate_by_name": True}


class CreateProgramBody(BaseModel):
    name: str
    level: str = "bachelor"
    department_id: str | None = Field(None, alias="departmentId")
    code: str | None = None
    duration_years: int | None = Field(None, alias="durationYears")

    model_config = {"populate_by_name": True}


class CreateSubjectBody(BaseModel):
    program_id: str = Field(..., alias="programId")
    name: str
    code: str | None = None
    semester: int | None = None
    credit_total: int = Field(0, alias="creditTotal")

    model_config = {"populate_by_name": True}


class RenameBody(BaseModel):
    name: str | None = None
    level: str | None = None
    code: str | None = None
    duration_years: int | None = None
    semester: int | None = None
    category: str | None = None


class ApplyCatalogBody(BaseModel):
    selections: list[CatalogProgram]


# ── template endpoints ──────────────────────────────────────────────────────


@router.get("/templates", response_model=list[TemplateSummary])
async def list_templates() -> list[TemplateSummary]:
    return _service().list_templates()


@router.get("/templates/{code}", response_model=TemplateDetail)
async def get_template(code: str) -> TemplateDetail:
    detail = _service().get_template(code)
    if not detail:
        raise HTTPException(status_code=404, detail="Template not found")
    return detail


@router.post("/templates/{code}/adopt", response_model=AdoptResult)
async def adopt_template(code: str) -> AdoptResult:
    result = _service().adopt_template(code)
    if not result:
        raise HTTPException(status_code=404, detail="Template not found")
    return result


# ── structure endpoints ─────────────────────────────────────────────────────


@router.get("/structure", response_model=AcademicStructure)
async def get_structure() -> AcademicStructure:
    return _service().load_structure()


@router.post("/structure/departments", response_model=Department)
async def create_department(body: CreateDepartmentBody) -> Department:
    try:
        return _service().create_department(
            name=body.name, parent_id=body.parent_id, kind=body.kind
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/structure/programs", response_model=Program)
async def create_program(body: CreateProgramBody) -> Program:
    try:
        return _service().create_program(
            name=body.name,
            level=body.level,
            department_id=body.department_id,
            code=body.code,
            duration_years=body.duration_years,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/structure/subjects", response_model=Subject)
async def create_subject(body: CreateSubjectBody) -> Subject:
    try:
        return _service().create_subject(
            program_id=body.program_id,
            name=body.name,
            code=body.code,
            semester=body.semester,
            credit_total=body.credit_total,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/structure/{kind}/{node_id}")
async def rename_node(kind: str, node_id: str, body: RenameBody) -> dict[str, bool]:
    if kind not in ("department", "program", "subject"):
        raise HTTPException(status_code=400, detail="Invalid kind")
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    ok = _service().rename_node(kind, node_id, patch)
    if not ok:
        raise HTTPException(status_code=404, detail="Node not found")
    return {"ok": True}


@router.delete("/structure/{kind}/{node_id}")
async def delete_node(kind: str, node_id: str) -> dict[str, bool]:
    if kind not in ("department", "program", "subject"):
        raise HTTPException(status_code=400, detail="Invalid kind")
    ok = _service().delete_node(kind, node_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Node not found")
    return {"ok": True}


@router.delete("/structure")
async def reset_structure() -> dict[str, bool]:
    _service().reset()
    return {"ok": True}


# ── catalog endpoints ───────────────────────────────────────────────────────


@router.get("/catalog")
async def get_catalog() -> dict:
    return {
        "levels": LEVELS,
        "faculties": STANDARD_FACULTIES,
        "programs": [p.model_dump(mode="json") for p in flatten_catalog()],
    }


@router.post("/catalog/apply")
async def apply_catalog(body: ApplyCatalogBody) -> dict[str, int]:
    result = _service().apply_catalog(body.selections)
    return result


__all__ = ["router"]
