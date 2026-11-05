# Part A: Software Requirements Specification (SRS) and Product Scope

**Project Name:** CoursePMS — Course Project Management System  
**Course:** CPE 334 Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Team Members:**  
- **Pawarit Wongdaeng** (Student ID: `67070503466`, GitHub: `martinvadre`)  
- **Tatchakorn Thamnimitr** (Student ID: `67070503415`, GitHub: `Magiciancat9`)  

---

## 1. Stakeholder Problem and Context

### 1.1. Problem Statement
In university software engineering and capstone courses, managing student project teams, project proposals, milestone deliverables, and instructor evaluations through ad-hoc spreadsheets, chat messages, and email threads causes severe operational friction:
1. **Duplicate or Invalid Team Registrations:** Students accidentally join multiple teams within the same course or exceed the permitted team size limit without immediate validation.
2. **Opaque Proposal Review Lifecycle:** Project proposals lack a structured state transition workflow (`DRAFT` → `SUBMITTED` → `APPROVED` / `REVISION_REQUESTED`), leaving students uncertain whether their scope is approved and leaving instructors without an auditable trail of feedback.
3. **Fragmented Deliverable Tracking & Grading:** Milestone submissions, rubric-based feedback, and peer/member contribution records are scattered across platforms, risking unauthorized cross-team access to private submissions and feedback.

### 1.2. Chosen Domain Context
**CoursePMS (Course Project Management System)** is a full-stack web application designed for university courses where students collaborate in small teams to propose, plan, submit, and receive structured instructor feedback on multi-sprint course projects.

---

## 2. Actors and Responsibilities

| Actor | System Role | Primary Responsibilities |
| :--- | :--- | :--- |
| **Student** | `STUDENT` | Authenticate into the system; create a project team for an active course or join an existing team within size limits; draft, edit, and formally submit the team's Project Proposal; revise proposals when requested by an instructor; submit sprint milestone deliverables (Sprint 2); log tasks and peer evaluations (Sprint 3). May only view/modify their own team's private proposal drafts, feedback, and submissions. |
| **Instructor** | `INSTRUCTOR` | Authenticate into the system; manage course settings and team size limits; view all registered project teams and submitted proposals across the course; review `SUBMITTED` proposals and transition them to `APPROVED` or `REVISION_REQUESTED` with mandatory structured review feedback; define course milestones and evaluate team deliverables (Sprint 2); inspect course-wide analytics and export grades (Sprint 3). |

---

## 3. Product Scope and Explicit Exclusions

### 3.1. In-Scope Product Baseline (Sprints 1–3)
- **Sprint 1 (Core Vertical Slice — Authentication, Team Formation & Proposal Lifecycle):**
  - Session/JWT-based authentication (`login`, `logout`, `GET /api/auth/me`) and backend role-based access control (`STUDENT`, `INSTRUCTOR`).
  - Course team formation with strict capacity and single-membership enforcement per course.
  - Project Proposal drafting, submission, and Instructor review workflow (`DRAFT` → `SUBMITTED` → `APPROVED` / `REVISION_REQUESTED` → `SUBMITTED`) with ownership and state-transition validation.
- **Sprint 2 (Core Expansion — Milestone Deliverables & Instructor Grading):**
  - Course milestone definitions with deadlines, team deliverable artifact/link submissions, late-submission flagging, and instructor rubric grading/feedback.
- **Sprint 3 (Final Features & Hardening — Task Board, Peer Evaluation & Analytics):**
  - Intra-team sprint task tracking, confidential peer contribution evaluations, instructor course dashboard/analytics, and CSV grade export.

### 3.2. Explicit Exclusions (Out of Scope)
- **Public Self-Registration & Password Recovery:** Accounts are pre-provisioned/seeded by the university/course roster; OAuth/SSO and email password reset flows are excluded.
- **Built-in Source Code Hosting / Git Server:** Teams link external GitHub repository URLs rather than hosting Git repositories inside CoursePMS.
- **Real-Time Video/Chat Messaging:** Communication occurs via structured proposal/milestone review comments rather than live chat or video calls.
- **Multi-Institution Billing or Registrar Enrollment Sync:** CoursePMS operates at the course/department level without tuition or university SIS integration.

---

## 4. Functional Requirements (FR)

| ID | Requirement Title | Observable Behavior Description | Target Sprint |
| :--- | :--- | :--- | :---: |
| **FR-01** | User Authentication & Session Identity | A registered Student or Instructor can log in with email and password, retrieve their current authenticated profile and role (`/api/auth/me`), and log out to invalidate their session. | Sprint 1 |
| **FR-02** | Project Team Creation & Roster Joining | An authenticated Student can create a new project team in an active course (automatically becoming the team leader/member) or add/join eligible student members up to the course's maximum team size. | Sprint 1 |
| **FR-03** | Team & Roster Retrieval | An authenticated Student can view their own team details, member roster, and proposal status; an Instructor can list and filter all teams across the course. | Sprint 1 |
| **FR-04** | Project Proposal Drafting & Submission | A Student belonging to a team can create or update their team's Project Proposal (title, problem statement, tech stack, repository URL) while in `DRAFT` or `REVISION_REQUESTED` status, and formally transition it to `SUBMITTED`. | Sprint 1 |
| **FR-05** | Instructor Proposal Review & Decision | An authenticated Instructor can inspect any `SUBMITTED` proposal and record an authoritative review decision (`APPROVED` or `REVISION_REQUESTED`) with written feedback and timestamp. | Sprint 1 |
| **FR-06** | Course Milestone Management | An Instructor can create, update, and publish course milestones with title, description, weight, and due date. | Sprint 2 |
| **FR-07** | Team Milestone Deliverable Submission | A Student can submit or update a milestone deliverable (release tag, repo URL, report link, notes) for their team once the team's proposal is `APPROVED`. | Sprint 2 |
| **FR-08** | Instructor Deliverable Evaluation & Grading | An Instructor can grade a team's milestone submission with a numerical score (`0–100`) and written feedback, publishing the evaluation to the team. | Sprint 2 |
| **FR-09** | Team Internal Task & Contribution Log | Students within an approved team can create, assign, and update sprint tasks (`TODO`, `IN_PROGRESS`, `DONE`) to track member contributions. | Sprint 3 |
| **FR-10** | Peer Contribution Evaluation | A Student can submit a confidential peer evaluation rating teammates on collaboration and delivery for a completed milestone. | Sprint 3 |
| **FR-11** | Instructor Course Progress Dashboard | An Instructor can view aggregated course metrics (teams by proposal state, milestone submission rates, ungraded submissions, and flagged teams). | Sprint 3 |
| **FR-12** | Grade & Summary Report Export | An Instructor can export a structured CSV report of all teams, proposal statuses, and milestone scores for academic grading records. | Sprint 3 |

---

## 5. Business Rules (BR)

| ID | Rule Title | Domain Rule Definition | Target Sprint |
| :--- | :--- | :--- | :---: |
| **BR-01** | Single Active Team Membership per Course | A Student cannot create or join a second active project team in the same course if they are already a member of an existing team in that course (`409 Conflict`). | Sprint 1 |
| **BR-02** | Maximum Team Capacity Enforcement | A project team cannot exceed the course's configured `maxTeamSize` (default: 3 students; minimum: 1). Any attempt to add a member beyond `maxTeamSize` is rejected (`400 Bad Request` / `409 Conflict`). | Sprint 1 |
| **BR-03** | Proposal State Transition Matrix | A Project Proposal must follow valid state transitions: `DRAFT` → `SUBMITTED`; `SUBMITTED` → `APPROVED` or `REVISION_REQUESTED`; `REVISION_REQUESTED` → `SUBMITTED`. Students cannot edit or re-submit a proposal that is currently `SUBMITTED` or already `APPROVED` (`409 Conflict`). | Sprint 1 |
| **BR-04** | Proposal Content Completeness Gate | Submitting a proposal (`DRAFT`/`REVISION_REQUESTED` → `SUBMITTED`) requires a non-empty `title` (≥ 5 chars), `problemStatement` (≥ 20 chars), and `techStack` (≥ 3 chars). Incomplete submissions are rejected (`400 Bad Request`). | Sprint 1 |
| **BR-05** | Mandatory Instructor Review Feedback | When an Instructor transitions a `SUBMITTED` proposal to `APPROVED` or `REVISION_REQUESTED`, a review comment (`reviewFeedback`) of at least 10 characters is mandatory, and only proposals currently in `SUBMITTED` state may be reviewed (`400`/`409`). | Sprint 1 |
| **BR-06** | Team Ownership & Role Isolation | Only members of Team $X$ (or an `INSTRUCTOR`) may view or mutate Team $X$'s private proposal details and feedback; a Student from Team $Y$ attempting to view or modify Team $X$'s proposal is rejected (`403 Forbidden`). Only `INSTRUCTOR` users may execute proposal review endpoints (`403 Forbidden` for `STUDENT`). | Sprint 1 |
| **BR-07** | Approved Proposal Prerequisite for Deliverables | A team cannot submit a Sprint/Milestone Deliverable (`FR-07`) unless its Project Proposal is in `APPROVED` status (`409 Conflict`). | Sprint 2 |
| **BR-08** | Grade Bounds & Self-Peer-Review Prevention | Milestone scores must be within `0–100` inclusive (`FR-08`), and a Student cannot submit a peer evaluation rating for themselves (`FR-10`). | Sprint 3 |

---

## 6. Non-Functional Requirements (NFR)

| ID | Category | Measurable Target | Practical Verification Method | Target Sprint |
| :--- | :--- | :--- | :--- | :---: |
| **NFR-01** | Security — Authentication Enforcement | 100% of protected `/api/teams/*` and `/api/proposals/*` endpoints reject unauthenticated requests with HTTP `401 Unauthorized` in `< 50 ms` without leaking domain records. | Automated API integration test suite (`supertest`) sending unauthenticated and malformed-token requests to all protected routes. | Sprint 1 |
| **NFR-02** | Security — Role & Ownership Authorization | 100% of role-restricted (`INSTRUCTOR`-only review) and team-ownership-restricted routes reject unauthorized authenticated users with HTTP `403 Forbidden` enforced on the backend. | Automated API integration tests (`supertest`) and E2E tests verifying Student A cannot access Team B's private proposal or call the Instructor review endpoint. | Sprint 1 |
| **NFR-03** | Security — Credential & Secret Hygiene | 100% of stored user passwords use `bcrypt` salted hashes (cost factor ≥ 10); `GET /api/auth/me` and team responses never expose `passwordHash`; zero secrets are committed to Git. | Automated unit/API assertion inspecting response payloads for absence of `password`/`passwordHash` fields and verifying `.env.example` template separation. | Sprint 1 |
| **NFR-04** | Reliability & API Performance | Core CRUD and state-transition API endpoints (`/api/teams`, `/api/proposals`) respond within `< 300 ms` at p95 under local/staging integration test load with ACID database persistence. | Automated Vitest/Supertest API timing assertions and persistence round-trip verification against PostgreSQL. | Sprint 1 |
| **NFR-05** | Portability & Container Readiness | Application builds cleanly into a multi-stage Docker image and starts via environment variables (`PORT`, `DATABASE_URL`, `JWT_SECRET`) with health check `GET /api/health` returning `200 OK` within `10 s`. | Build and container smoke check (`npm run build`, `/api/health` test in Sprint 1; full Docker/Cloud Run deployment in Lab 5 / Sprint 2). | Sprint 1 (Design & Health) / Sprint 2 (Cloud Run) |

---

## 7. Assumptions, Design Decisions, Questions, and Resolutions

| ID | Type | Topic / Question | Resolution & Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **AD-01** | Assumption | Course Roster & User Provisioning | We assume users (`STUDENT` and `INSTRUCTOR`) and active courses (`CPE 334`) are pre-seeded via reproducible database seed scripts rather than open self-registration, matching the Deliverable 1 specification. |
| **AD-02** | Design Decision | Authentication Mechanism (JWT + Bearer / Session Storage) | We use signed JSON Web Tokens (`JWT`, `HS256` with `8h` expiry) issued on `POST /api/auth/login` and revoked/cleared on `POST /api/auth/logout` (with a server-side token revocation denylist + client token clearing) so logout is demonstrably enforced on both client and backend. |
| **AD-03** | Design Decision | Proposal-to-Team Relationship (`1:1` per Team) | Question: *Can a team have multiple active project proposals at once?* Resolution: Each `ProjectTeam` has at most one active `ProjectProposal` (`1:1` unique foreign key `teamId`), which evolves through `DRAFT` → `SUBMITTED` → `REVISION_REQUESTED` / `APPROVED` while preserving revision count and review history. |
| **AD-04** | Design Decision | Handling Rejected / Unsatisfactory Proposals | Question: *If an instructor rejects a proposal, is the team permanently locked out?* Resolution: The rejection state is modeled as `REVISION_REQUESTED`. This rejects the current submission while allowing team members to revise the proposal and re-submit (`REVISION_REQUESTED` → `SUBMITTED`), whereas `APPROVED` locks the proposal from further student edits. |
| **AD-05** | Design Decision | Database Engine & ORM | We use **PostgreSQL** with **Prisma ORM** across local development, automated testing, and planned GCP Cloud SQL deployment to ensure identical relational constraints (unique indexes on `(courseId, userId)` for team membership) in all environments. |
