import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/prisma';
import { seedDatabase } from '../prisma/seed';
import { clearRevokedTokens } from '../src/middleware/auth';

describe('CoursePMS Sprint 1 — API & Database Integration Suite (TEST-01 to TEST-10)', () => {
  let seeded: Awaited<ReturnType<typeof seedDatabase>>;

  beforeEach(async () => {
    clearRevokedTokens();
    seeded = await seedDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('TEST-01 / AC-01: verifies health check, valid Student/Instructor login, current-user identity, and credential hygiene (no passwordHash)', async () => {
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('ok');

    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pawarit@mail.kmutt.ac.th', password: 'Password123!' });

    expect(studentLogin.status).toBe(200);
    expect(studentLogin.body.token).toBeTruthy();
    expect(studentLogin.body.user.email).toBe('pawarit@mail.kmutt.ac.th');
    expect(studentLogin.body.user.role).toBe('STUDENT');
    expect(studentLogin.body.user.passwordHash).toBeUndefined();

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${studentLogin.body.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.studentCode).toBe('67070503466');
    expect(meRes.body.user.passwordHash).toBeUndefined();
  });

  it('TEST-02 / AC-02: rejects invalid credentials and missing login fields without issuing a token', async () => {
    const wrongPass = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pawarit@mail.kmutt.ac.th', password: 'WrongPassword!' });

    expect(wrongPass.status).toBe(401);
    expect(wrongPass.body.code).toBe('INVALID_CREDENTIALS');
    expect(wrongPass.body.token).toBeUndefined();

    const missingFields = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pawarit@mail.kmutt.ac.th' });

    expect(missingFields.status).toBe(400);
    expect(missingFields.body.code).toBe('VALIDATION_ERROR');
  });

  it('TEST-03 / AC-03: rejects unauthenticated requests to protected endpoints and revokes token upon logout', async () => {
    const unauthTeams = await request(app).get('/api/teams');
    expect(unauthTeams.status).toBe(401);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pawarit@mail.kmutt.ac.th', password: 'Password123!' });
    const token = loginRes.body.token;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    const reuseAfterLogout = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(reuseAfterLogout.status).toBe(401);
    expect(reuseAfterLogout.body.code).toBe('TOKEN_REVOKED');
  });

  it('TEST-04 / AC-04: allows an unassigned student to create a project team and add an eligible teammate', async () => {
    const sudaLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'suda@mail.kmutt.ac.th', password: 'Password123!' });
    const token = sudaLogin.body.token;

    const createRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Team Gamma', courseId: seeded.course.id });

    expect(createRes.status).toBe(201);
    expect(createRes.body.team.name).toBe('Team Gamma');
    expect(createRes.body.team.members).toHaveLength(1);

    const addMemberRes = await request(app)
      .post(`/api/teams/${createRes.body.team.id}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'tatchakorn@mail.kmutt.ac.th' });

    expect(addMemberRes.status).toBe(200);
    expect(addMemberRes.body.team.members).toHaveLength(2);
  });

  it('TEST-05 / AC-05: enforces BR-01 by preventing a student from creating or joining a second active team in the same course', async () => {
    const pawaritLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pawarit@mail.kmutt.ac.th', password: 'Password123!' });
    const pawaritToken = pawaritLogin.body.token;

    // Pawarit is already in Team Alpha; creating another team in CPE334 must be rejected (409)
    const duplicateCreate = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${pawaritToken}`)
      .send({ name: 'Second Team', courseId: seeded.course.id });

    expect(duplicateCreate.status).toBe(409);
    expect(duplicateCreate.body.code).toBe('BR01_DUPLICATE_TEAM_MEMBERSHIP');

    // Somchai (Team Beta leader) trying to add Pawarit to Team Beta must also be rejected (409)
    const somchaiLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'somchai@mail.kmutt.ac.th', password: 'Password123!' });

    const duplicateJoin = await request(app)
      .post(`/api/teams/${seeded.teamBeta.id}/members`)
      .set('Authorization', `Bearer ${somchaiLogin.body.token}`)
      .send({ email: 'pawarit@mail.kmutt.ac.th' });

    expect(duplicateJoin.status).toBe(409);
    expect(duplicateJoin.body.code).toBe('BR01_DUPLICATE_TEAM_MEMBERSHIP');
  });

  it('TEST-06 / AC-06: enforces BR-02 by rejecting adding a 4th member when course maxTeamSize (3) is reached', async () => {
    const pawaritLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pawarit@mail.kmutt.ac.th', password: 'Password123!' });
    const token = pawaritLogin.body.token;

    // Add 2nd member (tatchakorn) and 3rd member (suda) to Team Alpha (maxTeamSize = 3)
    const add2 = await request(app)
      .post(`/api/teams/${seeded.teamAlpha.id}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'tatchakorn@mail.kmutt.ac.th' });
    expect(add2.status).toBe(200);

    const add3 = await request(app)
      .post(`/api/teams/${seeded.teamAlpha.id}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'suda@mail.kmutt.ac.th' });
    expect(add3.status).toBe(200);
    expect(add3.body.team.members).toHaveLength(3);

    // Attempting to add 4th member (niran) must fail with 409 BR02_MAX_TEAM_SIZE_EXCEEDED
    const add4 = await request(app)
      .post(`/api/teams/${seeded.teamAlpha.id}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'niran@mail.kmutt.ac.th' });

    expect(add4.status).toBe(409);
    expect(add4.body.code).toBe('BR02_MAX_TEAM_SIZE_EXCEEDED');
  });

  it('TEST-07 & TEST-08 / AC-07 & AC-08: validates proposal completeness (BR-04), saves and submits proposal, and blocks edits while SUBMITTED (BR-03)', async () => {
    const pawaritLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pawarit@mail.kmutt.ac.th', password: 'Password123!' });
    const token = pawaritLogin.body.token;

    // 1. Incomplete submission (short title) -> 400 BR04_INCOMPLETE_PROPOSAL
    const incompleteRes = await request(app)
      .post(`/api/teams/${seeded.teamAlpha.id}/proposal/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Short',
        problemStatement: 'Too brief',
        techStack: 'TS',
      });
    expect(incompleteRes.status).toBe(400);
    expect(incompleteRes.body.code).toBe('BR04_INCOMPLETE_PROPOSAL');

    // 2. Valid draft update & submission -> 200 SUBMITTED
    const submitRes = await request(app)
      .post(`/api/teams/${seeded.teamAlpha.id}/proposal/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'CoursePMS: Full-Stack Course Project Management System',
        problemStatement:
          'Provides automated team capacity validation, proposal state transitions, and instructor grading workflows.',
        techStack: 'React 18, TypeScript, Express, Prisma, PostgreSQL',
        repoUrl: 'https://github.com/martinvadre/course-pms',
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.proposal.status).toBe('SUBMITTED');
    expect(submitRes.body.proposal.revisionCount).toBe(1);

    // 3. Attempting to edit or re-submit while SUBMITTED -> 409 BR03_INVALID_STATUS_TRANSITION
    const editWhileSubmitted = await request(app)
      .put(`/api/teams/${seeded.teamAlpha.id}/proposal`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Unauthorized Edit While Pending Review' });
    expect(editWhileSubmitted.status).toBe(409);
    expect(editWhileSubmitted.body.code).toBe('BR03_INVALID_STATUS_TRANSITION');
  });

  it('TEST-09 / AC-09: enforces BR-05 on Instructor review feedback and completes REVISION_REQUESTED -> SUBMITTED -> APPROVED lifecycle', async () => {
    const pawaritLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pawarit@mail.kmutt.ac.th', password: 'Password123!' });
    const studentToken = pawaritLogin.body.token;

    const instructorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'instructor@kmutt.ac.th', password: 'Password123!' });
    const instructorToken = instructorLogin.body.token;

    // Submit Team Alpha proposal first
    const submit1 = await request(app)
      .post(`/api/teams/${seeded.teamAlpha.id}/proposal/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});
    expect(submit1.status).toBe(200);
    const proposalId = submit1.body.proposal.id;

    // Instructor review with short feedback (< 10 chars) -> 400 BR05_FEEDBACK_TOO_SHORT
    const shortFeedback = await request(app)
      .post(`/api/proposals/${proposalId}/review`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ decision: 'REVISION_REQUESTED', reviewFeedback: 'Short' });
    expect(shortFeedback.status).toBe(400);
    expect(shortFeedback.body.code).toBe('BR05_FEEDBACK_TOO_SHORT');

    // Instructor requests revision with valid feedback
    const revReq = await request(app)
      .post(`/api/proposals/${proposalId}/review`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        decision: 'REVISION_REQUESTED',
        reviewFeedback: 'Please clarify the database constraints for single team membership.',
      });
    expect(revReq.status).toBe(200);
    expect(revReq.body.proposal.status).toBe('REVISION_REQUESTED');

    // Student revises and re-submits -> revisionCount becomes 2
    const submit2 = await request(app)
      .post(`/api/teams/${seeded.teamAlpha.id}/proposal/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        problemStatement:
          'Updated with composite unique index (courseId, userId) to prevent duplicate team memberships.',
      });
    expect(submit2.status).toBe(200);
    expect(submit2.body.proposal.status).toBe('SUBMITTED');
    expect(submit2.body.proposal.revisionCount).toBe(2);

    // Instructor approves the revised proposal
    const approveRes = await request(app)
      .post(`/api/proposals/${proposalId}/review`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        decision: 'APPROVED',
        reviewFeedback: 'Approved! Excellent relational schema and Sprint 1 vertical slice scope.',
      });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.proposal.status).toBe('APPROVED');
  });

  it('TEST-10 / AC-10: enforces BR-06 role and cross-team ownership restrictions without leaking private data', async () => {
    const pawaritLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pawarit@mail.kmutt.ac.th', password: 'Password123!' });
    const pawaritToken = pawaritLogin.body.token;

    // 1. Student in Team Alpha tries to view Team Beta's private proposal -> 403 Forbidden
    const crossTeamGet = await request(app)
      .get(`/api/teams/${seeded.teamBeta.id}/proposal`)
      .set('Authorization', `Bearer ${pawaritToken}`);
    expect(crossTeamGet.status).toBe(403);
    expect(crossTeamGet.body.code).toBe('BR06_FORBIDDEN_TEAM_ACCESS');
    expect(crossTeamGet.body.proposal).toBeUndefined();

    // 2. Student in Team Alpha tries to modify Team Beta's proposal -> 403 Forbidden
    const crossTeamPut = await request(app)
      .put(`/api/teams/${seeded.teamBeta.id}/proposal`)
      .set('Authorization', `Bearer ${pawaritToken}`)
      .send({ title: 'Tampered Proposal Title' });
    expect(crossTeamPut.status).toBe(403);
    expect(crossTeamPut.body.code).toBe('BR06_FORBIDDEN_TEAM_ACCESS');

    // 3. Student tries to call Instructor-only review endpoint -> 403 Forbidden
    const teamBetaProposal = await prisma.projectProposal.findUnique({
      where: { teamId: seeded.teamBeta.id },
    });
    const studentReviewAttempt = await request(app)
      .post(`/api/proposals/${teamBetaProposal!.id}/review`)
      .set('Authorization', `Bearer ${pawaritToken}`)
      .send({
        decision: 'APPROVED',
        reviewFeedback: 'Self-approving proposal as a student should be forbidden.',
      });
    expect(studentReviewAttempt.status).toBe(403);
    expect(studentReviewAttempt.body.code).toBe('BR06_FORBIDDEN_ROLE');
  });
});
