import express from 'express';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import {
  requireAuth,
  requireRole,
  signAuthToken,
  revokeAuthToken,
} from './middleware/auth';
import {
  validateTeamCapacity,
  validateProposalSubmission,
  validateInstructorReview,
} from './utils/domainRules';

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true,
  })
);
app.use(express.json());

// ============================================================================
// Health Check (NFR-05, AC-01)
// ============================================================================
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'course-pms-api',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Feature F-01: Authentication, Session & Role Identity
// ============================================================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({
        error: 'Email and password are required.',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      res.status(401).json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      res.status(401).json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    const token = signAuthToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        studentCode: user.studentCode,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.status(200).json({ user: req.user });
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  revokeAuthToken(req.tokenJti, req.rawToken);
  res.status(200).json({ message: 'Logged out successfully' });
});

// ============================================================================
// Courses Lookup
// ============================================================================
app.get('/api/courses', requireAuth, async (_req, res) => {
  const courses = await prisma.course.findMany({
    orderBy: { id: 'asc' },
  });
  res.status(200).json({ courses });
});

// ============================================================================
// Feature F-02: Course Project Team Formation & Roster Management
// ============================================================================
app.get('/api/teams', requireAuth, async (req, res) => {
  try {
    const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
    const teams = await prisma.projectTeam.findMany({
      where: courseId ? { courseId } : undefined,
      include: {
        course: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                studentCode: true,
                role: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        proposal: {
          include: {
            reviewedBy: {
              select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const currentUser = req.user!;
    // Enforce BR-06 privacy on list: Students only receive full proposal details for their own team
    const sanitizedTeams = teams.map((team) => {
      const isMember = team.members.some((m) => m.userId === currentUser.id);
      if (currentUser.role === 'INSTRUCTOR' || isMember) {
        return team;
      }
      return {
        ...team,
        proposal: team.proposal
          ? {
              id: team.proposal.id,
              teamId: team.proposal.teamId,
              title: team.proposal.title,
              status: team.proposal.status,
              revisionCount: team.proposal.revisionCount,
              updatedAt: team.proposal.updatedAt,
            }
          : null,
      };
    });

    res.status(200).json({ teams: sanitizedTeams });
  } catch (err) {
    console.error('List teams error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/teams', requireAuth, requireRole('STUDENT'), async (req, res) => {
  try {
    const { name, courseId } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      res.status(400).json({
        error: 'Team name must be at least 3 characters.',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const course = courseId
      ? await prisma.course.findUnique({ where: { id: Number(courseId) } })
      : await prisma.course.findFirst({ orderBy: { id: 'asc' } });

    if (!course) {
      res.status(404).json({
        error: 'Target course not found.',
        code: 'COURSE_NOT_FOUND',
      });
      return;
    }

    // BR-01: Single Active Team Membership per Course
    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        courseId_userId: {
          courseId: course.id,
          userId: req.user!.id,
        },
      },
    });

    if (existingMembership) {
      res.status(409).json({
        error: 'Student is already a member of an active team in this course.',
        code: 'BR01_DUPLICATE_TEAM_MEMBERSHIP',
      });
      return;
    }

    const existingName = await prisma.projectTeam.findUnique({
      where: {
        courseId_name: {
          courseId: course.id,
          name: name.trim(),
        },
      },
    });

    if (existingName) {
      res.status(409).json({
        error: 'A team with this name already exists in the course.',
        code: 'DUPLICATE_TEAM_NAME',
      });
      return;
    }

    const createdTeam = await prisma.projectTeam.create({
      data: {
        name: name.trim(),
        courseId: course.id,
        createdById: req.user!.id,
        members: {
          create: [
            {
              userId: req.user!.id,
              courseId: course.id,
              memberRole: 'LEADER',
            },
          ],
        },
      },
      include: {
        course: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                studentCode: true,
                role: true,
              },
            },
          },
        },
        proposal: true,
      },
    });

    res.status(201).json({ team: createdTeam });
  } catch (err) {
    console.error('Create team error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/teams/:id/members', requireAuth, requireRole('STUDENT'), async (req, res) => {
  try {
    const teamId = Number(req.params.id);
    const { email } = req.body || {};

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        error: 'Member email is required.',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const team = await prisma.projectTeam.findUnique({
      where: { id: teamId },
      include: {
        course: true,
        members: true,
      },
    });

    if (!team) {
      res.status(404).json({ error: 'Project team not found.', code: 'TEAM_NOT_FOUND' });
      return;
    }

    // BR-06: Only current members of the team can add teammates to the team roster
    const callerIsMember = team.members.some((m) => m.userId === req.user!.id);
    if (!callerIsMember) {
      res.status(403).json({
        error: 'Forbidden: only members of this team may add teammates.',
        code: 'BR06_FORBIDDEN_TEAM_ACCESS',
      });
      return;
    }

    // BR-02: Enforce course maximum team size
    const capacityCheck = validateTeamCapacity(team.members.length, team.course.maxTeamSize);
    if (!capacityCheck.valid) {
      res.status(capacityCheck.status || 409).json({
        error: capacityCheck.error,
        code: capacityCheck.code,
      });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!targetUser || targetUser.role !== 'STUDENT') {
      res.status(404).json({
        error: 'Target student account not found.',
        code: 'STUDENT_NOT_FOUND',
      });
      return;
    }

    // BR-01: Single Active Team Membership per Course
    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        courseId_userId: {
          courseId: team.courseId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership) {
      res.status(409).json({
        error: 'Target student is already a member of an active team in this course.',
        code: 'BR01_DUPLICATE_TEAM_MEMBERSHIP',
      });
      return;
    }

    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: targetUser.id,
        courseId: team.courseId,
        memberRole: 'MEMBER',
      },
    });

    const updatedTeam = await prisma.projectTeam.findUnique({
      where: { id: team.id },
      include: {
        course: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                studentCode: true,
                role: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        proposal: true,
      },
    });

    res.status(200).json({ team: updatedTeam });
  } catch (err) {
    console.error('Add team member error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================================
// Feature F-03: Project Proposal Drafting, Submission & Instructor Review
// ============================================================================
app.get('/api/teams/:id/proposal', requireAuth, async (req, res) => {
  try {
    const teamId = Number(req.params.id);
    const team = await prisma.projectTeam.findUnique({
      where: { id: teamId },
      include: {
        members: true,
        proposal: {
          include: {
            reviewedBy: {
              select: { id: true, email: true, fullName: true, role: true },
            },
          },
        },
      },
    });

    if (!team) {
      res.status(404).json({ error: 'Project team not found.', code: 'TEAM_NOT_FOUND' });
      return;
    }

    // BR-06: Only members of this team or an INSTRUCTOR may access private proposal details
    const isMember = team.members.some((m) => m.userId === req.user!.id);
    if (req.user!.role !== 'INSTRUCTOR' && !isMember) {
      res.status(403).json({
        error: 'Forbidden: you do not have permission to view another team’s private proposal.',
        code: 'BR06_FORBIDDEN_TEAM_ACCESS',
      });
      return;
    }

    res.status(200).json({ proposal: team.proposal });
  } catch (err) {
    console.error('Get proposal error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

app.put('/api/teams/:id/proposal', requireAuth, requireRole('STUDENT'), async (req, res) => {
  try {
    const teamId = Number(req.params.id);
    const { title, problemStatement, techStack, repoUrl } = req.body || {};

    const team = await prisma.projectTeam.findUnique({
      where: { id: teamId },
      include: { members: true, proposal: true },
    });

    if (!team) {
      res.status(404).json({ error: 'Project team not found.', code: 'TEAM_NOT_FOUND' });
      return;
    }

    // BR-06: Team ownership check
    const isMember = team.members.some((m) => m.userId === req.user!.id);
    if (!isMember) {
      res.status(403).json({
        error: 'Forbidden: you cannot modify another team’s project proposal.',
        code: 'BR06_FORBIDDEN_TEAM_ACCESS',
      });
      return;
    }

    // BR-03: Cannot edit a proposal that is currently SUBMITTED or already APPROVED
    if (
      team.proposal &&
      (team.proposal.status === 'SUBMITTED' || team.proposal.status === 'APPROVED')
    ) {
      res.status(409).json({
        error: `Proposal cannot be edited while in ${team.proposal.status} status.`,
        code: 'BR03_INVALID_STATUS_TRANSITION',
      });
      return;
    }

    const proposal = await prisma.projectProposal.upsert({
      where: { teamId: team.id },
      create: {
        teamId: team.id,
        title: typeof title === 'string' ? title.trim() : '',
        problemStatement: typeof problemStatement === 'string' ? problemStatement.trim() : '',
        techStack: typeof techStack === 'string' ? techStack.trim() : '',
        repoUrl: typeof repoUrl === 'string' ? repoUrl.trim() : '',
        status: 'DRAFT',
      },
      update: {
        title: typeof title === 'string' ? title.trim() : team.proposal?.title ?? '',
        problemStatement:
          typeof problemStatement === 'string'
            ? problemStatement.trim()
            : team.proposal?.problemStatement ?? '',
        techStack:
          typeof techStack === 'string' ? techStack.trim() : team.proposal?.techStack ?? '',
        repoUrl: typeof repoUrl === 'string' ? repoUrl.trim() : team.proposal?.repoUrl ?? '',
      },
      include: {
        reviewedBy: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });

    res.status(200).json({ proposal });
  } catch (err) {
    console.error('Save proposal draft error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/teams/:id/proposal/submit', requireAuth, requireRole('STUDENT'), async (req, res) => {
  try {
    const teamId = Number(req.params.id);
    const { title, problemStatement, techStack, repoUrl } = req.body || {};

    const team = await prisma.projectTeam.findUnique({
      where: { id: teamId },
      include: { members: true, proposal: true },
    });

    if (!team) {
      res.status(404).json({ error: 'Project team not found.', code: 'TEAM_NOT_FOUND' });
      return;
    }

    // BR-06: Team ownership check
    const isMember = team.members.some((m) => m.userId === req.user!.id);
    if (!isMember) {
      res.status(403).json({
        error: 'Forbidden: you cannot submit another team’s project proposal.',
        code: 'BR06_FORBIDDEN_TEAM_ACCESS',
      });
      return;
    }

    const currentStatus = (team.proposal?.status || 'DRAFT') as
      | 'DRAFT'
      | 'SUBMITTED'
      | 'APPROVED'
      | 'REVISION_REQUESTED';

    const effectiveTitle =
      typeof title === 'string' ? title : team.proposal?.title ?? '';
    const effectiveProblem =
      typeof problemStatement === 'string'
        ? problemStatement
        : team.proposal?.problemStatement ?? '';
    const effectiveStack =
      typeof techStack === 'string' ? techStack : team.proposal?.techStack ?? '';
    const effectiveRepo =
      typeof repoUrl === 'string' ? repoUrl : team.proposal?.repoUrl ?? '';

    // BR-03 & BR-04 validation
    const validation = validateProposalSubmission(currentStatus, {
      title: effectiveTitle,
      problemStatement: effectiveProblem,
      techStack: effectiveStack,
    });

    if (!validation.valid) {
      res.status(validation.status || 400).json({
        error: validation.error,
        code: validation.code,
      });
      return;
    }

    const nextRevisionCount = (team.proposal?.revisionCount || 0) + 1;

    const proposal = await prisma.projectProposal.upsert({
      where: { teamId: team.id },
      create: {
        teamId: team.id,
        title: effectiveTitle.trim(),
        problemStatement: effectiveProblem.trim(),
        techStack: effectiveStack.trim(),
        repoUrl: effectiveRepo.trim(),
        status: 'SUBMITTED',
        submittedAt: new Date(),
        revisionCount: 1,
      },
      update: {
        title: effectiveTitle.trim(),
        problemStatement: effectiveProblem.trim(),
        techStack: effectiveStack.trim(),
        repoUrl: effectiveRepo.trim(),
        status: 'SUBMITTED',
        submittedAt: new Date(),
        revisionCount: nextRevisionCount,
      },
      include: {
        reviewedBy: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });

    res.status(200).json({ proposal });
  } catch (err) {
    console.error('Submit proposal error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/proposals/:id/review', requireAuth, requireRole('INSTRUCTOR'), async (req, res) => {
  try {
    const proposalId = Number(req.params.id);
    const { decision, reviewFeedback } = req.body || {};

    const existing = await prisma.projectProposal.findUnique({
      where: { id: proposalId },
    });

    if (!existing) {
      res.status(404).json({
        error: 'Project proposal not found.',
        code: 'PROPOSAL_NOT_FOUND',
      });
      return;
    }

    // BR-03 & BR-05 validation
    const validation = validateInstructorReview(existing.status, decision, reviewFeedback);
    if (!validation.valid) {
      res.status(validation.status || 400).json({
        error: validation.error,
        code: validation.code,
      });
      return;
    }

    const updated = await prisma.projectProposal.update({
      where: { id: proposalId },
      data: {
        status: decision as 'APPROVED' | 'REVISION_REQUESTED',
        reviewFeedback: reviewFeedback.trim(),
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
      },
      include: {
        reviewedBy: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });

    res.status(200).json({ proposal: updated });
  } catch (err) {
    console.error('Review proposal error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// Serve static frontend in production container
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;
