export function programReach(value: number, referenceTotal: number) {
  const count = Number.isFinite(value) ? Math.max(0, value) : 0;
  const total = Number.isFinite(referenceTotal) ? Math.max(0, referenceTotal) : 0;
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return { percentage, ringPercentage: Math.min(100, percentage), excess: Math.max(0, count - total) };
}
