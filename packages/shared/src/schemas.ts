import { z } from 'zod';
import { ROLES, VISIT_TYPES, VISIT_STATUSES } from './enums.js';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const visitorSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
});

export const newGuestSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(20),
  email: z.string().email().optional(),
  company: z.string().trim().max(120).optional(),
});
export type NewGuestInput = z.infer<typeof newGuestSchema>;

export const walkInSchema = z.object({
  visitorId: z.string().optional(),
  visitor: newGuestSchema.optional(),
  hostId: z.string().min(1),
  officeId: z.string().min(1),
  visitType: z.enum(VISIT_TYPES),
  purpose: z.string().trim().max(500).optional(),
  windowStart: z.coerce.date(),
  windowEnd: z.coerce.date(),
});
export type WalkInInput = z.infer<typeof walkInSchema>;

export const rejectVisitSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const inviteGuestRefSchema = z.union([
  z.object({ visitorId: z.string().min(1) }),
  newGuestSchema,
]);

export const createInviteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  visitType: z.enum(VISIT_TYPES),
  officeId: z.string().min(1),
  windowStart: z.coerce.date(),
  windowEnd: z.coerce.date(),
  note: z.string().trim().max(1000).optional(),
  guests: z.array(inviteGuestRefSchema).min(1).max(20),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const verifyPassSchema = z.object({
  token: z.string().min(1),
});

export const listVisitsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  officeId: z.string().optional(),
  status: z.enum(VISIT_STATUSES).optional(),
  visitType: z.enum(VISIT_TYPES).optional(),
  hostId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
export type ListVisitsQuery = z.infer<typeof listVisitsQuerySchema>;

export const updatePolicySchema = z.record(z.string(), z.string());

export const watchlistCreateSchema = z.object({
  phone: z.string().trim().min(6).max(20),
  fullName: z.string().trim().min(1).max(120).optional(),
});

export const auditLogQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  entity: z.string().optional(),
  actorId: z.string().optional(),
});

export { ROLES, VISIT_TYPES, VISIT_STATUSES };
