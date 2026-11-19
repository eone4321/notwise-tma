const usdPerStar = 0.015;

export function estimateGramForStars(stars: number, gramUsd: number) {
  if (!Number.isFinite(stars) || stars < 0 || !Number.isFinite(gramUsd) || gramUsd <= 0) return null;
  const cents = stars * (usdPerStar * 100) / gramUsd;
  if (!Number.isFinite(cents)) return null;
  return Math.ceil(cents - Number.EPSILON * cents) / 100;
}
