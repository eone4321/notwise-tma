export type TonRates = Record<string, { prices?: { USD?: number } }>;

export async function tonRates(addresses: string[]): Promise<TonRates> {
  const query = new URLSearchParams({ tokens: addresses.join(','), currencies: 'usd' });
  const response = await fetch('https://tonapi.io/v2/rates?' + query, {
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4200),
  });
  if (!response.ok) throw new Error('TON quotes unavailable');
  return (await response.json()).rates ?? {};
}

export const usdtAddress = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';

// NOT Wise labels native TON (1e9 nanoton) as GRAM in-game.
export async function gramToUsdt() {
  const rates = await tonRates(['ton', usdtAddress]);
  const usd = rates.TON?.prices?.USD;
  const usdt = rates[usdtAddress]?.prices?.USD;
  return usd && usdt && usd > 0 && usdt > 0 ? usd / usdt : null;
}
