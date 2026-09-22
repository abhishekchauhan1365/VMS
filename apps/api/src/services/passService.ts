import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { passRepository } from '../repositories/passRepository.js';

interface PassTokenPayload {
  visitId: string;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Issues an HMAC-signed JWT (the "QR token") plus its sha256 for unique-index lookup, and
 * persists a VisitPass row. O(1) to create; O(1) + O(log n) index lookup to verify later.
 */
export async function issuePass(visitId: string, expiresAt: Date) {
  const token = jwt.sign({ visitId } satisfies PassTokenPayload, env.QR_SIGNING_SECRET, {
    expiresIn: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  });
  const tokenHash = hashToken(token);
  const pass = await prisma.visitPass.create({
    data: { visitId, tokenHash, expiresAt },
  });
  return { pass, token };
}

export interface VerifiedPass {
  visitId: string;
  passId: string;
  tokenHash: string;
}

/** Verifies HMAC signature + single-use + window, WITHOUT mutating state (caller decides). */
export async function verifyPassToken(token: string): Promise<VerifiedPass> {
  let payload: PassTokenPayload;
  try {
    payload = jwt.verify(token, env.QR_SIGNING_SECRET) as PassTokenPayload;
  } catch {
    throw new AppError('PASS_EXPIRED', 'This pass is invalid or expired');
  }

  const tokenHash = hashToken(token);
  const pass = await passRepository.findByTokenHash(tokenHash);
  if (!pass || pass.visitId !== payload.visitId) {
    throw new AppError('NOT_FOUND', 'Pass not found');
  }
  if (pass.usedAt) {
    throw new AppError('PASS_ALREADY_USED', 'This pass has already been used');
  }
  if (pass.expiresAt.getTime() < Date.now()) {
    throw new AppError('PASS_EXPIRED', 'This pass has expired');
  }
  if (pass.visit.windowStart.getTime() > Date.now()) {
    throw new AppError('PASS_NOT_YET_VALID', 'This pass is not valid yet');
  }

  return { visitId: pass.visitId, passId: pass.id, tokenHash: pass.tokenHash };
}

export async function getPublicPassData(token: string) {
  const pass = await passRepository.findByVisitToken(hashToken(token));
  if (!pass) throw new AppError('NOT_FOUND', 'Pass not found');
  return pass;
}
