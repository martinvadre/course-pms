import { PrismaClient, Role, ProposalStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

export async function seedDatabase(customPrisma: PrismaClient = prisma) {
  const demoPassword = process.env.DEMO_USER_PASSWORD || 'Password123!';
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  await customPrisma.milestoneSubmission.deleteMany();
  await customPrisma.milestone.deleteMany();
  await customPrisma.projectProposal.deleteMany();
  await customPrisma.teamMember.deleteMany();
  await customPrisma.projectTeam.deleteMany();
  await customPrisma.course.deleteMany();
  await customPrisma.user.deleteMany();

  const instructor = await customPrisma.user.create({
    data: {
      email: 'instructor@kmutt.ac.th',
      fullName: 'Dr. Piyanit Ua-areemitr',
      passwordHash,
      role: Role.INSTRUCTOR,
    },
  });

  const pawarit = await customPrisma.user.create({
    data: {
      email: 'pawarit@mail.kmutt.ac.th',
      fullName: 'Pawarit Wongdaeng',
      studentCode: '67070503466',
      passwordHash,
      role: Role.STUDENT,
    },
  });

  const tatchakorn = await customPrisma.user.create({
    data: {
      email: 'tatchakorn@mail.kmutt.ac.th',
      fullName: 'Tatchakorn Thamnimitr',
      studentCode: '67070503415',
      passwordHash,
      role: Role.STUDENT,
    },
  });

  const somchai = await customPrisma.user.create({
    data: {
      email: 'somchai@mail.kmutt.ac.th',
      fullName: 'Somchai Rakdee',
      studentCode: '67070503499',
      passwordHash,
      role: Role.STUDENT,
    },
  });

  const suda = await customPrisma.user.create({
    data: {
      email: 'suda@mail.kmutt.ac.th',
      fullName: 'Suda Jaidee',
      studentCode: '67070503488',
      passwordHash,
      role: Role.STUDENT,
    },
  });

  const niran = await customPrisma.user.create({
    data: {
      email: 'niran@mail.kmutt.ac.th',
      fullName: 'Niran Sukjai',
      studentCode: '67070503477',
      passwordHash,
      role: Role.STUDENT,
    },
  });

  const course = await customPrisma.course.create({
    data: {
      code: 'CPE334',
      name: 'Software Engineering in the Age of AI Agents',
      term: '1/2026',
      maxTeamSize: 3,
    },
  });

  // Team Alpha: Created by Pawarit (1 member initially; Tatchakorn can be added in workflow)
  const teamAlpha = await customPrisma.projectTeam.create({
    data: {
      name: 'Team Alpha',
      courseId: course.id,
      createdById: pawarit.id,
      members: {
        create: [
          {
            userId: pawarit.id,
            courseId: course.id,
            memberRole: 'LEADER',
          },
        ],
      },
      proposal: {
        create: {
          title: 'CoursePMS: University Course Project Management Platform',
          problemStatement:
            'University capstone and software engineering courses lack an integrated system to enforce team size limits, prevent duplicate memberships, and manage structured proposal approvals.',
          techStack: 'React 18, TypeScript, Express, Prisma, PostgreSQL',
          repoUrl: 'https://github.com/martinvadre/course-pms',
          status: ProposalStatus.DRAFT,
          revisionCount: 0,
        },
      },
    },
  });

  // Team Beta: Created by Somchai with a private SUBMITTED proposal (used to verify BR-06 cross-team isolation)
  const teamBeta = await customPrisma.projectTeam.create({
    data: {
      name: 'Team Beta',
      courseId: course.id,
      createdById: somchai.id,
      members: {
        create: [
          {
            userId: somchai.id,
            courseId: course.id,
            memberRole: 'LEADER',
          },
        ],
      },
      proposal: {
        create: {
          title: 'SmartLab Equipment Booking & Calibration Tracker',
          problemStatement:
            'Engineering laboratories need a reservation and calibration tracking platform to prevent overlapping bookings on specialized oscilloscopes and 3D printers.',
          techStack: 'React, Node.js, Express, PostgreSQL',
          repoUrl: 'https://github.com/example/smartlab-booking',
          status: ProposalStatus.SUBMITTED,
          submittedAt: new Date(),
          revisionCount: 1,
        },
      },
    },
  });

  return {
    course,
    instructor,
    pawarit,
    tatchakorn,
    somchai,
    suda,
    niran,
    teamAlpha,
    teamBeta,
  };
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeded CoursePMS database successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error seeding database:', err);
      process.exit(1);
    });
}
