function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function isTrialActive(user: { trialEndsAt?: string | Date | null }, now = new Date()): boolean {
  const endsAt = toDate(user.trialEndsAt);
  if (!endsAt) return false;
  return endsAt.getTime() > now.getTime();
}

export function isPro(user: { plan: string; trialEndsAt?: string | Date | null }, now = new Date()) {
  if (user.plan === "PRO" || user.plan === "LIFETIME") return true;
  return isTrialActive(user, now);
}
