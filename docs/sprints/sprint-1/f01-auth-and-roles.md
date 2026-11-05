# Part E: Sprint 1 Feature Contract — F-01 Authentication, Session & Role Access Control

**Contract Version:** `v1.0` (Prepared prior to Sprint 1 implementation)  
**Feature ID:** `F-01`  
**Linked Requirements:** `FR-01`, `BR-06`, `NFR-01`, `NFR-02`, `NFR-03`, `NFR-05`  
**Dependencies:** None (Foundation feature)

---

## 1. Behavior, Workflow, Business Rules, and Failure/Boundary Cases

### 1.1. Feature Workflow
1. An unauthenticated user opens CoursePMS and is presented with the **Login Screen**.
2. The user submits their university `email` and `password` to `POST /api/auth/login`.
3. The server looks up the user by normalized email, verifies the password against `User.passwordHash` via `bcrypt.compare`, and issues a signed JWT (`HS256`, `8h` expiry, unique `jti`) along with sanitized user profile metadata (`id`, `email`, `fullName`, `studentCode`, `role`).
4. On subsequent requests, the client includes `Authorization: Bearer <token>`. The `requireAuth` middleware validates the signature, checks that the token has not been revoked, and attaches `req.user`.
5. Calling `POST /api/auth/logout` revokes the token's `jti` on the backend and clears the client's session state. Any subsequent attempt to reuse the logged-out token returns `401 Unauthorized`.

### 1.2. Validation, Boundary, and Negative Cases
- **Missing Email or Password:** Rejected with `400 Bad Request` (`VALIDATION_ERROR`).
- **Unknown Email or Wrong Password:** Rejected with `401 Unauthorized` (`INVALID_CREDENTIALS`) using a generic message so account existence is not leaked.
- **Missing, Malformed, Expired, or Logged-Out Token:** Protected routes (`/api/auth/me`, `/api/teams/*`, `/api/proposals/*`) immediately reject with `401 Unauthorized` (`UNAUTHORIZED`).
- **Credential Hygiene (`NFR-03`):** `passwordHash` is stripped from all API responses.

---

## 2. Layer Specifications (UI, API, Data)

### 2.1. UI Specification
- **Login Screen:** Email input (`data-testid="login-email"`), Password input (`data-testid="login-password"`), Submit button (`data-testid="login-submit"`), quick demo account selector buttons for local testing, and error alert (`data-testid="auth-error"`).
- **Authenticated Header:** Displays `user.fullName`, role badge (`STUDENT` or `INSTRUCTOR`), and Logout button (`data-testid="logout-btn"`).

### 2.2. API Endpoints and Payload Shapes
- **`GET /api/health`** (Public)
  - **Response `200 OK`:** `{ "status": "ok", "service": "course-pms-api" }`
- **`POST /api/auth/login`** (Public)
  - **Request Body:** `{ "email": "pawarit@mail.kmutt.ac.th", "password": "Password123!" }`
  - **Success `200 OK`:**
    ```json
    {
      "token": "<jwt-string>",
      "user": {
        "id": 2,
        "email": "pawarit@mail.kmutt.ac.th",
        "fullName": "Pawarit Wongdaeng",
        "studentCode": "67070503466",
        "role": "STUDENT"
      }
    }
    ```
  - **Error `400` / `401`:** `{ "error": "Invalid email or password", "code": "INVALID_CREDENTIALS" }`
- **`GET /api/auth/me`** (Protected: `STUDENT` | `INSTRUCTOR`)
  - **Success `200 OK`:** `{ "user": { "id": 2, "email": "...", "fullName": "...", "studentCode": "...", "role": "STUDENT" } }`
  - **Error `401`:** `{ "error": "Authentication required", "code": "UNAUTHORIZED" }`
- **`POST /api/auth/logout`** (Protected: `STUDENT` | `INSTRUCTOR`)
  - **Success `200 OK`:** `{ "message": "Logged out successfully" }`

### 2.3. Data Fields & Constraints
- **`User` table:** `id` (PK), `email` (`String @unique`), `fullName` (`String`), `studentCode` (`String? @unique`), `passwordHash` (`String`), `role` (`Role` enum: `STUDENT`, `INSTRUCTOR`), `createdAt` (`DateTime`).

---

## 3. Acceptance Criteria for F-01

| AC ID | Linked Req | Acceptance Criterion (Observable Outcome) |
| :--- | :--- | :--- |
| **AC-01** | `FR-01`, `NFR-03`, `NFR-05` | **Valid Login & Current-User Identity:** Given a seeded `STUDENT` or `INSTRUCTOR` account, submitting valid credentials to `POST /api/auth/login` returns `200 OK` with a signed JWT and user profile (without `passwordHash`), and calling `GET /api/auth/me` with that token returns the matching user identity. `GET /api/health` returns `200 OK`. |
| **AC-02** | `FR-01`, `NFR-03` | **Invalid Login Rejection:** Submitting a wrong password, unknown email, or empty credentials to `POST /api/auth/login` is rejected with `401 Unauthorized` (or `400 Bad Request` when fields are missing) without issuing a token or leaking password hashes. |
| **AC-03** | `FR-01`, `BR-06`, `NFR-01` | **Unauthenticated Rejection & Enforced Logout:** Any request to a protected endpoint (`/api/auth/me`, `/api/teams`, `/api/proposals`) without a valid token is rejected with `401 Unauthorized`. After calling `POST /api/auth/logout`, reusing the same JWT on any protected endpoint is rejected with `401 Unauthorized`. |
