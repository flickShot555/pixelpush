export function isPro(user: { plan: string }) {
  return user.plan === "PRO" || user.plan === "LIFETIME";
}
