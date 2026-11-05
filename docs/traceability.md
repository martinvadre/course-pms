# Part B: Requirements-to-Feature-to-Sprint Traceability Matrix

This document maps every baseline Functional Requirement (`FR`), Business Rule (`BR`), and Non-Functional Requirement (`NFR`) from `docs/srs.md` to its owning Feature (`docs/features.md`), target Sprint, and verification artifacts (`AC-*` and `TEST-*` for Sprint 1).

---

## 1. Full Requirements Traceability Table

| Requirement ID | Requirement Summary | Feature or System Responsibility | Planned Sprint | Verification (Sprint 1 AC & Test IDs / Later Sprint Allocation) |
| :--- | :--- | :--- | :---: | :--- |
| **FR-01** | User login, `/api/auth/me` identity, and logout | `F-01` Auth, Session & Role Access Control | **Sprint 1** | `AC-01`, `AC-02`, `AC-03` / `TEST-01`, `TEST-02`, `TEST-03`, `TEST-11` |
| **FR-02** | Create project team and add/join student members | `F-02` Course Project Team Formation | **Sprint 1** | `AC-04` / `TEST-04`, `TEST-11` |
| **FR-03** | Retrieve team details, roster, and proposal status | `F-02` Team Formation, `F-03` Proposal Workflow | **Sprint 1** | `AC-04`, `AC-07`, `AC-10` / `TEST-04`, `TEST-07`, `TEST-10`, `TEST-11` |
| **FR-04** | Draft, update, and submit team Project Proposal | `F-03` Proposal Drafting, Submission & Review | **Sprint 1** | `AC-07`, `AC-08` / `TEST-07`, `TEST-08`, `TEST-11` |
| **FR-05** | Instructor review (`APPROVED` / `REVISION_REQUESTED`) | `F-03` Proposal Drafting, Submission & Review | **Sprint 1** | `AC-09` / `TEST-09`, `TEST-11` |
| **FR-06** | Instructor creates and publishes course milestones | `F-04` Course Milestone Management | **Sprint 2** | Allocated to Sprint 2 contract (`F-04`) |
| **FR-07** | Team submits milestone deliverables | `F-05` Team Milestone Deliverable Submission | **Sprint 2** | Allocated to Sprint 2 contract (`F-05`) |
| **FR-08** | Instructor grades milestone deliverables (`0–100`) | `F-06` Instructor Deliverable Grading | **Sprint 2** | Allocated to Sprint 2 contract (`F-06`) |
| **FR-09** | Intra-team sprint task board (`TODO`/`IN_PROGRESS`/`DONE`) | `F-07` Intra-Team Task Board & Peer Eval | **Sprint 3** | Allocated to Sprint 3 contract (`F-07`) |
| **FR-10** | Student confidential peer contribution evaluation | `F-07` Intra-Team Task Board & Peer Eval | **Sprint 3** | Allocated to Sprint 3 contract (`F-07`) |
| **FR-11** | Instructor course progress & analytics dashboard | `F-08` Instructor Analytics & Grade Export | **Sprint 3** | Allocated to Sprint 3 contract (`F-08`) |
| **FR-12** | Instructor CSV gradebook & team summary export | `F-08` Instructor Analytics & Grade Export | **Sprint 3** | Allocated to Sprint 3 contract (`F-08`) |
| **BR-01** | Prevent student from joining/creating >1 team per course | `F-02` Course Project Team Formation | **Sprint 1** | `AC-05` / `TEST-05`, `TEST-12` |
| **BR-02** | Enforce course `maxTeamSize` capacity limit | `F-02` Course Project Team Formation | **Sprint 1** | `AC-06` / `TEST-06` |
| **BR-03** | Enforce valid Proposal state transition matrix | `F-03` Proposal Drafting, Submission & Review | **Sprint 1** | `AC-08`, `AC-09` / `TEST-08`, `TEST-09` |
| **BR-04** | Proposal completeness validation before `SUBMITTED` | `F-03` Proposal Drafting, Submission & Review | **Sprint 1** | `AC-08` / `TEST-08` |
| **BR-05** | Mandatory Instructor review feedback (≥ 10 chars) | `F-03` Proposal Drafting, Submission & Review | **Sprint 1** | `AC-09` / `TEST-09` |
| **BR-06** | Team ownership isolation & `INSTRUCTOR` role restriction | `F-01`, `F-02`, `F-03` (Cross-cutting RBAC) | **Sprint 1** | `AC-03`, `AC-10` / `TEST-03`, `TEST-10`, `TEST-12` |
| **BR-07** | Require `APPROVED` proposal before milestone submission | `F-05` Team Milestone Deliverable Submission | **Sprint 2** | Allocated to Sprint 2 contract (`F-05`) |
| **BR-08** | Grade bounds (`0–100`) and no self-peer-evaluation | `F-06` Grading, `F-07` Peer Evaluation | **Sprint 2 & 3** | Allocated to Sprint 2 (`F-06`) & Sprint 3 (`F-07`) |
| **NFR-01** | Reject unauthenticated requests (`401`) on protected APIs | `F-01` Auth & Cross-cutting API Middleware | **Sprint 1** | `AC-03` / `TEST-03` |
| **NFR-02** | Backend enforcement of role & team-ownership (`403`) | `F-01`, `F-02`, `F-03` Authorization Guards | **Sprint 1** | `AC-10` / `TEST-10`, `TEST-12` |
| **NFR-03** | Bcrypt password hashing & zero credential leakage | `F-01` Auth & User Serialization | **Sprint 1** | `AC-01`, `AC-02` / `TEST-01`, `TEST-02` |
| **NFR-04** | API response `< 300 ms` & PostgreSQL ACID persistence | `F-02`, `F-03` Persistence & API Layer | **Sprint 1** | `AC-04`, `AC-07`, `AC-09` / `TEST-04`, `TEST-07`, `TEST-09` |
| **NFR-05** | Container readiness, env config & `/api/health` (`200 OK`) | System Responsibility (`F-01` / Infrastructure) | **Sprint 1 & 2** | `AC-01` (`/api/health` verified in `TEST-01`; Cloud Run in Lab 5) |

---

## 2. Uncovered Requirements and Coverage Gaps

- **Sprint 1 Baseline Coverage:** **100% covered** (`FR-01`–`FR-05`, `BR-01`–`BR-06`, `NFR-01`–`NFR-05` all have active Sprint 1 features `F-01`–`F-03`, explicit Acceptance Criteria `AC-01`–`AC-10`, and automated tests `TEST-01`–`TEST-12`).
- **Deferred to Later Sprints (Planned & Scoped, Not Yet Implemented in Sprint 1):**
  - `FR-06`–`FR-08` and `BR-07` (Milestone definitions, deliverable submissions, and rubric grading) are intentionally allocated to **Sprint 2** (`F-04`–`F-06`).
  - `FR-09`–`FR-12` and `BR-08` (Intra-team task board, peer evaluations, course analytics, and CSV grade export) are intentionally allocated to **Sprint 3** (`F-07`–`F-08`).
- **Uncovered Requirements:** **None (0 uncovered requirements).** Every requirement in `docs/srs.md` is mapped to a concrete feature and sprint.

---

## 3. Approved Changes Log

| Change ID | Date | Affected IDs | Description of Change & Rationale | Approved By |
| :--- | :--- | :--- | :--- | :--- |
| **CHG-01** | 2026-11-05 | `BR-03`, `F-03` | Replaced terminal `REJECTED` state with `REVISION_REQUESTED` so teams whose proposals are rejected by an Instructor can revise and re-submit (`REVISION_REQUESTED` → `SUBMITTED`) without creating orphaned team records. | Pawarit & Tatchakorn |
| **CHG-02** | 2026-11-05 | `F-01`, `AD-02` | Added server-side token revocation tracking on `POST /api/auth/logout` in addition to client token removal, ensuring that reusing a logged-out JWT against protected backend endpoints is immediately rejected with `401 Unauthorized`. | Pawarit & Tatchakorn |
