import { Client } from 'minio';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ROOT_USER,
  secretKey: env.MINIO_ROOT_PASSWORD,
});

let bucketReady: Promise<void> | null = null;

async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(env.MINIO_BUCKET).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(env.MINIO_BUCKET);
  }
}

/** Uploads a visitor photo and returns its public-style URL (kiosk/front-desk display). */
export async function uploadVisitorPhoto(buffer: Buffer, mimeType: string): Promise<string> {
  bucketReady ??= ensureBucket();
  await bucketReady;

  const ext = mimeType.split('/')[1] ?? 'jpg';
  const objectName = `visitors/${randomUUID()}.${ext}`;
  await minioClient.putObject(env.MINIO_BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': mimeType,
  });
  const protocol = env.MINIO_USE_SSL ? 'https' : 'http';
  return `${protocol}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${env.MINIO_BUCKET}/${objectName}`;
}
