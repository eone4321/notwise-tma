import { GameArt } from '../ui/GameArt';
import { tokenMarket } from './marketData';

const labels = { coins: 'Монеты', stars: 'Stars', squad_silver: 'Серебро сквада', gram: 'GRAM', not: '$NOT', shards: 'Осколки скорлупы' };
export type Currency = keyof typeof labels;
const icons = {
  coins: '/game/items/wise-coin.webp',
  squad_silver: '/game/items/wise-coin.webp',
  gram: '/brand/tokens/gram.png',
  not: '/brand/tokens/not.webp',
  shards: '/game/items/eggshell-shards-icon.webp',
};

const dollars = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const smallDollars = new Intl.NumberFormat('ru-RU', { maximumSignificantDigits: 2 });

export function GramUsd({ price: gram }: { price: number }) {
  const { data } = tokenMarket.useSnapshot();
  const quote = data?.items.find(row => row.symbol === 'GRAM');
  const usd = Number(quote?.priceUsd);
  if (!Number.isFinite(usd) || usd <= 0 || quote?.status === 'unavailable') return null;
  const value = gram * usd;
  if (!Number.isFinite(value) || value <= 0) return null;
  return (
    <span className="priceUsdSubtext">
      ≈ {value > 0 && value < 0.01 ? smallDollars.format(value) + ' $' : dollars.format(value)}
    </span>
  );
}

export function Price({
  value,
  currency,
  from,
  approximate,
  withUsd = true,
  usdLayout = 'stack',
}: {
  value: number;
  currency: Currency;
  from?: boolean;
  approximate?: boolean;
  withUsd?: boolean;
  usdLayout?: 'stack' | 'inline';
}) {
  const badge = (
    <span className="priceBadge" data-currency={currency}>
      <span className="sr-only">{labels[currency]}: </span>
      <span className="priceVal">{from ? 'от ' : approximate ? '≈ ' : ''}{value.toLocaleString('ru-RU')}</span>
      {currency === 'stars' ? (
        <span className="priceIcon starIcon" aria-hidden="true">⭐</span>
      ) : (
        <span className={`priceIcon ${currency === 'squad_silver' ? 'silverCoin' : ''}`}>
          <GameArt path={icons[currency]} size={16}/>
        </span>
      )}
    </span>
  );

  if (currency === 'gram' && withUsd && value > 0) {
    return (
      <span className="priceGramBlock" data-layout={usdLayout}>
        {badge}
        <GramUsd price={value}/>
      </span>
    );
  }

  return badge;
}

