import { createHash } from 'node:crypto';

export const SESSION_COOKIE = process.env.NODE_ENV === 'production'
  ? '__Host-rota_session'
  : 'rota_session';

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function readSessionToken(cookieHeader?: string): string | undefined {
  const entry = cookieHeader?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return entry?.slice(SESSION_COOKIE.length + 1) || undefined;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}
