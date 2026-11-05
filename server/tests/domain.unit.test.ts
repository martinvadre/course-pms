import { describe, it, expect } from 'vitest';
import {
  validateTeamCapacity,
  validateProposalSubmission,
  validateInstructorReview,
} from '../src/utils/domainRules';

describe('CoursePMS Sprint 1 — Domain Rules Unit Suite (BR-02, BR-03, BR-04, BR-05)', () => {
  describe('TEST-06 / AC-06: BR-02 Maximum Team Capacity Enforcement', () => {
    it('allows adding a teammate when current member count is below maxTeamSize', () => {
      const res = validateTeamCapacity(2, 3);
      expect(res.valid).toBe(true);
    });

    it('rejects adding a teammate when current member count equals or exceeds maxTeamSize', () => {
      const res = validateTeamCapacity(3, 3);
      expect(res.valid).toBe(false);
      expect(res.status).toBe(409);
      expect(res.code).toBe('BR02_MAX_TEAM_SIZE_EXCEEDED');
    });
  });

  describe('TEST-08 / AC-08: BR-03 & BR-04 Proposal Completeness and State Lock', () => {
    it('rejects proposal submission when title is shorter than 5 characters (BR-04)', () => {
      const res = validateProposalSubmission('DRAFT', {
        title: 'AI',
        problemStatement: 'This is a sufficiently long problem statement for validation.',
        techStack: 'React, Express, PostgreSQL',
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.code).toBe('BR04_INCOMPLETE_PROPOSAL');
    });

    it('rejects proposal submission when problemStatement is shorter than 20 characters (BR-04)', () => {
      const res = validateProposalSubmission('DRAFT', {
        title: 'Valid Project Title',
        problemStatement: 'Too short',
        techStack: 'React, Node',
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.code).toBe('BR04_INCOMPLETE_PROPOSAL');
    });

    it('rejects re-submitting a proposal that is already in SUBMITTED or APPROVED state (BR-03)', () => {
      const submittedRes = validateProposalSubmission('SUBMITTED', {
        title: 'Valid Project Title',
        problemStatement: 'This is a sufficiently long problem statement for validation.',
        techStack: 'React, Node',
      });
      expect(submittedRes.valid).toBe(false);
      expect(submittedRes.status).toBe(409);
      expect(submittedRes.code).toBe('BR03_INVALID_STATUS_TRANSITION');

      const approvedRes = validateProposalSubmission('APPROVED', {
        title: 'Valid Project Title',
        problemStatement: 'This is a sufficiently long problem statement for validation.',
        techStack: 'React, Node',
      });
      expect(approvedRes.valid).toBe(false);
      expect(approvedRes.status).toBe(409);
      expect(approvedRes.code).toBe('BR03_INVALID_STATUS_TRANSITION');
    });

    it('allows submitting a complete proposal from DRAFT or REVISION_REQUESTED state', () => {
      const res = validateProposalSubmission('REVISION_REQUESTED', {
        title: 'CoursePMS Capstone Tracker',
        problemStatement:
          'Manage student teams, proposal lifecycles, and milestone deliverables with strict RBAC.',
        techStack: 'React, Express, PostgreSQL',
      });
      expect(res.valid).toBe(true);
    });
  });

  describe('TEST-09 / AC-09: BR-03 & BR-05 Instructor Review Transition and Mandatory Feedback', () => {
    it('rejects instructor review if proposal is still in DRAFT state (BR-03)', () => {
      const res = validateInstructorReview(
        'DRAFT',
        'APPROVED',
        'Looks well scoped and feasible for Sprint 1.'
      );
      expect(res.valid).toBe(false);
      expect(res.status).toBe(409);
      expect(res.code).toBe('BR03_INVALID_STATUS_TRANSITION');
    });

    it('rejects instructor review when reviewFeedback is shorter than 10 characters (BR-05)', () => {
      const res = validateInstructorReview('SUBMITTED', 'REVISION_REQUESTED', 'Too short');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.code).toBe('BR05_FEEDBACK_TOO_SHORT');
    });

    it('allows instructor review on SUBMITTED proposal with valid decision and feedback >= 10 chars', () => {
      const res = validateInstructorReview(
        'SUBMITTED',
        'APPROVED',
        'Approved for Sprint 1 implementation. Clear scope and database constraints.'
      );
      expect(res.valid).toBe(true);
    });
  });
});
