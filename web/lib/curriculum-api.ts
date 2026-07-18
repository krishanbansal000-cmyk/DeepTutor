// Curriculum API client — mirrors deeptutor/api/routers/curriculum.py
import { apiUrl, apiFetch } from "./api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ExitAward {
  afterYear: number;
  award: string;
}

export interface TemplateSummary {
  code: string;
  name: string;
  framework: string;
  degree: string;
  discipline: string;
  description: string;
  duration_years: number;
  total_credits: number;
  exit_awards: ExitAward[];
  course_count: number;
  semester_count: number;
}

export interface SemesterCourse {
  code: string;
  title: string;
  category: string;
  creditLabel: string;
  grading: string;
  electiveGroup: string | null;
  hasSyllabus: boolean;
}

export interface SemesterGroup {
  year: number;
  semester: number;
  credits: number;
  courses: SemesterCourse[];
}

export interface TemplateDetail extends TemplateSummary {
  semesters: SemesterGroup[];
}

export interface Syllabus {
  objectives: string | null;
  theory: string | null;
  practical: string | null;
  readings: string[];
}

export interface Subject {
  id: string;
  programId: string;
  name: string;
  code: string | null;
  description: string;
  year: number | null;
  semester: number | null;
  creditTotal: number;
  creditTheory: number;
  creditPractical: number;
  category: string | null;
  grading: string;
  marks: Record<string, number>;
  syllabus: Syllabus;
  electiveGroup: string | null;
  position: number;
}

export interface Program {
  id: string;
  departmentId: string | null;
  name: string;
  level: string;
  code: string | null;
  description: string;
  framework: string | null;
  degree: string | null;
  totalCredits: number;
  durationYears: number | null;
  exitAwards: ExitAward[];
  templateCode: string | null;
  position: number;
  subjects: Subject[];
}

export interface Department {
  id: string;
  parentId: string | null;
  name: string;
  kind: string;
  position: number;
  children: Department[];
  programs: Program[];
}

export interface AcademicStructure {
  departments: Department[];
  orphanPrograms: Program[];
}

export interface AdoptResult {
  status: "adopted" | "exists";
  programId: string;
  name: string;
  semesters: number;
  subjects: number;
}

export interface CatalogProgram {
  faculty: string;
  department: string;
  name: string;
  level: string;
}

// ── API calls ──────────────────────────────────────────────────────────────

export async function fetchTemplates(): Promise<TemplateSummary[]> {
  const res = await apiFetch(apiUrl("/api/v1/curriculum/templates"));
  if (!res.ok) throw new Error(`Failed to fetch templates: ${res.status}`);
  return res.json();
}

export async function fetchTemplate(code: string): Promise<TemplateDetail> {
  const res = await apiFetch(apiUrl(`/api/v1/curriculum/templates/${code}`));
  if (!res.ok) throw new Error(`Failed to fetch template: ${res.status}`);
  return res.json();
}

export async function adoptTemplate(code: string): Promise<AdoptResult> {
  const res = await apiFetch(apiUrl(`/api/v1/curriculum/templates/${code}/adopt`), {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to adopt template: ${res.status}`);
  return res.json();
}

export async function fetchStructure(): Promise<AcademicStructure> {
  const res = await apiFetch(apiUrl("/api/v1/curriculum/structure"));
  if (!res.ok) throw new Error(`Failed to fetch structure: ${res.status}`);
  return res.json();
}

export async function createDepartment(
  name: string,
  parentId?: string | null,
  kind?: string,
): Promise<Department> {
  const res = await apiFetch(apiUrl("/api/v1/curriculum/structure/departments"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parentId: parentId ?? null, kind }),
  });
  if (!res.ok) throw new Error(`Failed to create department: ${res.status}`);
  return res.json();
}

export async function createProgram(
  name: string,
  level: string,
  departmentId?: string | null,
  code?: string,
  durationYears?: number,
): Promise<Program> {
  const res = await apiFetch(apiUrl("/api/v1/curriculum/structure/programs"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, level, departmentId: departmentId ?? null, code, durationYears }),
  });
  if (!res.ok) throw new Error(`Failed to create program: ${res.status}`);
  return res.json();
}

export async function createSubject(
  programId: string,
  name: string,
  code?: string,
  semester?: number,
  creditTotal?: number,
): Promise<Subject> {
  const res = await apiFetch(apiUrl("/api/v1/curriculum/structure/subjects"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ programId, name, code, semester, creditTotal: creditTotal ?? 0 }),
  });
  if (!res.ok) throw new Error(`Failed to create subject: ${res.status}`);
  return res.json();
}

export async function renameNode(
  kind: "department" | "program" | "subject",
  nodeId: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const res = await apiFetch(apiUrl(`/api/v1/curriculum/structure/${kind}/${nodeId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Failed to rename: ${res.status}`);
  return true;
}

export async function deleteNode(
  kind: "department" | "program" | "subject",
  nodeId: string,
): Promise<boolean> {
  const res = await apiFetch(apiUrl(`/api/v1/curriculum/structure/${kind}/${nodeId}`), {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
  return true;
}

export async function resetStructure(): Promise<boolean> {
  const res = await apiFetch(apiUrl("/api/v1/curriculum/structure"), {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to reset structure: ${res.status}`);
  return true;
}

export async function fetchCatalog(): Promise<{
  levels: unknown[];
  faculties: unknown[];
  programs: CatalogProgram[];
}> {
  const res = await apiFetch(apiUrl("/api/v1/curriculum/catalog"));
  if (!res.ok) throw new Error(`Failed to fetch catalog: ${res.status}`);
  return res.json();
}

export async function applyCatalog(selections: CatalogProgram[]): Promise<{ programs: number }> {
  const res = await apiFetch(apiUrl("/api/v1/curriculum/catalog/apply"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selections }),
  });
  if (!res.ok) throw new Error(`Failed to apply catalog: ${res.status}`);
  return res.json();
}
