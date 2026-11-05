# Part D: Three-Sprint Product Delivery Plan

This document defines the three-sprint delivery roadmap for **CoursePMS (Course Project Management System)** covering the entire baseline scope (`F-01` through `F-08`).

---

## 1. Three-Sprint Summary Table

| Sprint | Checkpoint & Due Date | Sprint Goal | Included Feature IDs | Dependencies | Required Completion Outcome |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **Sprint 1** | **Deliverable 1**<br>8 Nov 2026 | Establish the whole-product engineering baseline and deliver a working vertical slice covering real authentication, role/ownership authorization, team formation, and the project proposal submission & instructor review lifecycle. | `F-01`, `F-02`, `F-03` | None (Foundation) | Working release on `main` (`v1.0.0-sprint1`) with PostgreSQL persistence, `STUDENT`/`INSTRUCTOR` RBAC, enforced team capacity & proposal state transitions (`DRAFT` → `SUBMITTED` → `APPROVED`/`REVISION_REQUESTED`), automated Unit/API/UI/E2E tests, and reviewed PR integration. |
| **Sprint 2** | **Deliverable 2 & Lab 5**<br>29 Nov 2026 | Expand core domain capabilities to course milestone scheduling, team deliverable submissions, and instructor rubric grading, while deploying the containerized product via CI/CD to Google Cloud Run + Cloud SQL. | `F-04`, `F-05`, `F-06` | `F-01`, `F-02`, `F-03` | Working Sprint 2 release under engineering contracts enabling Instructors to publish milestones (`F-04`), approved teams to submit milestone deliverables (`F-05` enforcing `BR-07`), and Instructors to score/feedback submissions (`F-06`), deployed on GCP with automated CI quality gates. |
| **Sprint 3** | **Progress 29 Nov / Final 13 Dec 2026** | Complete remaining collaboration and reporting features—intra-team sprint task tracking, confidential peer evaluations, and instructor course analytics/CSV grade export—along with UAT and product hardening. | `F-07`, `F-08` | `F-02`, `F-03`, `F-05`, `F-06` | Final hardened product release covering all `FR-01`–`FR-12`, `BR-01`–`BR-08`, and `NFR-01`–`NFR-05`, full regression test suite, UAT verification, and final demonstration. |

---

## 2. Detailed Explanation of Sprint 1 Scope and Feasibility

### 2.1. Why Sprint 1 (`F-01`, `F-02`, `F-03`) Forms a Complete, Useful Vertical Slice
Sprint 1 delivers the foundational workflow that every subsequent course project activity depends on:
1. **`F-01` Authentication, Session & Role Access Control:** Establishes real `bcrypt` credential verification, JWT session issuance (`POST /api/auth/login`), current-user identity resolution (`GET /api/auth/me`), backend token revocation on logout (`POST /api/auth/logout`), and strict backend guards separating `STUDENT` and `INSTRUCTOR` permissions.
2. **`F-02` Course Project Team Formation & Roster Management:** Enables students to form a project team in an active course (`CPE334`) and add teammates while strictly enforcing **single active team membership per student per course (`BR-01`)** and **maximum team capacity (`BR-02`, max 3 members)**.
3. **`F-03` Project Proposal Drafting, Submission & Instructor Review:** Implements the core multi-actor state machine (`DRAFT` → `SUBMITTED` → `APPROVED` / `REVISION_REQUESTED`), enforcing content completeness before submission (`BR-04`), team ownership privacy so Team B cannot read or modify Team A's proposal (`BR-06`), and mandatory instructor review feedback (`BR-05`).

### 2.2. Team Workload Allocation for Sprint 1
- **Pawarit Wongdaeng (`67070503466`):** System-Level SDS & Data Model, `F-01` Auth/Session/RBAC middleware, `F-02` Team Formation & Capacity API + UI workspace, Unit/API tests (`TEST-01`–`TEST-06`), and PR reviews for `F-03`.
- **Tatchakorn Thamnimitr (`67070503415`):** SRS & Traceability matrix, `F-03` Proposal Lifecycle & Instructor Review API + Console UI, API/E2E tests (`TEST-07`–`TEST-12`), and PR reviews for `F-01`/`F-02`.
