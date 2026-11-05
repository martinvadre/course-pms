export type ProposalState = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REVISION_REQUESTED';

export interface DomainValidationResult {
  valid: boolean;
  status?: number;
  code?: string;
  error?: string;
}

/**
 * BR-02: Enforce maximum team size capacity for a course.
 */
export function validateTeamCapacity(
  currentMemberCount: number,
  maxTeamSize: number
): DomainValidationResult {
  if (currentMemberCount >= maxTeamSize) {
    return {
      valid: false,
      status: 409,
      code: 'BR02_MAX_TEAM_SIZE_EXCEEDED',
      error: `Team has reached the maximum capacity of ${maxTeamSize} members for this course.`,
    };
  }
  return { valid: true };
}

/**
 * BR-03 & BR-04: Validate whether a team can submit a proposal and whether content is complete.
 */
export function validateProposalSubmission(
  currentStatus: ProposalState,
  payload: { title?: string; problemStatement?: string; techStack?: string }
): DomainValidationResult {
  if (currentStatus === 'SUBMITTED' || currentStatus === 'APPROVED') {
    return {
      valid: false,
      status: 409,
      code: 'BR03_INVALID_STATUS_TRANSITION',
      error: `Proposal in ${currentStatus} status cannot be modified or re-submitted.`,
    };
  }

  const title = (payload.title || '').trim();
  const problemStatement = (payload.problemStatement || '').trim();
  const techStack = (payload.techStack || '').trim();

  if (title.length < 5 || problemStatement.length < 20 || techStack.length < 3) {
    return {
      valid: false,
      status: 400,
      code: 'BR04_INCOMPLETE_PROPOSAL',
      error:
        'Proposal submission requires title (>= 5 chars), problemStatement (>= 20 chars), and techStack (>= 3 chars).',
    };
  }

  return { valid: true };
}

/**
 * BR-03 & BR-05: Validate Instructor proposal review transition and mandatory feedback length.
 */
export function validateInstructorReview(
  currentStatus: ProposalState,
  decision: string,
  reviewFeedback?: string
): DomainValidationResult {
  if (currentStatus !== 'SUBMITTED') {
    return {
      valid: false,
      status: 409,
      code: 'BR03_INVALID_STATUS_TRANSITION',
      error: `Only proposals in SUBMITTED status can be reviewed (current status: ${currentStatus}).`,
    };
  }

  if (decision !== 'APPROVED' && decision !== 'REVISION_REQUESTED') {
    return {
      valid: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      error: 'Decision must be APPROVED or REVISION_REQUESTED.',
    };
  }

  const feedback = typeof reviewFeedback === 'string' ? reviewFeedback.trim() : '';
  if (feedback.length < 10) {
    return {
      valid: false,
      status: 400,
      code: 'BR05_FEEDBACK_TOO_SHORT',
      error: 'Instructor review feedback must be at least 10 characters.',
    };
  }

  return { valid: true };
}
