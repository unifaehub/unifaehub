import type { Request } from 'express';

export type RequestContext = {
  ipAddress: string | null;
  deviceId: string | null;
  deviceName: string | null;
  userAgent: string | null;
};

function pickHeader(req: Request, name: string): string | null {
  const v = req.headers[name.toLowerCase()];
  if (!v) return null;
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return null;
  return String(s).slice(0, 255);
}

export function getRequestContext(req: Request): RequestContext {
  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  const rawIp =
    ip || req.ip || (req.socket as unknown as { remoteAddress?: string }).remoteAddress || null;
  const ipAddress = rawIp ? String(rawIp).slice(0, 64) : null;

  const deviceId = pickHeader(req, 'x-device-id')?.slice(0, 64) ?? null;
  const deviceName = pickHeader(req, 'x-device-name') ?? null;
  const userAgent = pickHeader(req, 'user-agent') ?? null;
  return { ipAddress, deviceId, deviceName, userAgent };
}

