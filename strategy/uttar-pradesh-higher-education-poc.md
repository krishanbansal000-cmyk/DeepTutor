# Uttar Pradesh Higher-Education DeepTutor POC

Status: implementation target
Initial target: Bundelkhand University (BU), Jhansi, and affiliated government/aided colleges
Pilot shape: one institution, one department, one semester, and one or two courses

## Objective

Build a locally deployable, syllabus-grounded, bilingual AI tutoring and formative-assessment
system for higher-education institutions in Uttar Pradesh. The POC should complement Samarth and
other university administration systems, but DeepTutor must not become the official system of
record during the first pilot.

The pilot must demonstrate:

- answers and tutoring grounded in institution-approved course material;
- Hindi-English/Hinglish explanations that preserve English technical notation;
- auditable formative assessments aligned with syllabus units and course outcomes;
- student-specific inspectable memory with teacher and student controls;
- institution-controlled deployment with predictable cost;
- explicit roster, course, and assessment interchange boundaries.

## Validated context and cautions

NEP 2020 identifies curriculum, engaging pedagogy, continuous formative assessment, and student
support as foundations of quality learning. It also supports criterion-based grading, continuous
evaluation, and local/Indian-language or bilingual higher education.

BU publishes programme syllabi and course outcomes on its official syllabus page. These approved
documents must be the primary knowledge source. BU also publishes Samarth examination-form
instructions, establishing that Samarth is operationally relevant. It does not prove that an external
tutor will receive an API or grade-write permission.

Use three integration gates:

1. signed CSV import/export for programmes, courses, sections, rosters, and approved results;
2. read-only API or scheduled export if BU/Samarth supplies documentation and credentials;
3. assessment write-back only after university approval of authority, reconciliation, and audit.

No generated score should enter an official academic record without teacher approval.

## Recommended language sequence

1. `hi`: Hindi UI and Hindi-English tutoring;
2. `en`: existing English baseline and technical terminology;
3. `ur`: Urdu UI/content after institution-supplied linguistic review;
4. Bundeli: experimental Devanagari instructional style, reviewed by BU language experts.

Hinglish should be an instructional response mode, not a UI locale. Code, identifiers, equations,
units, API names, and scientific nomenclature should retain their conventional English form unless a
verified course glossary says otherwise.

DeepTutor currently has complete frontend and prompt bundles only for English and Chinese. Several
backend paths normalize non-Chinese languages to English. Hindi therefore requires frontend locale
files, settings-schema changes, locale-aware prompt fallback, translated status/prompt bundles, and
tests protecting code, math, citations, and technical terms.

## First POC scope

In scope:

- one BCA, MCA, or B.Tech CSE department and one or two stable papers;
- 50–150 students and 3–8 faculty/staff users;
- English, Hindi, and Hinglish response modes;
- course-scoped RAG with citations and no-source refusal;
- teacher-curated rubrics and question banks;
- formative quizzes and assignment feedback;
- L1/L2/L3 memory with consent, correction, and deletion controls;
- local or institution-controlled deployment;
- CSV roster import and teacher-approved assessment export;
- an adapter interface for future Samarth connectivity.

Out of scope:

- autonomous summative grading or direct Samarth grade write-back;
- proctoring, discipline, or biometric identification;
- unrestricted web answers presented as syllabus truth;
- all-UP deployment before a measured pilot;
- production support for every regional language in phase one.

## Syllabus-grounding contract

Every course context must include university, programme, academic session, semester, paper code,
syllabus version, units, course outcomes, credits, approved sources, rubrics, and language policy.

The tutor must:

1. use the active course knowledge base for course claims;
2. cite source and page/section metadata;
3. distinguish primary syllabus material from supplementary reading;
4. refuse or label answers when approved evidence is absent;
5. keep web search disabled by default for syllabus questions;
6. require teacher review before sharing generated questions;
7. store syllabus/index version with each assessment attempt.

## Memory POC

Use DeepTutor's existing layers:

- L1: raw tutoring events, answers, tool calls, and code attempts;
- L2: per-surface misconceptions, strategies, and unresolved topics;
- L3: recent context, learner profile, scope, and preferences.

Add `institution_id`, `programme_id`, `course_id`, `section_id`, academic session, semester,
syllabus version, opaque student ID, consent version, retention class, source-event IDs, and teacher
review status.

Governance requirements:

- opt-in personalization;
- student view, correction, export, and deletion;
- teachers limited to assigned sections;
- no cross-student or cross-course leakage;
- configurable L1/L2/L3 retention;
- encryption, access logs, and administrative audit;
- no official grade based only on memory inference.

## Required integrations

1. Identity and roles: student, faculty, coordinator, administrator, section authorization, and
   account lifecycle.
2. Academic structure: canonical programme, semester, paper, section, faculty, and session IDs.
3. Content: approved syllabus, ordinances, notes, rubrics, reading lists, and question banks with
   version/approval metadata.
4. Assessment: quiz definition, attempts, rubric evidence, teacher override, approved score, and
   idempotent reconciliation keys.
5. Models: OpenAI-compatible chat model, a separate embedding model for RAG, optional reranker,
   and Hindi/English/Hinglish evaluation set.
6. Operations: TLS, backups, restore drills, logs, metrics, alerts, audit retention, and incident owner.

Request from BU/Samarth:

- API or scheduled-export documentation and a sandbox tenant;
- authentication method and credential owner;
- programme, course, roster, section, and assessment schemas;
- stable IDs, update semantics, rate limits, and IP restrictions;
- read/write field approvals, audit requirements, reconciliation, and rollback owners.

If no API is available, signed CSV workflows are sufficient for the first POC.

## Deployment baseline

```text
Campus users
    |
Reverse proxy / TLS
    |
DeepTutor Web + API
    |-- identity/session store
    |-- course RAG index and documents
    |-- learner memory
    |-- OpenAI-compatible LLM
    `-- embedding endpoint
```

The selected development chat model is DeepSeek V4 Flash through an OpenAI-compatible gateway.
The credential belongs only in the ignored runtime catalog or a deployment secret store. A separate
embedding model is still required to create a syllabus vector index.

## Acceptance criteria

- at least 95% of evaluated syllabus claims cite the correct approved source;
- unsupported course questions refuse or show uncertainty;
- isolation tests show no cross-student/course retrieval;
- Hindi/Hinglish preserves code, formulas, units, and citations;
- faculty accept at least 80% of sampled responses pedagogically;
- exports reconcile without duplicate attempts or silent overwrites;
- learner-memory conclusions are inspectable and correctable;
- backup, restore, deletion, latency, and concurrency tests pass;
- an academic owner approves the content and evaluation report.

## Institutional inputs needed

- pilot college, department, programme, semester, and paper codes;
- approved syllabus PDFs and course-outcome mapping;
- two faculty reviewers and one bilingual reviewer;
- anonymized sample roster and assessment template;
- rubric policy and definition of formative versus official marks;
- consent and retention requirements;
- expected concurrency and available server specification;
- Samarth technical contact and approved documentation;
- identity method and campus network restrictions;
- decision whether phase one is Hindi/Hinglish only or also Urdu.

## Sources

- NEP 2020: https://dsel.education.gov.in/sites/default/files/NEP_Final_English.pdf
- Ministry of Education higher-education NEP session: https://www.education.gov.in/nep/aqeg-he
- BU syllabus catalogue: https://bujhansi.ac.in/academics/syllabus/
- BU notices, including Samarth guidance: https://bujhansi.ac.in/
- Uttar Pradesh Rajbhasha Adhiniyam: https://www.indiacode.nic.in/handle/123456789/16230
- DeepTutor paper: https://arxiv.org/abs/2604.26962

## Architecture note

The paper describes the personalization substrate and earlier agentic design. Version 1.5.1 code is
the implementation source of truth: chat uses a single agentic loop, while research, question,
solve, visualization, and mastery are distinct capability pipelines. Do not present the older
InvestigateAgent/NoteAgent and Plan/Manager/Solve/Check diagram as the current runtime.
