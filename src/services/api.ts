import { ChatResponse, UploadUrlResponse } from '../types';

const BASE_URL = 'https://api.homerepairsus.com';

async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function getUploadUrl(token: string): Promise<UploadUrlResponse> {
  return apiFetch<UploadUrlResponse>('/upload-url', token, { method: 'POST' });
}

export async function uploadImageToS3(uploadUrl: string, imageUri: string): Promise<void> {
  const localRes = await fetch(imageUri);
  const blob = await localRes.blob();

  const s3Res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  });

  if (!s3Res.ok) {
    throw new Error(`S3 upload failed: ${s3Res.status}`);
  }
}

export async function sendSystemMessage(
  token: string,
  message: string,
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/chat', token, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function sendMessage(
  token: string,
  message: string,
  sessionId?: string,
  imageKey?: string,
): Promise<ChatResponse> {
  const body: Record<string, unknown> = { message };
  if (sessionId) body.sessionId = sessionId;
  if (imageKey) body.imageKey = imageKey;

  return apiFetch<ChatResponse>('/chat', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
