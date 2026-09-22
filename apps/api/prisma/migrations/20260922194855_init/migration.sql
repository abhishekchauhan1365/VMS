-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'HOST', 'SECURITY');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('BUSINESS_GUEST', 'VENDOR', 'PERSONNEL', 'GOVT_OFFICIAL', 'INTERVIEW', 'CONTRACT_STAFF', 'DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('VISIT_CREATED', 'VISIT_APPROVED', 'VISIT_REJECTED', 'VISIT_CHECKED_IN', 'VISIT_CHECKED_OUT', 'VISIT_OVERSTAY', 'VISIT_EXPIRED', 'WATCHLIST_ALERT');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "departmentId" TEXT,
    "officeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "company" TEXT,
    "photoUrl" TEXT,
    "isWatchlisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "visitType" "VisitType" NOT NULL,
    "officeId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_guests" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,

    CONSTRAINT "invite_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "inviteId" TEXT,
    "officeId" TEXT NOT NULL,
    "purpose" TEXT,
    "visitType" "VisitType" NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "rejectionReason" TEXT,
    "additionalInfo" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_passes" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_passes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "visitId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "offices_name_key" ON "offices"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "visitors_phone_key" ON "visitors"("phone");

-- CreateIndex
CREATE INDEX "visitors_email_idx" ON "visitors"("email");

-- CreateIndex
CREATE INDEX "invites_hostId_idx" ON "invites"("hostId");

-- CreateIndex
CREATE UNIQUE INDEX "invite_guests_inviteId_visitorId_key" ON "invite_guests"("inviteId", "visitorId");

-- CreateIndex
CREATE INDEX "visits_officeId_status_checkInAt_idx" ON "visits"("officeId", "status", "checkInAt");

-- CreateIndex
CREATE INDEX "visits_hostId_status_idx" ON "visits"("hostId", "status");

-- CreateIndex
CREATE INDEX "visits_status_windowEnd_idx" ON "visits"("status", "windowEnd");

-- CreateIndex
CREATE UNIQUE INDEX "visit_passes_visitId_key" ON "visit_passes"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "visit_passes_tokenHash_key" ON "visit_passes"("tokenHash");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_visitId_idx" ON "audit_logs"("visitId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_guests" ADD CONSTRAINT "invite_guests_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "invites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_guests" ADD CONSTRAINT "invite_guests_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "invites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_passes" ADD CONSTRAINT "visit_passes_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable trigram search for fuzzy visitor name lookup (§4 "Key indexes")
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index for fast fuzzy search on Visitor.fullName
CREATE INDEX "visitors_fullName_trgm_idx" ON "visitors" USING GIN ("fullName" gin_trgm_ops);
