# Part C: System-Level Software Design Specification (SDS)

---

## 1. Architecture and Technology Stack

### 1.1. Selected Stack and Component Responsibilities
**CoursePMS** uses a three-tier relational web architecture designed for clear separation of concerns, strict backend domain-rule enforcement, and single-container Cloud Run packaging:

| Layer | Technology Stack | Component Responsibilities & Business Rule Enforcement |
| :--- | :--- | :--- |
| **Presentation Layer (UI)** | **React 18**, **TypeScript**, **Vite 5**, **Bootstrap 5** | Renders role-aware navigation and screens (`Login`, `Student Team & Proposal Workspace`, `Instructor Course Review Console`); performs immediate client-side form hints; manages loading, empty, and error banners; stores the session JWT and attaches `Authorization: Bearer <token>`. **Never trusted as the sole authority for business rules or authorization.** |
| **API & Application Layer** | **Node.js 20**, **Express 4**, **TypeScript** | Exposes RESTful JSON endpoints under `/api/*`; enforces authentication (`requireAuth`), role guards (`requireRole`), and team ownership checks; executes all domain validation and state-transition rules (`BR-01`–`BR-08`) inside service/route handlers before persisting data. |
| **Data & Persistence Layer** | **PostgreSQL 16**, **Prisma ORM 5** | Enforces relational integrity, foreign keys, and uniqueness constraints (e.g., `@@unique([courseId, userId])` on `TeamMember` so the database itself guarantees `BR-01` single-team membership per course, and `teamId @unique` on `ProjectProposal`). |

### 1.2. System Architecture Diagram

```mermaid
flowchart LR
  subgraph Client["Browser Client (React 18 + Vite + Bootstrap 5)"]
    UI_Auth["Login / Session Context"]
    UI_Student["Student Workspace\n(My Team & Proposal Editor)"]
    UI_Instructor["Instructor Console\n(All Teams & Proposal Review)"]
  end

  subgraph Server["Application Server (Node.js + Express + TypeScript)"]
    MW_Auth["JWT Auth & Revocation Middleware\n(requireAuth / requireRole)"]
    API_Auth["/api/auth\n(login, logout, me)"]
    API_Teams["/api/teams\n(create, list, join/add member)"]
    API_Proposals["/api/proposals\n(draft, submit, review)"]
    Domain_Rules["Domain Rule Validator\n(BR-01..BR-06 State & Capacity Rules)"]
  end

  subgraph DB["Database Layer (PostgreSQL + Prisma ORM)"]
    PG[("PostgreSQL Database\nUsers, Courses, ProjectTeams,\nTeamMembers, ProjectProposals,\nMilestones, Submissions")]
  end

  UI_Auth -->|HTTPS JSON + Bearer JWT| API_Auth
  UI_Student -->|HTTPS JSON + Bearer JWT| MW_Auth
  UI_Instructor -->|HTTPS JSON + Bearer JWT| MW_Auth
  MW_Auth --> API_Teams
  MW_Auth --> API_Proposals
  API_Teams --> Domain_Rules
  API_Proposals --> Domain_Rules
  API_Auth --> PG
  Domain_Rules -->|Prisma Client ACID Queries| PG
```

---

## 2. Data Model, Constraints, Migrations, and Seed Data

### 2.1. Entity-Relationship Diagram (Whole-Product Baseline)

```mermaid
erDiagram
  USER {
    int id PK
    string email UK "Unique university email"
    string fullName
    string studentCode UK "Nullable for instructors"
    string passwordHash "bcrypt salted hash"
    enum role "STUDENT | INSTRUCTOR"
    datetime createdAt
  }
  COURSE {
    int id PK
    string code UK "e.g., CPE334"
    string name
    string term "e.g., 1/2026"
    int maxTeamSize "Default 3 (BR-02)"
  }
  PROJECT_TEAM {
    int id PK
    string name "Unique per course"
    int courseId FK
    int createdById FK
    datetime createdAt
  }
  TEAM_MEMBER {
    int id PK
    int teamId FK
    int userId FK
    int courseId FK "Composite UK (courseId, userId) enforces BR-01"
    string memberRole "LEADER | MEMBER"
    datetime joinedAt
  }
  PROJECT_PROPOSAL {
    int id PK
    int teamId FK "1:1 Unique FK"
    string title
    string problemStatement
    string techStack
    string repoUrl
    enum status "DRAFT | SUBMITTED | APPROVED | REVISION_REQUESTED"
    string reviewFeedback "Mandatory on review (BR-05)"
    int reviewedById FK "Nullable Instructor ID"
    datetime submittedAt
    datetime reviewedAt
    int revisionCount "Default 0"
    datetime updatedAt
  }
  MILESTONE {
    int id PK
    int courseId FK
    string title
    datetime dueDate
    int weightPercent
  }
  MILESTONE_SUBMISSION {
    int id PK
    int milestoneId FK
    int teamId FK
    string artifactUrl
    string releaseTag
    int score "0-100 (Sprint 2)"
    string feedback
  }

  COURSE ||--o{ PROJECT_TEAM : "hosts"
  USER ||--o{ PROJECT_TEAM : "creates"
  PROJECT_TEAM ||--|{ TEAM_MEMBER : "includes"
  USER ||--o{ TEAM_MEMBER : "joins"
  COURSE ||--o{ TEAM_MEMBER : "scopes uniqueness"
  PROJECT_TEAM ||--o| PROJECT_PROPOSAL : "owns 1:1"
  USER ||--o{ PROJECT_PROPOSAL : "reviews (INSTRUCTOR)"
  COURSE ||--o{ MILESTONE : "defines (Sprint 2)"
  MILESTONE ||--o{ MILESTONE_SUBMISSION : "collects (Sprint 2)"
  PROJECT_TEAM ||--o{ MILESTONE_SUBMISSION : "submits (Sprint 2)"
```

### 2.2. Key Relational Constraints and Ownership Links
- **`User.email` (`@unique`):** Prevents duplicate user accounts.
- **`ProjectTeam` (`@@unique([courseId, name])`):** Prevents two teams in the same course from using the same team name.
- **`TeamMember` (`@@unique([courseId, userId])`):** Enforces `BR-01` at both the application layer and PostgreSQL index level—a student can belong to at most one team per course.
- **`ProjectProposal.teamId` (`@unique`):** Enforces one authoritative proposal record per team (`1:1`), linking ownership directly to `ProjectTeam` and its `TeamMember` roster (`BR-06`).

### 2.3. Database Setup, Migrations, and Reproducible Seed Data
- **Schema Management:** Managed via `server/prisma/schema.prisma`. Schema changes are applied with `npm --prefix server run prisma:migrate` (`prisma db push` / `prisma migrate deploy`).
- **Reproducible Seed (`server/prisma/seed.ts`):** Executed via `npm --prefix server run prisma:seed`. It deterministically resets/upserts synthetic demo data using environment-configurable passwords (`DEMO_USER_PASSWORD`):
  - **Course:** `CPE334 — Software Engineering in the Age of AI Agents (Semester 1/2026)` with `maxTeamSize = 3`.
  - **Seeded Accounts:**
    - `instructor@kmutt.ac.th` (`INSTRUCTOR` — Dr. Piyanit)
    - `pawarit@mail.kmutt.ac.th` (`STUDENT` — ID `67070503466`, Team Alpha Leader)
    - `tatchakorn@mail.kmutt.ac.th` (`STUDENT` — ID `67070503415`, Available to join Team Alpha)
    - `somchai@mail.kmutt.ac.th` (`STUDENT` — ID `67070503499`, Team Beta Leader with a private proposal used to test cross-team `403` isolation)
    - `suda@mail.kmutt.ac.th` (`STUDENT` — ID `67070503488`, Unassigned student for testing team creation & capacity boundaries)

---

## 3. UI, API, and Access Control Conventions

### 3.1. Main Screens, Navigation, and Shared UI States
1. **Top Navigation Bar:** Displays application branding (`CoursePMS`), active course badge (`CPE334`), current authenticated user's full name, email, and role badge (`STUDENT` or `INSTRUCTOR`), and a **Logout** button.
2. **Screen 1 — Login View (Unauthenticated):** Email and password form, demo quick-fill buttons for local testing, client validation for empty fields, and clear error alert on `401 Invalid credentials`.
3. **Screen 2 — Student Workspace (`STUDENT` role):**
   - **My Project Team Panel:** If unassigned, shows "Create New Team" form and available teams to join. If assigned, shows team name, course capacity indicator (e.g., `2 / 3 members`), member roster, and an "Add Teammate by Email" control (disabled when full or if proposal is locked).
   - **Team Project Proposal Panel:** Displays current status badge (`DRAFT`, `SUBMITTED`, `APPROVED`, `REVISION_REQUESTED`), revision counter, and instructor review feedback banner (if reviewed). Provides the Proposal Editor (`title`, `problemStatement`, `techStack`, `repoUrl`) with **Save Draft** and **Submit Proposal for Review** actions.
4. **Screen 3 — Instructor Course Review Console (`INSTRUCTOR` role):**
   - Summary metrics bar (Total Teams, Submitted Pending Review, Approved, Revision Requested).
   - All Course Teams & Proposals table with status filter (`ALL`, `SUBMITTED`, `APPROVED`, `REVISION_REQUESTED`, `DRAFT`).
   - **Instructor Proposal Review Modal/Panel:** Displays full proposal details and provides the decision form (`APPROVED` or `REVISION_REQUESTED`) + mandatory `reviewFeedback` textarea (minimum 10 characters).
5. **Shared UI Behavior:**
   - **Loading State:** Spinner and disabled submit buttons during in-flight API requests.
   - **Empty State:** Informative placeholder card when a student has not yet joined a team or created a proposal.
   - **Error State:** Dismissible Bootstrap danger alert rendering the backend's structured `{ error, code }` message whenever a business rule (`400`/`403`/`409`) rejects an action.

### 3.2. API Conventions, Validation, and Safe Error Handling
- **Base Prefix & Content-Type:** All API routes are mounted under `/api/*` and exchange `application/json`.
- **Standard Success Envelope:** Returns HTTP `200 OK` or `201 Created` with deterministic JSON resource objects (`{ user, token }`, `{ team }`, `{ proposal }`, `{ teams }`).
- **Standard Error Envelope:** All validation, authorization, and business-rule failures return a uniform JSON shape without exposing stack traces or SQL internals:
  ```json
  {
    "error": "Student is already a member of a team in this course",
    "code": "BR01_DUPLICATE_TEAM_MEMBERSHIP"
  }
  ```
- **HTTP Status Code Mapping:**
  - `400 Bad Request`: Missing required fields, proposal completeness gate failure (`BR-04`), or review feedback too short (`BR-05`).
  - `401 Unauthorized`: Missing, expired, invalid, or logged-out/revoked JWT (`NFR-01`).
  - `403 Forbidden`: Authenticated user lacks the required role (`STUDENT` calling instructor review) or attempts to view/edit another team's private proposal (`BR-06`, `NFR-02`).
  - `404 Not Found`: Target team or proposal ID does not exist.
  - `409 Conflict`: Domain state violation (`BR-01` duplicate team membership, `BR-02` max team size exceeded, `BR-03` invalid proposal status transition).

### 3.3. Role and Ownership Permission Matrix

| Protected Operation | Endpoint | Unauthenticated | `STUDENT` (Own Team) | `STUDENT` (Other Team / Unassigned) | `INSTRUCTOR` |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Get current session user | `GET /api/auth/me` | `401` | **Allow (`200`)** | **Allow (`200`)** | **Allow (`200`)** |
| Revoke current token | `POST /api/auth/logout` | `401` | **Allow (`200`)** | **Allow (`200`)** | **Allow (`200`)** |
| Create a new project team | `POST /api/teams` | `401` | `409` (`BR-01`) | **Allow (`201`)** | `403` (Students only) |
| Add/join member to team | `POST /api/teams/:id/members` | `401` | **Allow (`200`)** (up to `maxTeamSize`) | `403` (Only team members may add roster) | `403` |
| List course teams summary | `GET /api/teams` | `401` | **Allow (`200`)** (Own team full + public roster) | **Allow (`200`)** (Public roster only) | **Allow (`200`)** (All teams & proposals) |
| View team proposal detail | `GET /api/teams/:id/proposal` | `401` | **Allow (`200`)** | **`403 Forbidden` (`BR-06`)** | **Allow (`200`)** |
| Save/edit proposal draft | `PUT /api/teams/:id/proposal` | `401` | **Allow (`200`)** (if `DRAFT` or `REVISION_REQUESTED`) | **`403 Forbidden` (`BR-06`)** | `403` (Students draft) |
| Submit proposal for review | `POST /api/teams/:id/proposal/submit` | `401` | **Allow (`200`)** (if `DRAFT`/`REVISION_REQUESTED` & complete) | **`403 Forbidden` (`BR-06`)** | `403` |
| Review & approve/reject proposal | `POST /api/proposals/:id/review` | `401` | **`403 Forbidden` (`BR-06`)** | **`403 Forbidden` (`BR-06`)** | **Allow (`200`)** (if `SUBMITTED`) |

### 3.4. Credential Handling, Session/Token Lifecycle, and Logout Design
- **Password Hashing:** User passwords are hashed with `bcryptjs` (`10` salt rounds) before storage in `User.passwordHash`. Plaintext passwords are never logged or persisted (`NFR-03`).
- **Token Issuance & Expiry:** `POST /api/auth/login` verifies credentials via `bcrypt.compare`. On success, the server signs a JWT (`HS256`) containing `{ userId, email, role, jti }` with an `8h` expiration (`exp`) using `process.env.JWT_SECRET`.
- **Current-User Retrieval:** `GET /api/auth/me` validates the `Authorization: Bearer <token>` header, checks that `jti` is not in the server's revoked token store, and queries PostgreSQL for the fresh user profile (excluding `passwordHash`).
- **Enforced Logout:** `POST /api/auth/logout` adds the token's unique `jti` (and raw token signature) to the backend revocation store (`revokedTokens`) and clears the client's stored token. Any subsequent API request reusing that logged-out token is rejected by `requireAuth` with `401 Unauthorized`.

---

## 4. Configuration and Cloud Delivery Design

### 4.1. Environment Variables and Secret Handling
All runtime configuration is injected via environment variables. Real secrets are excluded from Git via `.gitignore`, while `.env.example` documents required keys:

| Variable | Purpose | Example / Default (Local Dev) | Production (GCP Cloud Run) |
| :--- | :--- | :--- | :--- |
| `PORT` | HTTP server listen port | `3000` | Injected by Cloud Run (`8080`) |
| `NODE_ENV` | Runtime mode | `development` / `test` | `production` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://postgres:postgres@localhost:5432/course_pms?schema=public` | GCP Secret Manager (Cloud SQL socket) |
| `JWT_SECRET` | HMAC secret for signing JWTs | `dev-only-jwt-secret-change-me` | GCP Secret Manager |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` | Same-origin Cloud Run URL |
| `DEMO_USER_PASSWORD` | Password used by `prisma/seed.ts` | `Password123!` | Set via private course handoff / env |

### 4.2. Planned Docker Packaging and GCP Deployment Architecture (Lab 5 Ready)
- **Single-Container Multi-Stage `Dockerfile`:** Stage 1 builds the React/Vite frontend (`client/dist`); Stage 2 compiles the TypeScript Express backend (`server/dist`) and Prisma client; Stage 3 runs a lean Node 20 Alpine production image where Express serves both `/api/*` and the static `client/dist` bundle, plus `GET /api/health`.
- **Planned GCP Components (for Lab 5 Deployment):**
  - **Google Artifact Registry:** Stores versioned container images built by GitHub Actions CI/CD.
  - **Google Cloud Run:** Serverless container runtime hosting the stateless CoursePMS container.
  - **Google Cloud SQL for PostgreSQL:** Managed durable relational database connected via Cloud SQL Auth Proxy Unix socket.
  - **Google Secret Manager:** Injects `DATABASE_URL` and `JWT_SECRET` at container startup without baking secrets into images or Git.
