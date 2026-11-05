# Part E: Sprint 1 Software Test Specification (STS) and Definition of Done (DoD)

**Contract Version:** `v1.0`  
**Covered Sprint 1 Features:** `F-01`, `F-02`, `F-03`  
**Covered Acceptance Criteria:** `AC-01` through `AC-10`

---

## 1. Software Test Specification (STS)

Every Sprint 1 Acceptance Criterion (`AC-01`–`AC-10`) is mapped to executable automated tests across **Unit** (`server/tests/domain.unit.test.ts`), **API & Database Integration** (`server/tests/api.integration.test.ts`), **Client UI Component** (`client/src/App.test.tsx`), and **End-to-End Browser** (`e2e/sprint1.spec.ts`) levels.

| Test ID | Linked AC & Req | Test Level | Preconditions / Input | Action | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TEST-01** | `AC-01`<br>(`FR-01`, `NFR-03`, `NFR-05`) | API / DB Integration | Seeded users (`pawarit@mail.kmutt.ac.th`, `instructor@kmutt.ac.th`) exist in PostgreSQL. | `GET /api/health`, then `POST /api/auth/login` with valid credentials, followed by `GET /api/auth/me` with Bearer token. | Returns `200 OK`, signed JWT, and user object with matching `role` (`STUDENT`/`INSTRUCTOR`) and no `passwordHash` field. |
| **TEST-02** | `AC-02`<br>(`FR-01`, `NFR-03`) | API / DB Integration | Seeded user exists; attacker supplies wrong password or unknown email. | `POST /api/auth/login` with wrong password (`WrongPass!`) or missing fields. | Rejects with `401 Unauthorized` (`INVALID_CREDENTIALS`) or `400 Bad Request`; no token is issued. |
| **TEST-03** | `AC-03`<br>(`FR-01`, `NFR-01`) | API / DB Integration | Valid JWT obtained from login. | 1) Call `GET /api/teams` without token.<br>2) Call `POST /api/auth/logout` with token, then reuse that token on `GET /api/auth/me`. | Both requests are rejected with `401 Unauthorized`; logged-out JWT is revoked on the server. |
| **TEST-04** | `AC-04`<br>(`FR-02`, `FR-03`, `NFR-04`) | API / DB Integration | Unassigned student (`suda@mail.kmutt.ac.th`) and eligible student (`tatchakorn@mail.kmutt.ac.th`). | `POST /api/teams` to create `"Team Gamma"`, then `POST /api/teams/:id/members` to add `tatchakorn`, then `GET /api/teams`. | Team is persisted (`201 Created`) with creator as `LEADER`; second member added (`200 OK`); `GET /api/teams` returns 2-member roster. |
| **TEST-05** | `AC-05`<br>(`BR-01`) | Unit & API / DB Integration | Student `pawarit@mail.kmutt.ac.th` already belongs to `"Team Alpha"` in course `CPE334`. | Submit `POST /api/teams` to create a second team in `CPE334`, or add `pawarit` to `"Team Beta"` in `CPE334`. | Rejects with `409 Conflict` (`BR01_DUPLICATE_TEAM_MEMBERSHIP`); no duplicate membership row is stored. |
| **TEST-06** | `AC-06`<br>(`BR-02`) | Unit & API / DB Integration | Team in `CPE334` (`maxTeamSize = 3`) already has 3 active members. | Submit `POST /api/teams/:id/members` to add a 4th student to the full team. | Rejects with `409 Conflict` (`BR02_MAX_TEAM_SIZE_EXCEEDED`); team roster remains at 3 members. |
| **TEST-07** | `AC-07`<br>(`FR-03`, `FR-04`, `NFR-04`) | API / DB Integration | Authenticated member of `"Team Alpha"`. | `PUT /api/teams/:id/proposal` to save draft, then `POST /api/teams/:id/proposal/submit`, then `GET /api/teams/:id/proposal`. | Draft saved with status `DRAFT`; submission transitions status to `SUBMITTED` with `revisionCount = 1` and `submittedAt` timestamp. |
| **TEST-08** | `AC-08`<br>(`BR-03`, `BR-04`) | Unit & API / DB Integration | 1) Proposal with short title (`"AI"`) or short problem statement.<br>2) Proposal already in `SUBMITTED` state. | 1) Attempt `POST /api/teams/:id/proposal/submit` on incomplete draft.<br>2) Attempt `PUT` edit or second `POST .../submit` while `SUBMITTED`. | 1) Rejects with `400 Bad Request` (`BR04_INCOMPLETE_PROPOSAL`).<br>2) Rejects with `409 Conflict` (`BR03_INVALID_STATUS_TRANSITION`). |
| **TEST-09** | `AC-09`<br>(`FR-05`, `BR-03`, `BR-05`) | Unit & API / DB Integration | Proposal is `SUBMITTED`; authenticated `INSTRUCTOR` (`instructor@kmutt.ac.th`). | 1) Review with short feedback (`"ok"`).<br>2) Review with valid feedback (`REVISION_REQUESTED`), student revises & re-submits, then Instructor reviews (`APPROVED`). | 1) Short feedback rejected with `400 Bad Request` (`BR05_FEEDBACK_TOO_SHORT`).<br>2) Transitions `SUBMITTED` → `REVISION_REQUESTED` → `SUBMITTED` (`revisionCount = 2`) → `APPROVED` (`200 OK`). |
| **TEST-10** | `AC-10`<br>(`BR-06`, `NFR-02`) | API / DB Integration | Student A (`pawarit`, Team Alpha) and Team Beta's private proposal; Student A also attempts Instructor review endpoint. | 1) Student A calls `GET /api/teams/:betaId/proposal` and `PUT /api/teams/:betaId/proposal`.<br>2) Student A calls `POST /api/proposals/:id/review`. | Both are rejected with `403 Forbidden` without returning Team Beta's private proposal data or modifying state. |
| **TEST-11** | `AC-01`, `AC-04`, `AC-07`, `AC-09` | UI & E2E (Playwright) | Running client + server + seeded PostgreSQL database. | Execute full browser workflow: Student logs in → adds teammate → drafts & submits proposal → logs out → Instructor logs in → approves proposal → Student logs back in & verifies persisted `APPROVED` status. | Full end-to-end UI, API, and DB journey succeeds with persisted `APPROVED` badge and instructor feedback visible. |
| **TEST-12** | `AC-02`, `AC-05`, `AC-08`, `AC-10` | UI & E2E (Playwright) | Running client + server + seeded PostgreSQL database. | Verify UI & API rejection banners for invalid login, incomplete proposal submission, duplicate team membership, and role isolation between Student and Instructor views. | Expected error alerts are displayed clearly in the UI and enforced by the backend API. |

---

## 2. Product Definition of Done (DoD)

A Sprint 1 feature (`F-01`, `F-02`, `F-03`) and the Sprint 1 release increment are considered **Done** only when all of the following criteria are objectively verified with retained evidence:

1. **Contract-First Specification:** The feature's engineering contract (SDS, UI/API/DB design, `AC-*`, and `TEST-*` in `docs/sprints/sprint-1/`) is committed to Git prior to feature implementation.
2. **Complete Domain & Security Implementation:** All required UI views, Express API routes, Prisma schema constraints, `bcrypt`/JWT authentication, logout revocation, and backend `STUDENT`/`INSTRUCTOR` + team-ownership guards (`BR-01`–`BR-06`) are implemented without relying on hidden UI buttons for security.
3. **TDD & Automated Test Verification:**
   - Meaningful domain rule tests (`BR-01`–`BR-05`) have recorded TDD evidence showing the test failing before implementation/correction and passing afterward.
   - All planned Unit (`server/tests/domain.unit.test.ts`), API/Database Integration (`server/tests/api.integration.test.ts`), UI (`client/src/App.test.tsx`), and Playwright E2E (`e2e/sprint1.spec.ts`) tests pass (`0` failures, `0` skipped tests).
4. **Peer Review & Branch Integration:** Work is tracked via GitHub Issues, implemented on feature branches off `sprint-1-staging`, reviewed by the teammate via Pull Request (with specific review checks/comments recorded), and merged from `sprint-1-staging` into `main` with an immutable release tag (`v1.0.0-sprint1`).
5. **Reproducible Setup & Honest Disclosure:** `README.md` and `.env.example` allow clean local setup, migration, seeding, build, and test execution; any incomplete work or known limitations are explicitly disclosed; zero real secrets or production credentials are committed.
