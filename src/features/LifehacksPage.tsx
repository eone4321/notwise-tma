import { useState } from 'react';
import { GameArt } from '../ui/GameArt';
import { DetailLink } from '../ui/DetailLink';
import { lightHaptic } from '../telegram/client';

type HackCategory = 'all' | 'farm' | 'sp' | 'market' | 'rare';

type Lifehack = {
  id: string;
  category: Exclude<HackCategory, 'all'>;
  tag: string;
  icon: string;
  title: string;
  summary: string;
  details: string;
  link?: { to: string; label: string };
};

const categories: { id: HackCategory; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'farm', label: 'Фарм и $NOT' },
  { id: 'sp', label: 'SP и бои' },
  { id: 'market', label: 'Маркет и экономия' },
  { id: 'rare', label: 'Редкое и ценное' },
];

const lifehacks: Lifehack[] = [
  {
    id: 'chiller-threshold',
    category: 'sp',
    tag: 'SP и бои',
    icon: '/game/items/chiller.webp',
    title: 'Холодильник XP на границе 5 уровней',
    summary: 'Замораживай опыт на ур. 4, 9, 14 или 19 перед скачком цены боя.',
    details: 'Каждые 5 уровней стоимость одного боя растёт на +10 ⚡ (10 → 20 → 30 → 40…). Если цель — нафармить SP, открой дверцу Холодильника XP прямо перед переходом на новую ступень: капсулы продолжат давать монеты и лут, а бои останутся на ступень дешевле.',
    link: { to: '/care', label: 'Таблица стоимости по уровням' },
  },
  {
    id: 'farm-stack',
    category: 'farm',
    tag: 'Фарм и $NOT',
    icon: '/game/items/wise-coin.webp',
    title: 'Стек бонусов фарма монет',
    summary: 'Складывай 4 источника: скин, заточки, Монтмориллонит и Лига MMR.',
    details: 'Все проценты суммируются: скин + его заточка (+5% за каждый +1), заточка колец (+5% за +1), Монтмориллонит (+10%) и постоянный бонус Лиги MMR (от +1% до +13%). Чем выше суммарный процент, тем быстрее окупаются капсулы и полёты.',
    link: { to: '/owl/skins', label: 'Калькулятор скинов' },
  },
  {
    id: 'gold-capsules-not',
    category: 'farm',
    tag: 'Фарм и $NOT',
    icon: '/game/capsules/gold.webp',
    title: 'Охота за $NOT — Золотые капсулы',
    summary: 'Базовый шанс дропа $NOT в Золотой капсуле в 5× выше Обсидиановой.',
    details: 'Обсидиановая капсула хороша для быстрого оборота, но если цель — выбить $NOT, фокус на Золотые капсулы (множитель ×5 к шансу) и прокачку уровня капсул.',
    link: { to: '/capsules', label: 'Шансы капсул' },
  },
  {
    id: 'squad-shop-economy',
    category: 'market',
    tag: 'Экономия',
    icon: '/game/items/morpher.webp',
    title: 'Лавка сквада в разы выгоднее обычной',
    summary: 'Покупай Морфер, Холодильник XP и заточки за серебро сквада.',
    details: 'В Лавке сквада Холодильник XP стоит 25 000 серебра вместо 100 000 монет, Морфер — 5 000 серебра вместо Telegram Stars, а Заточка кольца всего 500 серебра. Участвуй в 3 раундах осад, чтобы быстро копить серебро.',
    link: { to: '/squads/shop', label: 'Лавка сквада' },
  },
  {
    id: 'enchant-buy-vs-craft',
    category: 'market',
    tag: 'Маркет',
    icon: '/game/items/scroll-enchant-ring.webp',
    title: 'Безопасная заточка +3 и расчёт на Getgems',
    summary: 'До +3 риск сгорания 0%, с +4 предмет может сломаться — проверяй маркет.',
    details: 'На уровнях +5…+8 шанс сгорания быстро растёт (80% → 70% → 60%…), поэтому математическая себестоимость самостоятельной заточки часто выше цены готового лота на Getgems. Сравнивай в разделе «Маркет и графики».',
    link: { to: '/collections/charts', label: 'Маркет и графики' },
  },
  {
    id: 'book-wisdom-buff',
    category: 'sp',
    tag: 'Боевой буст',
    icon: '/game/items/book.webp',
    title: 'Загадка книги перед серией боёв',
    summary: '+5 мудрости на 24 часа и до ×3 наград за ежедневную серию.',
    details: 'Решай Загадку книги перед рейдами: +5 к мудрости дают +3.5% шанса крита и +100 маны на сутки. Главное — не ошибиться 3 раза, иначе книга уничтожится.',
  },
  {
    id: 'stat-cap-100',
    category: 'sp',
    tag: 'Билды',
    icon: '/game/items/ring-wit-3.webp',
    title: 'Не перекачивай Ловкость и Мудрость выше 100',
    summary: 'Потолок уклонения и крита — 70% ровно на 100 очках.',
    details: 'После 100 очков Ловкость перестаёт давать уклонение, а Мудрость перестаёт повышать шанс крита (даёт только +20 маны за очко). Лишние очки лучше перекинуть в Выносливость (HP) или Силу (урон).',
    link: { to: '/combat/builds', label: 'Калькулятор билдов' },
  },
  {
    id: 'sushi-and-rockets',
    category: 'farm',
    tag: 'Полёты',
    icon: '/game/stickers/9.webp',
    title: 'Правило 3-й суши и 3 ракет в полёте',
    summary: '3-я суши возвращает +20% монет и открывает стикер; 3 ракеты → Phoenix.',
    details: '1-я и 2-я суши снимают по 20% монет забега, зато 3-я даёт +20% к остатку и открывает стикер Sushi Master. А 3 бесплатные ракеты за один полёт (обновляются в 00:00 UTC) открывают секрет Phoenix.',
    link: { to: '/secrets', label: 'Все секреты' },
  },
  {
    id: 'siege-power-and-rounds',
    category: 'sp',
    tag: 'Осады',
    icon: '/game/items/lighter.webp',
    title: 'Мощь в осадах и 3 раунда наград',
    summary: 'Мощь растёт от Додзё и боёв, а не от уровня совы.',
    details: 'Даже сова невысокого уровня может вносить большой вклад в осаду, если активно качает навыки в Додзё и дерётся. Награды за удержанные территории суммируются за все 3 раунда осады (до 10 500 золота и 2 100 серебра).',
    link: { to: '/squads', label: 'Карта осад' },
  },
  {
    id: 'seba-cola-bank',
    category: 'market',
    tag: 'Защита',
    icon: '/game/items/seba-cola.webp',
    title: 'Защита крупного баланса через Seba Cola',
    summary: 'Если копишь > 50 000 монет, купол за 1 500 окупается с одного рейда.',
    details: 'В рейде победитель забирает 3% твоих монет. На балансе 50 000+ одно поражение стоит дороже банки Seba Cola (1 500 монет на 24 ч). Помни: собственная атака сразу снимает купол.',
  },
  {
    id: 'rare-montmorillonite',
    category: 'rare',
    tag: 'Редкий артефакт',
    icon: '/game/items/montmorillonite.webp',
    title: 'Монтмориллонит — вечное 100% HP и +10% монет',
    summary: 'Один из самых ценных артефактов в игре.',
    details: 'Пока экипирован, здоровье совы всегда полное (не тратишь аптечки и тебя сложнее поймать раненым) + постоянный бонус +10% к фарму монет. Шанс выпадения из яиц — всего 0.05%–0.22%, либо покупка за 999 999 монет / Getgems.',
    link: { to: '/collections/charts?slug=montmorillonite', label: 'Цена на Getgems' },
  },
  {
    id: 'rare-golden-jetton',
    category: 'rare',
    tag: 'Топ-редкость',
    icon: '/game/items/skin-jetton-golden.webp',
    title: 'Золотой жетон скина и Большие чёрные часы',
    summary: 'Самые редкие и полезные предметы для долгой игры.',
    details: 'Золотой жетон гарантирует золотое оперение (+15% к монетам) и шанс на Цепь NOT. Большие чёрные часы добавляют сразу 30 дней защиты от голода — идеально, чтобы никогда не ловить штраф ×0.5 к фарму.',
    link: { to: '/collections/charts?slug=skin-jetton-golden', label: 'Флор на Getgems' },
  },
];

export function LifehacksPage() {
  const [cat, setCat] = useState<HackCategory>('all');
  const visible = cat === 'all' ? lifehacks : lifehacks.filter(h => h.category === cat);

  return (
    <div className="lifehacksPage">
      <div className="lifehackCats" role="tablist" aria-label="Категории лайфхаков">
        {categories.map(c => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={cat === c.id}
            className={cat === c.id ? 'isActive' : undefined}
            onClick={() => { lightHaptic(); setCat(c.id); }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="lifehackList">
        {visible.map(hack => (
          <article className="card lifehackCard" key={hack.id}>
            <div className="lifehackHead">
              <span className="lifehackIcon">
                <GameArt path={hack.icon} size={36} />
              </span>
              <div className="lifehackTitleWrap">
                <span className="lifehackTag">{hack.tag}</span>
                <h2>{hack.title}</h2>
              </div>
            </div>
            <p className="lifehackSummary">{hack.summary}</p>
            <p className="lifehackDetails">{hack.details}</p>
            {hack.link && (
              <DetailLink className="textLink lifehackLink" to={hack.link.to}>
                {hack.link.label}
              </DetailLink>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
