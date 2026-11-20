import { GameArt } from '../ui/GameArt';
import { useGuideLocale } from './guideLocale';

const labels = {
  coins: ['Монеты', 'Coins'],
  stars: ['Stars', 'Stars'],
  squad_silver: ['Серебро сквада', 'Squad silver'],
  gram: ['GRAM', 'GRAM'],
  not: ['$NOT', '$NOT'],
  shards: ['Осколки скорлупы', 'Eggshell shards'],
} as const;
export type Currency = keyof typeof labels;
const icons = {
  coins: '/game/items/wise-coin.webp',
  squad_silver: '/game/items/wise-coin.webp',
  gram: '/brand/tokens/gram.png',
  not: '/brand/tokens/not.webp',
  shards: '/game/items/eggshell-shards-icon.webp',
};

export function Price({
  value,
  currency,
  from,
  approximate,
}: {
  value: number;
  currency: Currency;
  from?: boolean;
  approximate?: boolean;
}) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  return (
    <span className="priceBadge" data-currency={currency}>
      <span className="sr-only">{labels[currency][en ? 1 : 0]}: </span>
      <span className="priceVal">{from ? (en ? 'from ' : 'от ') : approximate ? '≈ ' : ''}{value.toLocaleString(en ? 'en-US' : 'ru-RU')}</span>
      {currency === 'stars' ? (
        <span className="priceIcon starIcon" aria-hidden="true">⭐</span>
      ) : (
        <span className={`priceIcon ${currency === 'squad_silver' ? 'silverCoin' : ''}`}>
          <GameArt path={icons[currency]} size={16}/>
        </span>
      )}
    </span>
  );
}
