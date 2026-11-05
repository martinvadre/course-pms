import React, { useState, useEffect } from 'react';

export interface User {
  id: number;
  email: string;
  fullName: string;
  studentCode: string | null;
  role: 'STUDENT' | 'INSTRUCTOR';
}

export interface Course {
  id: number;
  code: string;
  name: string;
  term: string;
  maxTeamSize: number;
}

export interface TeamMember {
  id: number;
  userId: number;
  memberRole: string;
  user: User;
}

export interface Proposal {
  id: number;
  teamId: number;
  title: string;
  problemStatement?: string;
  techStack?: string;
  repoUrl?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REVISION_REQUESTED';
  reviewFeedback?: string | null;
  reviewedBy?: User | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  revisionCount: number;
  updatedAt: string;
}

export interface ProjectTeam {
  id: number;
  name: string;
  courseId: number;
  course: Course;
  members: TeamMember[];
  proposal: Proposal | null;
}

const API_BASE = '';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('course_pms_token'));
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<ProjectTeam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<{ error: string; code?: string } | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Student Team creation & member addition state
  const [newTeamName, setNewTeamName] = useState('');
  const [addMemberEmail, setAddMemberEmail] = useState('');

  // Student Proposal editor state
  const [propTitle, setPropTitle] = useState('');
  const [propProblem, setPropProblem] = useState('');
  const [propStack, setPropStack] = useState('');
  const [propRepo, setPropRepo] = useState('');

  // Instructor Review state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [reviewFeedbackInput, setReviewFeedbackInput] = useState('');

  async function apiFetch(path: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, ok: response.ok, data };
  }

  async function loadDashboardData(activeToken: string) {
    setLoading(true);
    try {
      const meRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (!meRes.ok) {
        setToken(null);
        setUser(null);
        localStorage.removeItem('course_pms_token');
        setLoading(false);
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      const [coursesRes, teamsRes] = await Promise.all([
        fetch(`${API_BASE}/api/courses`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        }),
        fetch(`${API_BASE}/api/teams`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        }),
      ]);

      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        setCourses(cData.courses || []);
      }
      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        const loadedTeams: ProjectTeam[] = tData.teams || [];
        setTeams(loadedTeams);

        if (meData.user.role === 'STUDENT') {
          const myTeam = loadedTeams.find((t) =>
            t.members.some((m) => m.userId === meData.user.id)
          );
          if (myTeam?.proposal) {
            setPropTitle(myTeam.proposal.title || '');
            setPropProblem(myTeam.proposal.problemStatement || '');
            setPropStack(myTeam.proposal.techStack || '');
            setPropRepo(myTeam.proposal.repoUrl || '');
          }
        } else if (loadedTeams.length > 0 && selectedTeamId === null) {
          setSelectedTeamId(loadedTeams[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadDashboardData(token);
    }
  }, [token]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorBanner({
        error: 'Email and password are required.',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const { ok, data } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });

    if (!ok) {
      setErrorBanner({ error: data.error || 'Login failed', code: data.code });
      return;
    }

    localStorage.setItem('course_pms_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setSuccessBanner(`Authenticated as ${data.user.fullName} (${data.user.role})`);
  }

  async function handleLogout() {
    setErrorBanner(null);
    setSuccessBanner(null);
    if (token) {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    }
    localStorage.removeItem('course_pms_token');
    setToken(null);
    setUser(null);
    setTeams([]);
    setSuccessBanner('Logged out successfully. Session token revoked.');
  }

  const myTeam = user
    ? teams.find((t) => t.members.some((m) => m.userId === user.id))
    : undefined;

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);
    const courseId = courses[0]?.id || 1;
    const { ok, data } = await apiFetch('/api/teams', {
      method: 'POST',
      body: JSON.stringify({ name: newTeamName, courseId }),
    });
    if (!ok) {
      setErrorBanner({ error: data.error, code: data.code });
      return;
    }
    setNewTeamName('');
    setSuccessBanner(`Created project team "${data.team.name}" successfully.`);
    if (token) await loadDashboardData(token);
  }

  async function handleAddMember(e: React.FormEvent, targetTeamId?: number) {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);
    const tId = targetTeamId || myTeam?.id;
    if (!tId) return;

    const { ok, data } = await apiFetch(`/api/teams/${tId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email: addMemberEmail }),
    });
    if (!ok) {
      setErrorBanner({ error: data.error, code: data.code });
      return;
    }
    setAddMemberEmail('');
    setSuccessBanner(
      `Added member to ${data.team.name} (${data.team.members.length}/${data.team.course.maxTeamSize} members).`
    );
    if (token) await loadDashboardData(token);
  }

  async function handleSaveDraft() {
    if (!myTeam) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    const { ok, data } = await apiFetch(`/api/teams/${myTeam.id}/proposal`, {
      method: 'PUT',
      body: JSON.stringify({
        title: propTitle,
        problemStatement: propProblem,
        techStack: propStack,
        repoUrl: propRepo,
      }),
    });
    if (!ok) {
      setErrorBanner({ error: data.error, code: data.code });
      return;
    }
    setSuccessBanner('Proposal draft saved to PostgreSQL.');
    if (token) await loadDashboardData(token);
  }

  async function handleSubmitProposal() {
    if (!myTeam) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    const { ok, data } = await apiFetch(`/api/teams/${myTeam.id}/proposal/submit`, {
      method: 'POST',
      body: JSON.stringify({
        title: propTitle,
        problemStatement: propProblem,
        techStack: propStack,
        repoUrl: propRepo,
      }),
    });
    if (!ok) {
      setErrorBanner({ error: data.error, code: data.code });
      return;
    }
    setSuccessBanner(
      `Proposal submitted for Instructor review (Status: ${data.proposal.status}, Revision #${data.proposal.revisionCount}).`
    );
    if (token) await loadDashboardData(token);
  }

  async function handleInspectTeamProposal(targetTeamId: number) {
    setErrorBanner(null);
    setSuccessBanner(null);
    const { ok, data } = await apiFetch(`/api/teams/${targetTeamId}/proposal`);
    if (!ok) {
      setErrorBanner({ error: data.error, code: data.code });
      return;
    }
    setSuccessBanner(`Loaded proposal for Team #${targetTeamId}: "${data.proposal?.title}"`);
  }

  async function handleInstructorDecision(
    proposalId: number,
    decision: 'APPROVED' | 'REVISION_REQUESTED'
  ) {
    setErrorBanner(null);
    setSuccessBanner(null);
    const { ok, data } = await apiFetch(`/api/proposals/${proposalId}/review`, {
      method: 'POST',
      body: JSON.stringify({
        decision,
        reviewFeedback: reviewFeedbackInput,
      }),
    });
    if (!ok) {
      setErrorBanner({ error: data.error, code: data.code });
      return;
    }
    setReviewFeedbackInput('');
    setSuccessBanner(
      `Proposal #${proposalId} transitioned to ${data.proposal.status} with recorded feedback.`
    );
    if (token) await loadDashboardData(token);
  }

  function statusBadgeClass(status?: string) {
    switch (status) {
      case 'APPROVED':
        return 'bg-success';
      case 'SUBMITTED':
        return 'bg-primary';
      case 'REVISION_REQUESTED':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary';
    }
  }

  // ==========================================================================
  // Unauthenticated View: Login Screen
  // ==========================================================================
  if (!user) {
    return (
      <div className="min-vh-100 d-flex flex-column bg-light">
        <nav className="navbar navbar-dark bg-dark px-4 py-3 shadow-sm">
          <span className="navbar-brand fw-bold mb-0 h1">
            CoursePMS <span className="badge bg-info text-dark ms-2">CPE 334 Sprint 1</span>
          </span>
          <span className="text-light small">Course Project Management System</span>
        </nav>

        <div className="container my-5" style={{ maxWidth: 540 }}>
          {errorBanner && (
            <div className="alert alert-danger shadow-sm" data-testid="auth-error" role="alert">
              <div className="fw-bold">Request Rejected {errorBanner.code ? `(${errorBanner.code})` : ''}</div>
              <div>{errorBanner.error}</div>
            </div>
          )}
          {successBanner && (
            <div className="alert alert-success shadow-sm" data-testid="auth-success" role="alert">
              {successBanner}
            </div>
          )}

          <div className="card shadow-sm border-0">
            <div className="card-header bg-primary text-white py-3">
              <h4 className="mb-0 fw-bold">Sign In to CoursePMS</h4>
              <small>Authenticate with your university account (STUDENT or INSTRUCTOR)</small>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="login-email">
                    University Email
                  </label>
                  <input
                    id="login-email"
                    data-testid="login-email"
                    type="email"
                    className="form-control"
                    placeholder="e.g., pawarit@mail.kmutt.ac.th"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="login-password">
                    Password
                  </label>
                  <input
                    id="login-password"
                    data-testid="login-password"
                    type="password"
                    className="form-control"
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  data-testid="login-submit"
                  className="btn btn-primary w-100 fw-semibold py-2"
                >
                  Sign In
                </button>
              </form>

              <hr className="my-4" />
              <div className="small text-muted mb-2 fw-semibold">
                Seeded Local Test Accounts (Quick Fill):
              </div>
              <div className="d-grid gap-2">
                <button
                  type="button"
                  data-testid="quickfill-pawarit"
                  className="btn btn-outline-secondary btn-sm text-start"
                  onClick={() => {
                    setLoginEmail('pawarit@mail.kmutt.ac.th');
                    setLoginPassword('Password123!');
                  }}
                >
                  <strong>Student (Team Alpha Leader):</strong> pawarit@mail.kmutt.ac.th
                </button>
                <button
                  type="button"
                  data-testid="quickfill-suda"
                  className="btn btn-outline-secondary btn-sm text-start"
                  onClick={() => {
                    setLoginEmail('suda@mail.kmutt.ac.th');
                    setLoginPassword('Password123!');
                  }}
                >
                  <strong>Student (Unassigned):</strong> suda@mail.kmutt.ac.th
                </button>
                <button
                  type="button"
                  data-testid="quickfill-instructor"
                  className="btn btn-outline-dark btn-sm text-start"
                  onClick={() => {
                    setLoginEmail('instructor@kmutt.ac.th');
                    setLoginPassword('Password123!');
                  }}
                >
                  <strong>Instructor (Course Reviewer):</strong> instructor@kmutt.ac.th
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // Authenticated View: Top Navbar + Role Workspace
  // ==========================================================================
  const filteredTeams =
    statusFilter === 'ALL'
      ? teams
      : teams.filter((t) => (t.proposal?.status || 'DRAFT') === statusFilter);

  const selectedInstructorTeam =
    teams.find((t) => t.id === selectedTeamId) || filteredTeams[0] || null;

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-4 py-3 shadow-sm">
        <div className="container-fluid">
          <span className="navbar-brand fw-bold">
            CoursePMS{' '}
            <span className="badge bg-info text-dark ms-2">
              {courses[0]?.code || 'CPE334'} ({courses[0]?.term || '1/2026'})
            </span>
          </span>
          <div className="d-flex align-items-center gap-3">
            <div className="text-light text-end" data-testid="current-user-info">
              <div className="fw-semibold">
                {user.fullName}{' '}
                {user.studentCode ? <span className="text-info">({user.studentCode})</span> : null}
              </div>
              <div className="small text-secondary">{user.email}</div>
            </div>
            <span
              data-testid="current-user-role"
              className={`badge ${
                user.role === 'INSTRUCTOR' ? 'bg-warning text-dark' : 'bg-success'
              } fs-6`}
            >
              {user.role}
            </span>
            <button
              type="button"
              data-testid="logout-btn"
              className="btn btn-outline-light btn-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container py-4">
        {loading && (
          <div className="alert alert-info py-2">Loading latest course data from PostgreSQL...</div>
        )}
        {errorBanner && (
          <div className="alert alert-danger shadow-sm" data-testid="error-banner" role="alert">
            <div className="fw-bold">
              Operation Rejected {errorBanner.code ? `[${errorBanner.code}]` : ''}
            </div>
            <div>{errorBanner.error}</div>
          </div>
        )}
        {successBanner && (
          <div className="alert alert-success shadow-sm" data-testid="success-banner" role="alert">
            {successBanner}
          </div>
        )}

        {/* ================================================================== */}
        {/* STUDENT WORKSPACE (F-02 Team Formation & F-03 Proposal Workflow)   */}
        {/* ================================================================== */}
        {user.role === 'STUDENT' && (
          <div className="row g-4">
            <div className="col-lg-5">
              {/* My Team Card */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">F-02: My Project Team</h5>
                  {myTeam && (
                    <span className="badge bg-dark" data-testid="team-capacity-badge">
                      {myTeam.members.length} / {myTeam.course.maxTeamSize} Members
                    </span>
                  )}
                </div>
                <div className="card-body">
                  {myTeam ? (
                    <>
                      <h5 className="fw-bold text-primary mb-1" data-testid="my-team-name">
                        {myTeam.name}
                      </h5>
                      <p className="text-muted small mb-3">
                        Course: {myTeam.course.code} — Max Team Size: {myTeam.course.maxTeamSize}{' '}
                        (BR-02)
                      </p>

                      <h6 className="fw-semibold">Team Roster:</h6>
                      <ul className="list-group mb-3" data-testid="team-roster-list">
                        {myTeam.members.map((m) => (
                          <li
                            key={m.id}
                            className="list-group-item d-flex justify-content-between align-items-center"
                          >
                            <div>
                              <div className="fw-semibold">{m.user.fullName}</div>
                              <div className="small text-muted">
                                {m.user.email}{' '}
                                {m.user.studentCode ? `• ID: ${m.user.studentCode}` : ''}
                              </div>
                            </div>
                            <span className="badge bg-secondary">{m.memberRole}</span>
                          </li>
                        ))}
                      </ul>

                      <form onSubmit={(e) => handleAddMember(e, myTeam.id)}>
                        <label className="form-label small fw-semibold">
                          Add Teammate by University Email (Enforces BR-01 & BR-02)
                        </label>
                        <div className="input-group">
                          <input
                            type="email"
                            data-testid="add-member-email"
                            className="form-control form-control-sm"
                            placeholder="e.g., tatchakorn@mail.kmutt.ac.th"
                            value={addMemberEmail}
                            onChange={(e) => setAddMemberEmail(e.target.value)}
                          />
                          <button
                            type="submit"
                            data-testid="add-member-btn"
                            className="btn btn-outline-primary btn-sm fw-semibold"
                          >
                            Add Member
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="text-muted">
                      <p className="small mb-2">
                        You are not currently assigned to a team in{' '}
                        <strong>{courses[0]?.code || 'CPE334'}</strong>. Create a new project team
                        below.
                      </p>
                    </div>
                  )}

                  <hr className="my-3" />
                  <form onSubmit={handleCreateTeam}>
                    <label className="form-label small fw-semibold">
                      Create New Project Team in {courses[0]?.code || 'CPE334'} (Enforces BR-01)
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        data-testid="create-team-name"
                        className="form-control form-control-sm"
                        placeholder="New team name (e.g., Team Gamma)"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                      />
                      <button
                        type="submit"
                        data-testid="create-team-btn"
                        className="btn btn-dark btn-sm"
                      >
                        Create Team
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Course Teams Directory & Cross-Team Isolation Test Card */}
              <div className="card shadow-sm border-0">
                <div className="card-header bg-white py-3">
                  <h6 className="mb-0 fw-bold">Course Teams Directory & Access Check (BR-06)</h6>
                </div>
                <div className="card-body p-0">
                  <table className="table table-sm table-hover mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">Team</th>
                        <th>Members</th>
                        <th>Status</th>
                        <th className="pe-3 text-end">Access Check</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((t) => (
                        <tr key={t.id}>
                          <td className="ps-3 fw-semibold">{t.name}</td>
                          <td>
                            {t.members.length}/{t.course.maxTeamSize}
                          </td>
                          <td>
                            <span className={`badge ${statusBadgeClass(t.proposal?.status)}`}>
                              {t.proposal?.status || 'NO_DRAFT'}
                            </span>
                          </td>
                          <td className="pe-3 text-end">
                            <button
                              type="button"
                              data-testid={`inspect-proposal-${t.id}`}
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => handleInspectTeamProposal(t.id)}
                            >
                              View Proposal API
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: F-03 Project Proposal Editor */}
            <div className="col-lg-7">
              <div className="card shadow-sm border-0">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0 fw-bold">F-03: Team Project Proposal & Review Lifecycle</h5>
                    <small className="text-muted">
                      State transitions: DRAFT → SUBMITTED → APPROVED / REVISION_REQUESTED
                    </small>
                  </div>
                  {myTeam?.proposal && (
                    <div className="text-end">
                      <span
                        data-testid="proposal-status"
                        className={`badge ${statusBadgeClass(myTeam.proposal.status)} fs-6`}
                      >
                        {myTeam.proposal.status}
                      </span>
                      <div className="small text-muted mt-1" data-testid="proposal-revision">
                        Revision #{myTeam.proposal.revisionCount}
                      </div>
                    </div>
                  )}
                </div>

                <div className="card-body">
                  {!myTeam ? (
                    <div className="alert alert-secondary mb-0">
                      Create or join a project team first to draft and submit a Project Proposal.
                    </div>
                  ) : (
                    <>
                      {myTeam.proposal?.reviewFeedback && (
                        <div
                          className={`alert ${
                            myTeam.proposal.status === 'APPROVED'
                              ? 'alert-success'
                              : 'alert-warning'
                          }`}
                          data-testid="review-feedback-box"
                        >
                          <div className="fw-bold">
                            Instructor Review Decision: {myTeam.proposal.status}
                            {myTeam.proposal.reviewedBy
                              ? ` (by ${myTeam.proposal.reviewedBy.fullName})`
                              : ''}
                          </div>
                          <div className="mt-1">{myTeam.proposal.reviewFeedback}</div>
                        </div>
                      )}

                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Project Title <span className="text-danger">* (min 5 chars, BR-04)</span>
                        </label>
                        <input
                          type="text"
                          data-testid="proposal-title"
                          className="form-control"
                          value={propTitle}
                          onChange={(e) => setPropTitle(e.target.value)}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Problem Statement & Scope{' '}
                          <span className="text-danger">* (min 20 chars, BR-04)</span>
                        </label>
                        <textarea
                          rows={4}
                          data-testid="proposal-problem"
                          className="form-control"
                          value={propProblem}
                          onChange={(e) => setPropProblem(e.target.value)}
                        />
                      </div>

                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">
                            Selected Tech Stack <span className="text-danger">* (BR-04)</span>
                          </label>
                          <input
                            type="text"
                            data-testid="proposal-stack"
                            className="form-control"
                            value={propStack}
                            onChange={(e) => setPropStack(e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">GitHub Repository URL</label>
                          <input
                            type="text"
                            data-testid="proposal-repo"
                            className="form-control"
                            value={propRepo}
                            onChange={(e) => setPropRepo(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          data-testid="save-draft-btn"
                          className="btn btn-outline-secondary fw-semibold"
                          onClick={handleSaveDraft}
                        >
                          Save Draft (PUT)
                        </button>
                        <button
                          type="button"
                          data-testid="submit-proposal-btn"
                          className="btn btn-primary fw-semibold"
                          onClick={handleSubmitProposal}
                        >
                          Submit Proposal for Review (POST)
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* INSTRUCTOR REVIEW CONSOLE (F-03 Proposal Review & Course Roster)   */}
        {/* ================================================================== */}
        {user.role === 'INSTRUCTOR' && (
          <div>
            {/* Summary Metrics */}
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="card border-0 shadow-sm text-center p-3">
                  <div className="text-muted small fw-semibold">Total Registered Teams</div>
                  <div className="fs-3 fw-bold">{teams.length}</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm text-center p-3">
                  <div className="text-primary small fw-semibold">Submitted (Pending Review)</div>
                  <div className="fs-3 fw-bold text-primary">
                    {teams.filter((t) => t.proposal?.status === 'SUBMITTED').length}
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm text-center p-3">
                  <div className="text-success small fw-semibold">Approved Proposals</div>
                  <div className="fs-3 fw-bold text-success">
                    {teams.filter((t) => t.proposal?.status === 'APPROVED').length}
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm text-center p-3">
                  <div className="text-warning small fw-semibold">Revision Requested</div>
                  <div className="fs-3 fw-bold text-warning">
                    {teams.filter((t) => t.proposal?.status === 'REVISION_REQUESTED').length}
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-lg-6">
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">All Course Project Teams</h5>
                    <select
                      data-testid="instructor-status-filter"
                      className="form-select form-select-sm w-auto"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="SUBMITTED">SUBMITTED</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REVISION_REQUESTED">REVISION_REQUESTED</option>
                      <option value="DRAFT">DRAFT</option>
                    </select>
                  </div>
                  <div className="card-body p-0">
                    <table className="table table-hover mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th className="ps-3">Team</th>
                          <th>Members</th>
                          <th>Proposal Status</th>
                          <th className="pe-3 text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeams.map((t) => (
                          <tr
                            key={t.id}
                            className={
                              selectedInstructorTeam?.id === t.id ? 'table-active' : undefined
                            }
                          >
                            <td className="ps-3">
                              <div className="fw-bold">{t.name}</div>
                              <div className="small text-muted">
                                {t.proposal?.title || 'No proposal'}
                              </div>
                            </td>
                            <td>
                              {t.members.length}/{t.course.maxTeamSize}
                            </td>
                            <td>
                              <span className={`badge ${statusBadgeClass(t.proposal?.status)}`}>
                                {t.proposal?.status || 'NONE'}
                              </span>
                            </td>
                            <td className="pe-3 text-end">
                              <button
                                type="button"
                                data-testid={`select-team-${t.id}`}
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => setSelectedTeamId(t.id)}
                              >
                                Inspect / Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 fw-bold">
                      Instructor Proposal Review Panel (F-03 / BR-05)
                    </h5>
                  </div>
                  <div className="card-body">
                    {!selectedInstructorTeam || !selectedInstructorTeam.proposal ? (
                      <div className="text-muted">Select a team with a proposal to inspect.</div>
                    ) : (
                      <>
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h5 className="fw-bold mb-1" data-testid="review-panel-team">
                              {selectedInstructorTeam.name}: {selectedInstructorTeam.proposal.title}
                            </h5>
                            <div className="small text-muted">
                              Members:{' '}
                              {selectedInstructorTeam.members
                                .map((m) => `${m.user.fullName} (${m.user.studentCode || ''})`)
                                .join(', ')}
                            </div>
                          </div>
                          <span
                            data-testid="review-panel-status"
                            className={`badge ${statusBadgeClass(
                              selectedInstructorTeam.proposal.status
                            )} fs-6`}
                          >
                            {selectedInstructorTeam.proposal.status}
                          </span>
                        </div>

                        <div className="bg-light p-3 rounded mb-3 border">
                          <div className="fw-semibold small text-uppercase text-muted mb-1">
                            Problem Statement
                          </div>
                          <p className="mb-2">{selectedInstructorTeam.proposal.problemStatement}</p>
                          <div className="small">
                            <strong>Tech Stack:</strong> {selectedInstructorTeam.proposal.techStack}{' '}
                            | <strong>Repo:</strong> {selectedInstructorTeam.proposal.repoUrl} |{' '}
                            <strong>Revision:</strong> #
                            {selectedInstructorTeam.proposal.revisionCount}
                          </div>
                        </div>

                        {selectedInstructorTeam.proposal.reviewFeedback && (
                          <div className="alert alert-secondary small">
                            <strong>Latest Recorded Feedback:</strong>{' '}
                            {selectedInstructorTeam.proposal.reviewFeedback}
                          </div>
                        )}

                        <div className="mb-3">
                          <label className="form-label fw-semibold">
                            Instructor Review Feedback{' '}
                            <span className="text-danger">* (min 10 chars, BR-05)</span>
                          </label>
                          <textarea
                            rows={3}
                            data-testid="review-feedback-input"
                            className="form-control"
                            placeholder="Provide specific engineering feedback (minimum 10 characters)..."
                            value={reviewFeedbackInput}
                            onChange={(e) => setReviewFeedbackInput(e.target.value)}
                          />
                        </div>

                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            data-testid="approve-proposal-btn"
                            className="btn btn-success fw-semibold"
                            onClick={() =>
                              handleInstructorDecision(
                                selectedInstructorTeam.proposal!.id,
                                'APPROVED'
                              )
                            }
                          >
                            Approve Proposal (APPROVED)
                          </button>
                          <button
                            type="button"
                            data-testid="revision-proposal-btn"
                            className="btn btn-warning fw-semibold"
                            onClick={() =>
                              handleInstructorDecision(
                                selectedInstructorTeam.proposal!.id,
                                'REVISION_REQUESTED'
                              )
                            }
                          >
                            Request Revision (REVISION_REQUESTED)
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
