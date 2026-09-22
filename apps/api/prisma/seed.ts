/**
 * Seeds a demo dataset: 3 offices, 6 departments, 1 admin, 3 security, 25 hosts,
 * 2,000 visitors, and 5,000 visits spread over the last 60 days across every
 * VisitStatus and VisitType, so analytics/search/pagination look and perform
 * like a real deployment. Safe to re-run against a fresh database only
 * (unique constraints will reject a second run).
 */
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { PrismaClient, Role, VisitType, VisitStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.join(import.meta.dirname, '..', '..', '..', '.env') });

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Passw0rd!';
const VISIT_TYPES = Object.values(VisitType);
const DAY_MS = 24 * 60 * 60 * 1000;
const SEED_WINDOW_DAYS = 60;

/** Splits an array into fixed-size chunks (keeps bulk inserts under Postgres's parameter limit). */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  const item = items[randomInt(0, items.length - 1)];
  if (item === undefined) throw new Error('pick() called on empty array');
  return item;
}

/** Weighted status distribution so the demo board shows a realistic mix. */
const STATUS_WEIGHTS: Array<[VisitStatus, number]> = [
  [VisitStatus.CHECKED_OUT, 34],
  [VisitStatus.EXPIRED, 16],
  [VisitStatus.CHECKED_IN, 12],
  [VisitStatus.APPROVED, 14],
  [VisitStatus.PENDING_APPROVAL, 12],
  [VisitStatus.REJECTED, 7],
  [VisitStatus.CANCELLED, 5],
];
const STATUS_TABLE: VisitStatus[] = STATUS_WEIGHTS.flatMap(([status, weight]) =>
  Array<VisitStatus>(weight).fill(status),
);

function pickStatus(): VisitStatus {
  return pick(STATUS_TABLE);
}

async function main() {
  console.log('Seeding policies...');
  await prisma.policy.createMany({
    data: [
      { key: 'MAX_PREAPPROVALS_PER_HOST_PER_DAY', value: '5' },
      { key: 'OVERSTAY_MINUTES', value: '480' },
      { key: 'PENDING_APPROVAL_TIMEOUT_MINUTES', value: '30' },
    ],
    skipDuplicates: true,
  });

  console.log('Seeding departments and offices...');
  const departmentNames = ['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Marketing'];
  await prisma.department.createMany({
    data: departmentNames.map((name) => ({ name })),
    skipDuplicates: true,
  });
  const departments = await prisma.department.findMany();

  const officeSeeds = [
    { name: 'Mumbai Goregaon', capacity: 250 },
    { name: 'Bengaluru', capacity: 400 },
    { name: 'Delhi', capacity: 180 },
  ];
  await prisma.office.createMany({ data: officeSeeds, skipDuplicates: true });
  const offices = await prisma.office.findMany();

  console.log('Seeding users (1 admin, 3 security, 25 hosts)...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const adminSeed = { name: 'Ananya Rao', email: 'admin@vms.local', role: Role.ADMIN };
  const securitySeeds = offices.map((office, i) => ({
    name: faker.person.fullName(),
    email: `security${i + 1}@vms.local`,
    role: Role.SECURITY,
    officeId: office.id,
  }));
  const hostSeeds = Array.from({ length: 25 }, (_, i) => {
    const office = offices[i % offices.length];
    const department = departments[i % departments.length];
    return {
      name: faker.person.fullName(),
      email: `host${i + 1}@vms.local`,
      role: Role.HOST,
      officeId: office?.id ?? null,
      departmentId: department?.id ?? null,
    };
  });

  await prisma.user.createMany({
    data: [adminSeed, ...securitySeeds, ...hostSeeds].map((u) => ({
      ...u,
      passwordHash,
      phone: faker.phone.number({ style: 'international' }),
    })),
    skipDuplicates: true,
  });

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@vms.local' } });
  const securityUsers = await prisma.user.findMany({ where: { role: Role.SECURITY } });
  const hosts = await prisma.user.findMany({ where: { role: Role.HOST } });
  void admin;
  void securityUsers;

  console.log('Seeding 2,000 visitors...');
  const visitorRows = Array.from({ length: 2000 }, (_, i) => {
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    return {
      fullName: `${first} ${last}`,
      // Deterministic + unique so re-runs within the same DB never collide.
      phone: `+91 9${String(i).padStart(9, '0')}`,
      email: faker.datatype.boolean(0.7)
        ? faker.internet.email({ firstName: first, lastName: last }).toLowerCase()
        : null,
      company: faker.datatype.boolean(0.6) ? faker.company.name() : null,
      isWatchlisted: faker.datatype.boolean(0.02),
    };
  });
  for (const batch of chunk(visitorRows, 1000)) {
    await prisma.visitor.createMany({ data: batch, skipDuplicates: true });
  }
  const visitors = await prisma.visitor.findMany({ select: { id: true } });

  console.log('Seeding invites (pre-approvals)...');
  const now = Date.now();
  const inviteRows = Array.from({ length: 600 }, () => {
    const host = pick(hosts);
    const office = offices.find((o) => o.id === host.officeId) ?? pick(offices);
    const dayOffset = randomInt(0, SEED_WINDOW_DAYS);
    const start = new Date(now - dayOffset * DAY_MS);
    start.setHours(randomInt(8, 17), pick([0, 15, 30, 45]), 0, 0);
    const end = new Date(start.getTime() + randomInt(1, 4) * 60 * 60 * 1000);
    return {
      hostId: host.id,
      title: faker.company.buzzPhrase(),
      visitType: pick(VISIT_TYPES),
      officeId: office.id,
      windowStart: start,
      windowEnd: end,
      note: faker.datatype.boolean(0.4) ? faker.lorem.sentence() : null,
    };
  });
  for (const batch of chunk(inviteRows, 500)) {
    await prisma.invite.createMany({ data: batch });
  }
  const invites = await prisma.invite.findMany({
    select: {
      id: true,
      hostId: true,
      officeId: true,
      visitType: true,
      windowStart: true,
      windowEnd: true,
    },
  });

  console.log('Linking guests to invites...');
  const inviteGuestRows = invites.flatMap((invite) => {
    const guestCount = randomInt(1, 3);
    const chosen = new Set<string>();
    while (chosen.size < guestCount) {
      chosen.add(pick(visitors).id);
    }
    return Array.from(chosen).map((visitorId) => ({ inviteId: invite.id, visitorId }));
  });
  for (const batch of chunk(inviteGuestRows, 1000)) {
    await prisma.inviteGuest.createMany({ data: batch, skipDuplicates: true });
  }

  console.log('Seeding 5,000 visits across every status and type...');
  type VisitRow = {
    visitorId: string;
    hostId: string;
    inviteId: string | null;
    officeId: string;
    purpose: string | null;
    visitType: VisitType;
    status: VisitStatus;
    requestedAt: Date;
    decidedAt: Date | null;
    decidedById: string | null;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    windowStart: Date;
    windowEnd: Date;
    rejectionReason: string | null;
    version: number;
  };

  const visitRows: VisitRow[] = Array.from({ length: 5000 }, () => {
    const fromInvite = faker.datatype.boolean(0.4) && invites.length > 0;
    const status = pickStatus();
    const host = fromInvite ? undefined : pick(hosts);
    const invite = fromInvite ? pick(invites) : undefined;
    const hostId = invite?.hostId ?? host?.id ?? pick(hosts).id;
    const officeId = invite?.officeId ?? pick(offices).id;
    const visitType = invite?.visitType ?? pick(VISIT_TYPES);
    const visitor = pick(visitors);

    let windowStart: Date;
    let windowEnd: Date;
    if (invite) {
      windowStart = invite.windowStart;
      windowEnd = invite.windowEnd;
    } else {
      const dayOffset = randomInt(0, SEED_WINDOW_DAYS);
      windowStart = new Date(now - dayOffset * DAY_MS);
      windowStart.setHours(randomInt(8, 17), pick([0, 15, 30, 45]), 0, 0);
      windowEnd = new Date(windowStart.getTime() + randomInt(1, 4) * 60 * 60 * 1000);
    }
    const requestedAt = new Date(windowStart.getTime() - randomInt(5, 240) * 60 * 1000);

    let decidedAt: Date | null = null;
    let decidedById: string | null = null;
    let checkInAt: Date | null = null;
    let checkOutAt: Date | null = null;
    let rejectionReason: string | null = null;

    const decider = pick(hosts).id;
    if (status !== VisitStatus.PENDING_APPROVAL) {
      decidedAt = new Date(requestedAt.getTime() + randomInt(1, 30) * 60 * 1000);
      decidedById = decider;
    }
    if (status === VisitStatus.REJECTED) {
      rejectionReason = pick([
        'Host unavailable',
        'Not on the approved list',
        'Insufficient details provided',
        'Security concern',
      ]);
    }
    if (status === VisitStatus.CHECKED_IN || status === VisitStatus.CHECKED_OUT) {
      checkInAt = new Date(windowStart.getTime() + randomInt(-10, 30) * 60 * 1000);
    }
    if (status === VisitStatus.CHECKED_OUT) {
      checkOutAt = new Date((checkInAt as Date).getTime() + randomInt(20, 300) * 60 * 1000);
    }

    return {
      visitorId: visitor.id,
      hostId,
      inviteId: invite?.id ?? null,
      officeId,
      purpose: faker.datatype.boolean(0.5) ? faker.lorem.sentence() : null,
      visitType,
      status,
      requestedAt,
      decidedAt,
      decidedById,
      checkInAt,
      checkOutAt,
      windowStart,
      windowEnd,
      rejectionReason,
      version: status === VisitStatus.PENDING_APPROVAL ? 0 : randomInt(1, 3),
    };
  });

  const insertedVisitIds: string[] = [];
  for (const batch of chunk(visitRows, 500)) {
    const created = await prisma.visit.createManyAndReturn({
      data: batch,
      select: { id: true },
    });
    insertedVisitIds.push(...created.map((v) => v.id));
  }

  console.log('Seeding visit passes for approved/checked-in/checked-out visits...');
  const visitsNeedingPasses = await prisma.visit.findMany({
    where: {
      status: { in: [VisitStatus.APPROVED, VisitStatus.CHECKED_IN, VisitStatus.CHECKED_OUT] },
    },
    select: { id: true, windowEnd: true, checkInAt: true, status: true },
  });
  const passRows = visitsNeedingPasses.map((v) => ({
    visitId: v.id,
    tokenHash: crypto.createHash('sha256').update(`${v.id}:${crypto.randomUUID()}`).digest('hex'),
    expiresAt: v.windowEnd,
    usedAt: v.status === VisitStatus.APPROVED ? null : v.checkInAt,
  }));
  for (const batch of chunk(passRows, 1000)) {
    await prisma.visitPass.createMany({ data: batch, skipDuplicates: true });
  }

  console.log('Seeding audit log timeline entries...');
  const decidedVisits = await prisma.visit.findMany({
    where: { status: { not: VisitStatus.PENDING_APPROVAL } },
    select: {
      id: true,
      status: true,
      decidedById: true,
      decidedAt: true,
      checkInAt: true,
      checkOutAt: true,
      requestedAt: true,
    },
  });
  const auditRows = decidedVisits.flatMap((v) => {
    const rows: Array<{
      actorId: string | null;
      action: string;
      entity: string;
      entityId: string;
      visitId: string;
      before: string;
      after: string;
      at: Date;
    }> = [
      {
        actorId: v.decidedById,
        action: v.status === VisitStatus.REJECTED ? 'VISIT_REJECTED' : 'VISIT_DECIDED',
        entity: 'Visit',
        entityId: v.id,
        visitId: v.id,
        before: VisitStatus.PENDING_APPROVAL,
        after: v.status,
        at: v.decidedAt ?? v.requestedAt,
      },
    ];
    if (v.checkInAt) {
      rows.push({
        actorId: null,
        action: 'VISIT_CHECKED_IN',
        entity: 'Visit',
        entityId: v.id,
        visitId: v.id,
        before: 'APPROVED',
        after: 'CHECKED_IN',
        at: v.checkInAt,
      });
    }
    if (v.checkOutAt) {
      rows.push({
        actorId: null,
        action: 'VISIT_CHECKED_OUT',
        entity: 'Visit',
        entityId: v.id,
        visitId: v.id,
        before: 'CHECKED_IN',
        after: 'CHECKED_OUT',
        at: v.checkOutAt,
      });
    }
    return rows;
  });
  for (const batch of chunk(auditRows, 1000)) {
    await prisma.auditLog.createMany({ data: batch });
  }

  console.log('\nSeed complete:');
  console.log(`  offices:      ${offices.length}`);
  console.log(`  departments:  ${departments.length}`);
  console.log(`  users:        ${1 + securitySeeds.length + hostSeeds.length}`);
  console.log(`  visitors:     ${visitors.length}`);
  console.log(`  invites:      ${invites.length}`);
  console.log(`  visits:       ${insertedVisitIds.length}`);
  console.log(`  visit passes: ${passRows.length}`);
  console.log(`  audit logs:   ${auditRows.length}`);
  console.log(`\nDemo login password for every seeded user: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
