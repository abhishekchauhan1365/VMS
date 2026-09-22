import type { VisitStatus, VisitType } from '@vms/shared';

export interface Office {
  id: string;
  name: string;
  capacity: number;
}

export interface Visitor {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  company: string | null;
  photoUrl: string | null;
  isWatchlisted: boolean;
}

export interface HostRef {
  id: string;
  name: string;
  email: string;
}

export interface VisitPass {
  id: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface Visit {
  id: string;
  visitorId: string;
  hostId: string;
  inviteId: string | null;
  officeId: string;
  purpose: string | null;
  visitType: VisitType;
  status: VisitStatus;
  requestedAt: string;
  decidedAt: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  windowStart: string;
  windowEnd: string;
  rejectionReason: string | null;
  additionalInfo: string | null;
  version: number;
  visitor: Visitor;
  host: HostRef;
  office: Office;
  decidedBy: HostRef | null;
  pass: VisitPass | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  before: string | null;
  after: string | null;
  at: string;
  actor: { id: string; name: string } | null;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}
