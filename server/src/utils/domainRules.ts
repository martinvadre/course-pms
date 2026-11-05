export type ProposalState = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REVISION_REQUESTED';

export interface DomainValidationResult {
  valid: boolean;
  status?: number;
  code?: string;
  error?: string;
}

/**
 * BR-02: Enforce maximum team size capacity for a course.
 * (Initial TDD stub — does not yet reject when currentCount >= maxTeamSize)
 */
export function validateTeamCapacity(
  currentMemberCount: number,
  maxTeamSize: number
): DomainValidationResult {
  // TDD Red phase stub: missing capacity boundary rejection
  return { valid: true };
}

/**
 * BR-03 & BR-04: Validate whether a team can edit/submit a proposal and whether content is complete.
 * (Initial TDD stub — does not yet block SUBMITTED/APPROVED state or short fields)
 */
export function validateProposalSubmission(
  currentStatus: ProposalState,
  payload: { title?: string; problemStatement?: string; techStack?: string }
): DomainValidationResult {
  // TDD Red phase stub
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
  // TDD Red phase stub
  return { valid: true };
}
