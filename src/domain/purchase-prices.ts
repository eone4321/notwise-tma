const gameReference = { stars: 1000, quotedGram: 13.72, marketUsdPerGram: 1.0219780219780221 };

// The game rounds up to a cent of GRAM. Use the midpoint of the observed rounding interval for the estimate.
const gameUsdPerStar = (gameReference.quotedGram - 0.005) * gameReference.marketUsdPerGram / gameReference.stars;
const supportUsdPerStar = 0.015;

export function gramFromStars(stars: number, starRate: number, gramRate: number) {
  if (!Number.isFinite(stars) || stars < 0 || !Number.isFinite(starRate) || starRate <= 0 ||
      !Number.isFinite(gramRate) || gramRate <= 0) return null;
  const cents = (stars * starRate * 100) / gramRate;
  if (!Number.isFinite(cents)) return null;
  return Math.ceil(cents) / 100;
}

export function estimateGramForStars(stars: number, gramUsd: number, purpose: 'game' | 'support' = 'game') {
  return gramFromStars(stars, purpose === 'support' ? supportUsdPerStar : gameUsdPerStar, gramUsd);
}
