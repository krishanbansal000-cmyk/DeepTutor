"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  GraduationCap,
  Layers,
  Loader2,
  Network,
  Plus,
  Sparkles,
  Trash2,
  University,
} from "lucide-react";
import {
  AcademicStructure,
  AdoptResult,
  Department,
  Program,
  Subject,
  TemplateDetail,
  TemplateSummary,
  fetchStructure,
  fetchTemplate,
  fetchTemplates,
  adoptTemplate,
  resetStructure,
} from "@/lib/curriculum-api";

type Tab = "templates" | "structure";

export default function CurriculumPage() {
  const [tab, setTab] = useState<Tab>("templates");
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [structure, setStructure] = useState<AcademicStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const tpls = await fetchTemplates();
      setTemplates(tpls);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    }
  }, []);

  const loadStructure = useCallback(async () => {
    try {
      const s = await fetchStructure();
      setStructure(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load structure");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTemplates(), fetchStructure()])
      .then(([tpls, academicStructure]) => {
        if (cancelled) return;
        setTemplates(tpls);
        setStructure(academicStructure);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Failed to load curriculum");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
          <GraduationCap className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Curriculum</h1>
          <p className="text-[13px] text-[var(--muted-foreground)]">
            Browse standard curriculum templates and manage your academic structure.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-[var(--border)]">
        <TabButton active={tab === "templates"} onClick={() => setTab("templates")} icon={<Layers className="h-4 w-4" />}>
          Templates
        </TabButton>
        <TabButton active={tab === "structure"} onClick={() => setTab("structure")} icon={<Network className="h-4 w-4" />}>
          My Structure
        </TabButton>
      </div>

      {loading && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && tab === "templates" && (
        <TemplatesTab templates={templates} onAdopted={() => loadStructure()} />
      )}
      {!loading && tab === "structure" && structure && (
        <StructureTab structure={structure} onReset={async () => { await resetStructure(); await loadStructure(); }} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${
        active
          ? "border-[var(--accent)] text-[var(--foreground)]"
          : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// ── Templates Tab ──────────────────────────────────────────────────────────

function TemplatesTab({
  templates,
  onAdopted,
}: {
  templates: TemplateSummary[];
  onAdopted: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [adopting, setAdopting] = useState(false);
  const [adoptResult, setAdoptResult] = useState<AdoptResult | null>(null);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    fetchTemplate(selected)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [selected]);

  const handleAdopt = async () => {
    if (!selected) return;
    setAdopting(true);
    setAdoptResult(null);
    try {
      const result = await adoptTemplate(selected);
      setAdoptResult(result);
      onAdopted();
    } catch (e) {
      setAdoptResult({ status: "exists", programId: "", name: "", semesters: 0, subjects: 0 });
    } finally {
      setAdopting(false);
    }
  };

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] p-8 text-center text-[13px] text-[var(--muted-foreground)]">
        No curriculum templates available yet.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Template list */}
      <div className="space-y-2">
        {templates.map((t) => (
          <button
            key={t.code}
            onClick={() => setSelected(t.code)}
            className={`w-full rounded-lg border p-3 text-left transition-colors ${
              selected === t.code
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--border)] hover:border-[var(--accent)]/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 shrink-0 text-[var(--accent)]" />
              <span className="text-[13px] font-medium text-[var(--foreground)]">{t.name}</span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{t.framework}</p>
            <div className="mt-2 flex gap-3 text-[11px] text-[var(--muted-foreground)]">
              <span>{t.course_count} courses</span>
              <span>{t.semester_count} semesters</span>
              <span>{t.total_credits} credits</span>
            </div>
          </button>
        ))}
      </div>

      {/* Template detail */}
      <div>
        {!selected && (
          <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-[var(--muted-foreground)]">
            Select a template to view its curriculum.
          </div>
        )}
        {selected && loadingDetail && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        )}
        {selected && detail && !loadingDetail && (
          <div>
            <div className="mb-4 rounded-lg border border-[var(--border)] p-4">
              <h2 className="text-base font-semibold text-[var(--foreground)]">{detail.name}</h2>
              <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">{detail.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <Badge>{detail.framework}</Badge>
                <Badge>{detail.degree}</Badge>
                <Badge>{detail.duration_years} years</Badge>
                <Badge>{detail.total_credits} credits</Badge>
                {detail.exit_awards.map((ea) => (
                  <Badge key={ea.award}>Exit: {ea.award}</Badge>
                ))}
              </div>
              {adoptResult && (
                <div
                  className={`mt-3 rounded px-3 py-2 text-[12px] ${
                    adoptResult.status === "adopted"
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {adoptResult.status === "adopted"
                    ? `Adopted: ${adoptResult.subjects} subjects across ${adoptResult.semesters} semesters.`
                    : "Already adopted into your structure."}
                </div>
              )}
              <button
                onClick={handleAdopt}
                disabled={adopting}
                className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {adopting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {adopting ? "Adopting…" : "Adopt into My Structure"}
              </button>
            </div>

            {/* Semesters */}
            <div className="space-y-3">
              {detail.semesters.map((sem) => (
                <div key={sem.semester} className="rounded-lg border border-[var(--border)]">
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
                    <span className="text-[13px] font-medium text-[var(--foreground)]">
                      Year {sem.year} · Semester {romanize(sem.semester)}
                    </span>
                    <span className="text-[11px] text-[var(--muted-foreground)]">{sem.credits} credits</span>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {sem.courses.map((c) => (
                      <div key={c.code} className="flex items-start gap-3 px-4 py-2">
                        <span className="mt-0.5 w-20 shrink-0 text-[11px] font-mono text-[var(--muted-foreground)]">{c.code}</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-[13px] text-[var(--foreground)]">{c.title}</span>
                          <div className="mt-0.5 flex gap-2 text-[10px] text-[var(--muted-foreground)]">
                            <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5">{c.category}</span>
                            <span>{c.creditLabel}</span>
                            {c.hasSyllabus && <span className="text-green-600 dark:text-green-400">has syllabus</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Structure Tab ──────────────────────────────────────────────────────────

function StructureTab({
  structure,
  onReset,
}: {
  structure: AcademicStructure;
  onReset: () => Promise<void>;
}) {
  const hasContent =
    structure.departments.length > 0 || structure.orphanPrograms.length > 0;

  if (!hasContent) {
    return (
      <div className="rounded-lg border border-[var(--border)] p-8 text-center">
        <University className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]" />
        <p className="text-[13px] text-[var(--muted-foreground)]">
          No academic structure yet. Adopt a curriculum template from the Templates tab to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] transition-colors hover:border-red-300 hover:text-red-600 dark:hover:border-red-800 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" /> Reset structure
        </button>
      </div>
      {structure.departments.map((dept) => (
        <DepartmentTree key={dept.id} dept={dept} />
      ))}
      {structure.orphanPrograms.length > 0 && (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-4">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
            Unassigned programs
          </p>
          {structure.orphanPrograms.map((p) => (
            <ProgramRow key={p.id} program={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function DepartmentTree({ dept }: { dept: Department }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-lg border border-[var(--border)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="text-[13px] font-medium text-[var(--foreground)]">{dept.name}</span>
        <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
          {dept.kind}
        </span>
        <span className="ml-auto text-[11px] text-[var(--muted-foreground)]">
          {dept.programs.length} programs
        </span>
      </button>
      {open && (
        <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {dept.programs.map((p) => (
            <ProgramRow key={p.id} program={p} />
          ))}
          {dept.children.map((child) => (
            <div key={child.id} className="px-4 py-2">
              <DepartmentTree dept={child} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramRow({ program }: { program: Program }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-4 py-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-left"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <span className="text-[13px] text-[var(--foreground)]">{program.name}</span>
        <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
          {program.level}
        </span>
        {program.templateCode && (
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            template
          </span>
        )}
        <span className="ml-auto text-[11px] text-[var(--muted-foreground)]">
          {program.subjects.length} subjects
        </span>
      </button>
      {open && program.subjects.length > 0 && (
        <div className="mt-2 ml-6 space-y-1">
          {program.subjects.map((s) => (
            <SubjectRow key={s.id} subject={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubjectRow({ subject }: { subject: Subject }) {
  const [showSyllabus, setShowSyllabus] = useState(false);
  const hasSyllabus = subject.syllabus.objectives || subject.syllabus.theory || subject.syllabus.practical;
  return (
    <div className="rounded border border-[var(--border)] px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 font-mono text-[10px] text-[var(--muted-foreground)]">{subject.code}</span>
        <span className="text-[12px] text-[var(--foreground)]">{subject.name}</span>
        <span className="rounded bg-[var(--accent-soft)] px-1 py-0.5 text-[9px] text-[var(--muted-foreground)]">
          {subject.category}
        </span>
        {subject.semester !== null && (
          <span className="text-[10px] text-[var(--muted-foreground)]">Sem {subject.semester}</span>
        )}
        <span className="text-[10px] text-[var(--muted-foreground)]">{subject.creditTotal} cr</span>
        {hasSyllabus && (
          <button
            onClick={() => setShowSyllabus(!showSyllabus)}
            className="ml-auto text-[10px] text-[var(--accent)] hover:underline"
          >
            {showSyllabus ? "Hide" : "Syllabus"}
          </button>
        )}
      </div>
      {showSyllabus && hasSyllabus && (
        <div className="mt-2 space-y-1.5 text-[11px] text-[var(--muted-foreground)]">
          {subject.syllabus.objectives && (
            <div>
              <span className="font-medium text-[var(--foreground)]">Objectives: </span>
              {subject.syllabus.objectives}
            </div>
          )}
          {subject.syllabus.theory && (
            <div>
              <span className="font-medium text-[var(--foreground)]">Theory: </span>
              {subject.syllabus.theory}
            </div>
          )}
          {subject.syllabus.practical && (
            <div>
              <span className="font-medium text-[var(--foreground)]">Practical: </span>
              {subject.syllabus.practical}
            </div>
          )}
          {subject.syllabus.readings.length > 0 && (
            <div>
              <span className="font-medium text-[var(--foreground)]">Readings: </span>
              {subject.syllabus.readings.join("; ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--muted-foreground)]">
      {children}
    </span>
  );
}

function romanize(n: number): string {
  const romans = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return romans[n] ?? String(n);
}
