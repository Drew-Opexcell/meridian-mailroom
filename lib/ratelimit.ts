// in memory, so it's per instance and resets on redeploy or cold start

const DAILY_CAP = Number(process.env.LIVE_DAILY_CAP ?? 25);
const PER_IP_CAP = Number(process.env.LIVE_PER_IP_CAP ?? 3);

interface Bucket {
  dateKey: string;
  global: number;
  perIp: Map<string, number>;
}

const bucket: Bucket = { dateKey: today(), global: 0, perIp: new Map() };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function rollIfNeeded() {
  const d = today();
  if (d !== bucket.dateKey) {
    bucket.dateKey = d;
    bucket.global = 0;
    bucket.perIp.clear();
  }
}

export interface CapState {
  allowed: boolean;
  remaining: number;
  reason?: string;
}

export function checkAndConsume(ip: string): CapState {
  rollIfNeeded();
  if (bucket.global >= DAILY_CAP) {
    return { allowed: false, remaining: 0, reason: "daily live-run cap reached for this demo instance" };
  }
  const used = bucket.perIp.get(ip) ?? 0;
  if (used >= PER_IP_CAP) {
    return { allowed: false, remaining: DAILY_CAP - bucket.global, reason: "per-visitor live-run cap reached" };
  }
  bucket.global += 1;
  bucket.perIp.set(ip, used + 1);
  return { allowed: true, remaining: DAILY_CAP - bucket.global };
}

export function peek(): { remaining: number; dailyCap: number } {
  rollIfNeeded();
  return { remaining: Math.max(0, DAILY_CAP - bucket.global), dailyCap: DAILY_CAP };
}
