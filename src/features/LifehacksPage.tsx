import { useState } from 'react';
import skills from '../../public/data/skills.json';
import { GameArt } from '../ui/GameArt';
import { DetailLink } from '../ui/DetailLink';
import { lightHaptic } from '../telegram/client';
import { useGuideLocale } from './guideLocale';

type HackCategory = 'all' | 'combat' | 'farm' | 'sp' | 'market' | 'rare';

type Lifehack = {
  id: string;
  category: Exclude<HackCategory, 'all'>;
  tag: [ru: string, en: string];
  icon: string;
  title: [ru: string, en: string];
  summary: [ru: string, en: string];
  lines: [ru: string[], en: string[]];
  link?: { to: string; label: [ru: string, en: string] };
};

const categories: { id: HackCategory; label: [ru: string, en: string] }[] = [
  { id: 'all', label: ['Все', 'All'] },
  { id: 'farm', label: ['Фарм и $NOT', 'Farm & $NOT'] },
  { id: 'combat', label: ['Бои и PvP', 'Combat & PvP'] },
  { id: 'sp', label: ['SP и прокачка', 'SP & Leveling'] },
  { id: 'market', label: ['Маркет и экономия', 'Market & Economy'] },
  { id: 'rare', label: ['Редкое и ценное', 'Rare & Valuable'] },
];

const lifehacks: Lifehack[] = [
  // === Combat & PvP Lifehacks (R5a, verified against main-DRt0h3uX.js) ===
  {
    id: 'all-5-spells-pierce',
    category: 'combat',
    tag: ['Бои · Навыки', 'Combat · Skills'],
    icon: '/game/skills/1.png',
    title: [
      'Все 5 боевых заклинаний бьют сквозь блок и уклонение',
      'All 5 direct attack spells pierce both block & dodge',
    ],
    summary: [
      'Lightning, Snowball, Fireball, Asteroid и Desperate Throw попадают даже при максимальном шансе уклонения в 70%.',
      'Not just Lightning: Snowball, Fireball, Asteroid & Desperate Throw also bypass 70% dodge and block.',
    ],
    lines: [
      [
        'Все 5 прямых заклинаний проходят сквозь блок и уклонение, включая уклонение от ловкости.',
        'Остановить их может только «Phase Shift», а «Nutshell Aegis» снижает входящий урон.',
        'Исключение — «Berserk Howl»: это серия физических ударов, поэтому её можно заблокировать или от неё увернуться.',
      ],
      [
        'All 5 direct spells bypass block and dodge, including Agility-based dodge.',
        'Only Phase Shift blocks them completely, while Nutshell Aegis reduces their damage.',
        'Berserk Howl is the exception: it fires physical hits that respect block and dodge.',
      ],
    ],
    link: { to: '/combat', label: ['Все навыки боя', 'All combat skills'] },
  },
  {
    id: 'super-streak-no-timer',
    category: 'combat',
    tag: ['Бои · Серия', 'Combat · Streak'],
    icon: '/game/skills/17.png',
    title: [
      'Счётчик Супер-серии (3 удара) не сгорает по времени',
      'Super Streak counter (3 hits) never expires over time',
    ],
    summary: [
      'Набрал 2 попадания подряд — не бей наугад в блок, дождись открытой зоны.',
      'Sitting at 2/3 clean hits? Hold your swing until an open zone is guaranteed.',
    ],
    lines: [
      [
        'Счётчик серии сбрасывается только при промахе в блок, уклонении врага или «Phase Shift».',
        'Таймера сгорания у серии нет — можно выждать «Spirit Guidance» или зажать блок врага «Crippling Chains».',
        '3-й чистый удар гарантированно запускает серию из 4 атак (200% урона) и оглушение на 1,5с.',
      ],
      [
        'Your streak counter resets only on a blocked hit, enemy dodge, or Phase Shift.',
        'There is zero timer decay—wait for Spirit Guidance or lock their guard with Crippling Chains.',
        'Landing the 3rd clean hit triggers an unblockable 4-hit flurry (200% damage) + 1.5s stun.',
      ],
    ],
  },
  {
    id: 'super-streak-quad-proc',
    category: 'combat',
    tag: ['Бои · Комбо', 'Combat · Combo'],
    icon: '/game/skills/18.png',
    title: [
      'Вампиризм, Эхо и Щит срабатывают ×4 на Супер-серии',
      'Vampire Fang, Echo & Static Shield proc 4× on Super Streak',
    ],
    summary: [
      'Каждый из 4 ударов супер-серии отдельно активирует отхил, эхо-удар и отражение.',
      'Every one of the 4 flurry hits independently triggers lifesteal, echo, and damage reflection.',
    ],
    lines: [
      [
        'Включай «Vampire Fang» или «Echoing Blow» прямо перед своим 3-м попаданием — бонус сработает на все 4 удара комбо.',
        'Если видишь, что враг вот-вот пробьёт 3-й удар серии, жми «Static Shield» — он отразит урон от всех 4 ударов подряд.',
      ],
      [
        'Activate Vampire Fang or Echoing Blow right before your 3rd clean hit to proc across all 4 flurry hits.',
        'If the opponent is at 2/3 streak stacks, pop Static Shield to reflect all 4 flurry hits back at them.',
      ],
    ],
  },
  {
    id: 'evade-saved-by-block',
    category: 'combat',
    tag: ['Бои · Защита', 'Combat · Defense'],
    icon: '/game/skills/8.png',
    title: [
      'Заряды «Evada Kedabra» не тратятся, если удар попал в твой блок',
      'Evada Kedabra charges are saved when you block the hit',
    ],
    summary: [
      'Продолжай менять зону блока даже под активным «Evada Kedabra».',
      'Keep switching your guard zone even while Evada Kedabra is active.',
    ],
    lines: [
      [
        'Игра сначала проверяет совпадение зоны блока, и только если блок не угадал — списывает заряд «Evada Kedabra».',
        'Блок в нужной зоне сохраняет 1⁠–⁠3 заряда «Evada Kedabra» на следующие удары врага.',
      ],
      [
        'The engine checks your guard zone BEFORE consuming an Evada Kedabra charge.',
        'Every attack you block preserves your 1⁠–⁠3 evade charges for subsequent unblocked swings.',
      ],
    ],
  },
  {
    id: 'tier5-cast-lock',
    category: 'combat',
    tag: ['Бои · Тайминг', 'Combat · Timing'],
    icon: '/game/skills/16.png',
    title: [
      'Окно 2 секунд после ульты 5-го тира: как наказывать и не подставляться',
      'The 2-second Tier-5 cast lock: how to punish and avoid self-traps',
    ],
    summary: [
      '«Lightning», «Snowball», «Fireball» и «Asteroid» на 2с замораживают твою атаку и смену блока.',
      'Tier-5 ultimates lock your own attack and guard switching for 2.0 seconds after cast.',
    ],
    lines: [
      [
        'Никогда не жми ульту 5-го тира в чужой «Phase Shift» (0 урона — потеряешь 125 маны и 2с блока защиты). «Nutshell Aegis» снижает урон ульты на 15%⁠–⁠33%, а «Static Shield» отражает только физические удары и супер-серию.',
        'Когда враг нажал ульту, его блок замирает на 2с — сразу бей в открытую зону или включай «Berserk Howl».',
      ],
      [
        'Never fire a Tier-5 ultimate into enemy Phase Shift (0 damage, wasting 125 mana + 2s guard lock). Nutshell Aegis cuts Tier-5 damage by 15%⁠–⁠33%, whereas Static Shield only reflects physical/super-streak hits.',
        'When the enemy casts a Tier-5 spell, their guard is frozen for 2s—punish their open zone with Berserk Howl.',
      ],
    ],
  },
  {
    id: 'damage-cap-35-aegis',
    category: 'combat',
    tag: ['Бои · Математика', 'Combat · Math'],
    icon: '/game/skills/4.png',
    title: [
      'Потолок 35% HP за удар и секрет «Nutshell Aegis»',
      '35% Max HP single-hit cap & Nutshell Aegis damage order',
    ],
    summary: [
      'Обычный удар сначала режется до 35% макс. HP цели, и только потом «Nutshell Aegis» снимает ещё до 33%.',
      'Single hits are clamped to 35% Max HP BEFORE Nutshell Aegis reduces them by another 15%⁠–⁠33%.',
    ],
    lines: [
      [
        'Не объединяй крит ×2, «Power Punch» и «Double Down» ×5 на одном ударе — всё выше 35% HP цели просто сгорит.',
        'Танкам с «Nutshell Aegis» ставь кольца Мудрости (колец Выносливости в игре нет, а щит тратит 8 маны за каждый удар).',
      ],
      [
        'Avoid over-stacking Crit ×2 + Power Punch + Double Down ×5 on a single swing—damage above 35% enemy Max HP is discarded.',
        'Pair Nutshell Aegis tanks with Wisdom rings (Endurance rings do not exist in-game, and Aegis costs 8 mana per hit taken).',
      ],
    ],
    link: { to: '/combat/builds', label: ['Калькулятор билдов', 'Build calculator'] },
  },
  {
    id: 'iron-will-super-streak',
    category: 'combat',
    tag: ['Бои · Контрпик', 'Combat · Counter'],
    icon: '/game/skills/19.png',
    title: [
      '«Iron Will» режет даже урон Супер-серии и число тиков яда',
      'Iron Will reduces enemy Super Streak damage & cuts Toxic Spores ticks',
    ],
    summary: [
      'За 2 маны пассивка ослабляет и все 4 удара чужой супер-серии, и длительность станов, и яд.',
      'For just 2 mana per proc, Iron Will weakens enemy 4-hit flurries, stuns, chill, and poison ticks.',
    ],
    lines: [
      [
        'На прокачке «Iron Will» снижает урон и стан вражеской супер-серии до −24%.',
        'Против «Toxic Spores» она уменьшает само количество тиков яда (с 5 до 3 тиков на высоком уровне).',
      ],
      [
        'At high levels, Iron Will cuts both the damage and stun duration of enemy Super Streaks by up to 24%.',
        'Against Toxic Spores, it rounds down the total number of poison ticks (cutting 5 ticks down to 3).',
      ],
    ],
  },
  {
    id: 'poison-starve-and-stun-guard',
    category: 'combat',
    tag: ['Бои · Микроконтроль', 'Combat · Micro'],
    icon: '/game/skills/5.png',
    title: [
      'Как сжечь «Toxic Spores» в 0 урона и блокировать в оглушении',
      'How to burn Toxic Spores for 0 damage & block while stunned',
    ],
    summary: [
      'Яд бьёт только в те окна по 1,5с, когда ты сам нанёс удар; а в стане можно менять блок.',
      'Poison only deals damage during 1.5s windows where you attack; stun never locks your guard.',
    ],
    lines: [
      [
        'Счётчик «Toxic Spores» тикает каждые 1,5с, но урон проходит только если ты атаковал в этом окне — пауза в 1⁠–⁠2 удара сжигает яд впустую.',
        'Под «Stunning Shot», «Asteroid» или станом от серии продолжай менять зону блока — это работает даже при оглушении.',
      ],
      [
        'Toxic Spores ticks every 1.5s and consumes a charge even if you do not attack—pausing your swing for 1⁠–⁠2 ticks burns enemy poison for 0 HP.',
        'While stunned by Stunning Shot, Asteroid, or Super Streak, keep moving your guard every 1.0s—only Crippling Chains locks your block.',
      ],
    ],
  },
  {
    id: 'spell-scaling-owl-level',
    category: 'combat',
    tag: ['Бои · Прокачка', 'Combat · Scaling'],
    icon: '/game/skills/6.png',
    title: [
      'Урон заклинаний и «Healing» растут от Уровня совы, а не от Силы',
      'Spell damage and Healing scale with Owl Level, not Strength',
    ],
    summary: [
      'Очки Силы и кольца Силы усиливают только обычный удар и «Berserk Howl».',
      'Strength points and Strength rings only buff basic physical hits and Berserk Howl.',
    ],
    lines: [
      [
        'Урон Lightning, Snowball, Fireball, Asteroid и Toxic Spores, а также объём Healing растут вместе с уровнем совы.',
        'Магам и контроллерам через «Snowball» (84% винрейта в симуляциях) Сила не нужна — качай Мудрость, Выносливость и Ловкость до 100.',
      ],
      [
        'All spells (Lightning, Snowball, Fireball, Asteroid, Healing, Toxic Spores) scale strictly with owl level base HP.',
        'Spell/control builds (like Snowball control with 84% sim winrate) gain 0 spell damage from Strength—focus on Wisdom, Endurance, and Agility up to 100.',
      ],
    ],
  },

  // === Existing Core Lifehacks (Updated with R7 RU/EN & R8 exact numbers) ===
  {
    id: 'chiller-threshold',
    category: 'sp',
    tag: ['SP и прокачка', 'SP & Leveling'],
    icon: '/game/items/chiller-open.webp',
    title: [
      'Чиллер на границе 5 уровней',
      'Chiller right before 5-level energy cliffs',
    ],
    summary: [
      'Замораживай опыт на ур. 4, 9, 14 или 19 перед скачком цены боя и полёта.',
      'Freeze capsule XP at level 4, 9, 14, or 19 right before fight and flight energy costs jump.',
    ],
    lines: [
      [
        'Каждые 5 уровней цена боя растёт на +10 ⚡ (10 → 20 → 30 → 40…), а полёта — на +50 ⚡.',
        'Открой дверцу Чиллера на ур. 4, 9, 14 или 19: капсулы продолжат давать монеты, предметы и $NOT без опыта.',
        'Важно: если в инвентаре несколько Чиллеров, для разморозки опыта нужно закрыть дверцу у всех.',
      ],
      [
        'Every 5 levels, battle cost increases by +10 ⚡ (10 → 20 → 30 → 40…) and flight cost by +50 ⚡.',
        'Open your Chiller at level 4, 9, 14, or 19: capsules keep paying coins, items, and $NOT with 0 XP.',
        'Note: if you own multiple Chillers, all of them must be closed to resume gaining XP.',
      ],
    ],
    link: { to: '/care', label: ['Таблица стоимости по уровням', 'Level energy cost table'] },
  },
  {
    id: 'farm-stack',
    category: 'farm',
    tag: ['Фарм и $NOT', 'Farm & $NOT'],
    icon: '/game/items/wise-coin.webp',
    title: [
      'Стек бонусов фарма монет (бои и полёт)',
      'Coin farm bonus stack (battles & flights)',
    ],
    summary: [
      'Складывай 4 источника: экипированный скин, заточки, Монтмориллонит и Лига MMR.',
      'Stack 4 sources: equipped skin, enchantments, Montmorillonite, and MMR League.',
    ],
    lines: [
      [
        'Надетый скин (до +40%) + его заточка (+5% за каждый +1, до +100%).',
        'Заточка 3 колец (+5% за каждый +1 на каждом кольце) + Монтмориллонит (+10%) + Лига MMR (+1%…+13%).',
        'Бонус увеличивает добычу монет в боях и полётах (на фиксированные монеты из капсул он не влияет).',
      ],
      [
        'Equipped skin (up to +40%) + skin enchant (+5% per +1, up to +100%).',
        '3 enchanted rings (+5% per +1 on each ring) + Montmorillonite (+10%) + MMR League (+1%…+13%).',
        'Applies to gold coins earned in PvP battles and flights (guaranteed capsule coins use a separate level formula).',
      ],
    ],
    link: { to: '/owl/skins', label: ['Калькулятор скинов', 'Skin calculator'] },
  },
  {
    id: 'gold-capsules-not',
    category: 'farm',
    tag: ['Фарм и $NOT', 'Farm & $NOT'],
    icon: '/game/capsules/gold.webp',
    title: [
      'Охота за $NOT — Золотые капсулы',
      'Hunting for $NOT — Golden Capsules',
    ],
    summary: [
      'Базовый шанс дропа $NOT в Золотой капсуле в 5× выше Обсидиановой.',
      'Base $NOT drop odds in Golden Capsules are 5× higher than Obsidian.',
    ],
    lines: [
      [
        'Обсидиановая капсула (4ч) удобна для быстрого оборота опыта и ежедневных квестов.',
        'Если цель — выбить крупные пулы $NOT, открывай Золотые капсулы (множитель ×5) и качай уровень капсул.',
      ],
      [
        'Obsidian capsules (4h) are great for fast turnover and daily quests.',
        'When targeting $NOT drops, prioritize Golden capsules (5× base multiplier) and upgrade your capsule level.',
      ],
    ],
    link: { to: '/capsules', label: ['Шансы капсул', 'Capsule odds'] },
  },
  {
    id: 'squad-shop-economy',
    category: 'market',
    tag: ['Экономия', 'Economy'],
    icon: '/game/items/morpher.webp',
    title: [
      'Лавка сквада в разы выгоднее обычной',
      'Squad Shop is vastly cheaper than the regular shop',
    ],
    summary: [
      'Покупай Морфер, Чиллер, Зажигалку и заточки за серебро сквада.',
      'Buy Morpher, Chiller, Lighter, and Enchanters with squad silver.',
    ],
    lines: [
      [
        'Заточка кольца за 500 серебра даёт +1 к стату и +5% к фарму (в 10× выгоднее Заточки скина за 5 000 серебра!).',
        'Чиллер стоит 25 000 серебра вместо 100 000 монет, а Морфер — 5 000 серебра вместо 250 Stars.',
        'Зажигалка на 10 дней ритуалов обходится в 2 500 серебра вместо 5 000 золотых монет.',
      ],
      [
        'Ring Enchanter at 500 silver gives +1 stat AND +5% farm (10× more silver-efficient than Skin Enchanter at 5,000 silver!).',
        'Chiller costs 25,000 silver instead of 100,000 gold coins; Morpher costs 5,000 silver instead of 250 Stars.',
        'A 10-charge Lighter costs 2,500 silver instead of 5,000 gold coins.',
      ],
    ],
    link: { to: '/squads/shop', label: ['Лавка сквада', 'Squad shop'] },
  },
  {
    id: 'enchant-buy-vs-craft',
    category: 'market',
    tag: ['Маркет', 'Market'],
    icon: '/game/items/scroll-enchant-ring.webp',
    title: [
      'Безопасная заточка до +3 и расчёт на GetGems',
      '100% safe enchanting up to +3 & GetGems buy-vs-enchant math',
    ],
    summary: [
      'До +3 шанс успеха 100% (3 кольца +3 = +9 статов и +45% фарма без риска!).',
      'Up to +3 success is 100% (three +3 rings = +9 stats & +45% farm with zero burn risk!).',
    ],
    lines: [
      [
        'С +4 появляется риск рассыпать предмет в осколки скорлупы: на +4 успех 95% (риск 5%), на +5 — 90%, на +6 — 85% (шаг −5%).',
        'Сначала заточи все 3 рабочих кольца до +3 (всего 4 500 серебра сквада за +45% к фарму).',
        'Для уровней +6 и выше сравнивай себестоимость заточки с готовыми лотами в разделе «Маркет и графики».',
      ],
      [
        'Starting at +4, failed attempts crumble the item into Eggshell Shards: +4 is 95% success (5% burn), +5 is 90%, +6 is 85% (−5% per step).',
        'Always enchant all 3 equipped rings to +3 first (only 4,500 squad silver for +45% coin farm and +9 stats).',
        'For +6 and above, compare self-enchant expected cost against live GetGems listings in Market & Charts.',
      ],
    ],
    link: { to: '/collections/charts', label: ['Маркет и графики', 'Market & charts'] },
  },
  {
    id: 'book-wisdom-buff',
    category: 'sp',
    tag: ['Боевой буст', 'Combat Boost'],
    icon: '/game/items/book.webp',
    title: [
      'Загадка книги перед серией боёв',
      'Solve the Explorer Book riddle right before PvP sessions',
    ],
    summary: [
      '+5 мудрости на 24 часа (= целому Обсидиановому кольцу!) и до ×3 наград за серию.',
      '+5 Wisdom for 24h (equal to an entire Obsidian Ring!) plus up to 3× streak rewards.',
    ],
    lines: [
      [
        '+5 к мудрости дают +100 маны и +3,5% шанса крита на сутки — спасает билды с низкой мудростью от нехватки маны.',
        'Решай загадку прямо перед нападениями и тренировками.',
        'Не ошибайся 3 раза (и не тяни дольше 60 секунд) — иначе книга сгорит.',
      ],
      [
        '+5 Wisdom grants +100 mana and +3.5% crit chance for 24h—curing mana starvation on low-Wisdom builds.',
        'Solve your daily riddle right before starting a raid or ranked session.',
        'Avoid 3 wrong answers (or 60s timeouts), or the book burns.',
      ],
    ],
  },
  {
    id: 'stat-cap-100',
    category: 'sp',
    tag: ['Билды', 'Builds'],
    icon: '/game/items/ring-wit-3.webp',
    title: [
      'Не перекачивай Ловкость и Мудрость выше 100',
      'Never over-cap Agility or Wisdom past 100 points',
    ],
    summary: [
      'Потолок уклонения и крита — 70% ровно на 100 очках (с учётом колец и баффов).',
      'Dodge and Crit hit their 70% hard cap at exactly 100 points (including rings and buffs).',
    ],
    lines: [
      [
        'После 100 очков Ловкость даёт 0% уклонения.',
        'Мудрость выше 100 перестаёт давать крит и добавляет только +20 маны за очко.',
        'Учитывай бафф Книги (+5 мудрости) и баффы земель осад (+1…+2), чтобы не уходить в оверкап.',
      ],
      [
        'Above 100 points, Agility grants 0% additional dodge.',
        'Wisdom above 100 stops adding crit chance and only adds +20 mana per point.',
        'Factor in your +5 Wisdom Book buff and +1..+2 Siege territory buffs so your rings do not push you over 100.',
      ],
    ],
    link: { to: '/combat/builds', label: ['Калькулятор билдов', 'Build calculator'] },
  },
  {
    id: 'sushi-and-rockets',
    category: 'farm',
    tag: ['Полёты', 'Flights'],
    icon: '/game/stickers/42.webp',
    title: [
      'Правило 3-й суши и 3 ракет в полёте',
      'The 3rd Sushi rule & 3 Rockets in a single flight',
    ],
    summary: [
      '3-я суши прибавляет +20% монет и открывает Sushi Master; 3 ракеты → Phoenix.',
      'The 3rd sushi adds +20% coins & unlocks Sushi Master; 3 rockets unlock Phoenix.',
    ],
    lines: [
      [
        '1-я и 2-я суши отнимают по 20% текущего счёта забега (остаётся 64%).',
        '3-я суши прибавляет +20% к остатку (до 76,8%) и навсегда открывает стикер №42 Sushi Master.',
        'Использование 3 ракет возрождения за один полёт открывает секретный стикер №88 Phoenix.',
      ],
      [
        'The 1st and 2nd sushi each subtract 20% of your current run coins (leaving 64%).',
        'Picking up a 3rd sushi adds +20% back (to 76.8%) and unlocks secret sticker #42 Sushi Master.',
        'Using all 3 revive rockets in a single flight unlocks secret sticker #88 Phoenix.',
      ],
    ],
    link: { to: '/secrets', label: ['Все секреты', 'All secrets'] },
  },
  {
    id: 'siege-power-and-rounds',
    category: 'sp',
    tag: ['Осады', 'Sieges'],
    icon: '/game/items/lighter.webp',
    title: [
      'Мощь в осадах и 3 раунда наград',
      'Siege Attack Power & 3-round reward stacking',
    ],
    summary: [
      'Боевая мощь растёт от вложенных SP (Додзё и бои), а не от уровня совы.',
      'Siege power scales from total SP invested (Dojo & battles), not owl level.',
    ],
    lines: [
      [
        'Личная мощь растёт вместе с заработанными SP, а опыт XP на неё не влияет. Сова под Чиллером продолжает копить мощь без роста цены боя.',
        'Награды за удержанные территории выплачиваются в каждом из 3 раундов осады (до 10 500 золота и 2 100 серебра за день).',
      ],
      [
        'Personal siege power grows with your earned SP, while XP does not affect it. An owl frozen with Chiller keeps accumulating siege power without raising battle energy cost.',
        'Territory rewards pay out across all 3 siege rounds per day (up to 10,500 gold and 2,100 squad silver).',
      ],
    ],
    link: { to: '/squads', label: ['Карта осад', 'Siege map'] },
  },
  {
    id: 'seba-cola-bank',
    category: 'market',
    tag: ['Защита', 'Defense'],
    icon: '/game/items/seba-cola.webp',
    title: [
      'Защита крупного баланса через Seba Cola',
      'Protecting 50,000+ coin balances with Seba Cola',
    ],
    summary: [
      'При балансе > 50 000 монет банка за 1 500 окупается с одного отражённого нападения.',
      'Once your balance exceeds 50,000 coins, a 1,500-coin Seba Cola pays for itself in one raid.',
    ],
    lines: [
      [
        'В нападении победитель забирает 3% твоих текущих монет (на 100 000 монет потеряешь сразу 3 000).',
        'Пей Seba Cola только после завершения своих боёв: любая твоя атака мгновенно снимает 24-часовой купол.',
      ],
      [
        'A successful raid steals 3% of your current coin balance (3,000 coins lost on a 100,000 balance).',
        'Drink Seba Cola only after finishing your own fights: attacking anyone immediately breaks the 24h shield.',
      ],
    ],
  },
  {
    id: 'rare-montmorillonite',
    category: 'rare',
    tag: ['Редкий артефакт', 'Rare Artifact'],
    icon: '/game/items/montmorillonite.webp',
    title: [
      'Монтмориллонит — вечное 100% HP и +10% монет',
      'Montmorillonite — permanent 100% HP & +10% coins',
    ],
    summary: [
      'Один из самых недооценённых и полезных артефактов в бою.',
      'One of the most overlooked and useful artifacts in battle.',
    ],
    lines: [
      [
        'Сова постоянно сохраняет полное здоровье — аптечки не нужны, а перед дуэлью HP уже восстановлено.',
        'Даёт постоянный бонус +10% к фарму монет в боях и полётах.',
        'Шанс за открытие яйца: 0,07% (обычное), 0,14% (за 100 ⭐ / 3 000 скорлупы), 0,28% (золотое).',
      ],
      [
        'Your owl keeps full health at all times, so medicine is unnecessary and HP is restored before every duel.',
        'Grants a permanent +10% coin farm bonus in battles and flights.',
        'Chance per egg opening: 0.07% (Mystery), 0.14% (Season/100 ⭐), 0.28% (Golden Mystery).',
      ],
    ],
    link: { to: '/assets/item/montmorillonite', label: ['Карточка предмета', 'Item details'] },
  },
  {
    id: 'rare-golden-jetton',
    category: 'rare',
    tag: ['Топ-редкость', 'Top Rarity'],
    icon: '/game/items/skin-jetton-golden.webp',
    title: [
      'Крафт яиц за осколки скорлупы и распыление лишних предметов',
      'Eggshell Shard arbitrage & Golden Skin Jettons',
    ],
    summary: [
      'Ненужные золотые кольца и повторы дают тысячи осколков скорлупы на крафт Золотого яйца.',
      'Unused rings and duplicate items break into thousands of Eggshell Shards for Golden Egg crafting.',
    ],
    lines: [
      [
        'Распыление в инвентаре возвращает ⌈Цена × (100 + 10×заточка) / 1300⌉ осколков: Золотое кольцо даёт 15 385 осколков скорлупы (+10% за каждый +1)!',
        'В Золотом загадочном яйце (15 000 осколков скорлупы) шанс на Скин-жетон в 45× выше обычного яйца, плюс падает Эпический скин-жетон и Заточки.',
      ],
      [
        'Breaking items yields ⌈BasePrice × (100 + 10×enchant) / 1300⌉ shards: a Golden Ring breaks into 15,385 shards (+10% per +1 enchant)!',
        'Golden Mysterious Egg (15,000 shards) has a 45× higher Skin Jetton drop rate than basic eggs, plus Epic Jettons and Enchanters.',
      ],
    ],
    link: { to: '/assets/item/eggshell-shards-icon', label: ['Осколки скорлупы', 'Eggshell Shards'] },
  },
];

export function LifehacksPage() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const [cat, setCat] = useState<HackCategory>('all');
  const visible = cat === 'all' ? lifehacks : lifehacks.filter(h => h.category === cat);

  return (
    <div className="lifehacksPage">
      <div className="hScrollFadeViewport">
        <div className="lifehackCats" role="tablist" aria-label={en ? 'Lifehack categories' : 'Категории лайфхаков'}>
          {categories.map(c => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={cat === c.id}
              className={cat === c.id ? 'isActive' : undefined}
              onClick={() => { lightHaptic(); setCat(c.id); }}
            >
              {en ? c.label[1] : c.label[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="lifehackList">
        {visible.map(hack => {
          const lines = en ? hack.lines[1] : hack.lines[0];
          const combatCopy = [...hack.title, ...hack.summary, ...hack.lines.flat()].join(' ');
          const relatedSkills = hack.category === 'combat'
            ? skills.filter(skill => combatCopy.includes(skill.name))
            : [];
          return (
            <details className="card lifehackCard mediaDetails memoCollapsible" key={hack.id}>
              <summary className="memoCollapsibleSummary">
                <div className="lifehackHead">
                  <span className="lifehackIcon">
                    <GameArt path={hack.icon} size={36} />
                  </span>
                  <div className="lifehackTitleWrap">
                    <span className="lifehackTag">{en ? hack.tag[1] : hack.tag[0]}</span>
                    <h2>{en ? hack.title[1] : hack.title[0]}</h2>
                  </div>
                </div>
              </summary>
              <div className="memoCollapsibleBody">
                <p className="lifehackSummary">{en ? hack.summary[1] : hack.summary[0]}</p>
                <div className="memoLines lifehackDetails">
                  {lines.map(line => <p key={line}>{line}</p>)}
                </div>
                {hack.category === 'combat' ? (
                  <div className="itemValueLinks">
                    {relatedSkills.map(skill => (
                      <DetailLink key={skill.id} className="itemValueChipLink" to={`/combat/skills/${skill.branch}/${skill.id}`}>
                        <span>{skill.name}</span>
                        <span className="rowChevron" aria-hidden="true" />
                      </DetailLink>
                    ))}
                    {relatedSkills.length === 0 && (
                      <DetailLink className="itemValueChipLink" to="/combat">
                        <span>{en ? 'Combat and skills' : 'Бои и навыки'}</span>
                        <span className="rowChevron" aria-hidden="true" />
                      </DetailLink>
                    )}
                  </div>
                ) : hack.link && (
                  <DetailLink className="textLink lifehackLink" to={hack.link.to}>
                    {en ? hack.link.label[1] : hack.link.label[0]}
                  </DetailLink>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Item value ranking
// ============================================================================

type ValueTier = 'all' | 'S+' | 'S' | 'A' | 'B' | 'C';

type RankedItemEntry = {
  id: string;
  tier: Exclude<ValueTier, 'all'>;
  icon: string;
  title: [ru: string, en: string];
  role: [ru: string, en: string];
  whyValuable: [ru: string[], en: string[]];
  links: { to: string; label: [ru: string, en: string] }[];
};

const tierFilters: { id: ValueTier; label: [ru: string, en: string] }[] = [
  { id: 'all', label: ['Все тиры', 'All Tiers'] },
  { id: 'S+', label: ['Тир S+ · Мета', 'Tier S+ · Meta'] },
  { id: 'S', label: ['Тир S · Ключевые', 'Tier S · Core'] },
  { id: 'A', label: ['Тир A · Выгодные', 'Tier A · High ROI'] },
  { id: 'B', label: ['Тир B · Ситуативные', 'Tier B · Situational'] },
  { id: 'C', label: ['Тир C · Расходники', 'Tier C · Consumables'] },
];

const rankedItems: RankedItemEntry[] = [
  {
    id: 'chiller',
    tier: 'S+',
    icon: '/game/items/chiller-open.webp',
    title: ['Чиллер', 'Chiller'],
    role: ['Останавливает получение опыта из капсул', 'Pauses XP from capsules'],
    whyValuable: [
      [
        'Самый недооценённый стратегический предмет: замораживает опыт из капсул, но сохраняет 100% монет, предметов и шансов на $NOT.',
        'Удерживает сову на ур. 4, 9, 14 или 19, позволяя фармить SP в Додзё и качать мощь для осад без роста стоимости боя (+10 ⚡) и полёта (+50 ⚡).',
        'В Лавке сквада стоит 25 000 серебра вместо 100 000 золотых монет (при распылении даёт 7 693 осколка скорлупы).',
      ],
      [
        'A strategic control item that blocks capsule XP while preserving coin, item, and $NOT drops.',
        'Holds your owl at level 4, 9, 14, or 19 so you can farm Dojo SP and scale siege power without crossing +10 ⚡ fight and +50 ⚡ flight energy cliffs.',
        'Costs 25,000 squad silver in Squad Shop vs 100,000 gold coins (breaks into 7,693 Eggshell Shards).',
      ],
    ],
    links: [{ to: '/assets/item/chiller', label: ['Чиллер в Предметах', 'Chiller in Items'] }],
  },
  {
    id: 'montmorillonite',
    tier: 'S+',
    icon: '/game/items/montmorillonite.webp',
    title: ['Монтмориллонит', 'Montmorillonite'],
    role: ['Вечное 100% здоровье + 10% к фарму', 'Permanent 100% HP + 10% coin farm'],
    whyValuable: [
      [
        'Кроме +10% к монетам, артефакт поддерживает здоровье совы на максимуме.',
        'Навсегда отменяет траты на Подорожник, Пластырь и Аптечку и гарантирует вход в каждый бой с полным запасом HP.',
        'Даёт 76 923 осколка скорлупы при распылении (база 999 999 монет).',
      ],
      [
        'The artifact adds +10% coins and keeps your owl at full health.',
        'Eliminates all medicine expenses (Plantain, Patch, First Aid Kit) forever and guarantees 100% HP going into every fight.',
        'Carries a 76,923 Eggshell Shard break value (999,999 coin base).',
      ],
    ],
    links: [{ to: '/assets/item/montmorillonite', label: ['Монтмориллонит в Предметах', 'Montmorillonite in Items'] }],
  },
  {
    id: 'ring-enchanter',
    tier: 'S+',
    icon: '/game/items/scroll-enchant-ring.webp',
    title: ['Заточка кольца', 'Ring Enchanter'],
    role: ['+1 к боевому стату и +5% к монетам за ступень', '+1 combat stat AND +5% coin farm per level'],
    whyValuable: [
      [
        'В Лавке сквада стоит всего 500 серебра — в 10 раз дешевле Заточки скина (5 000 серебра), но даёт те же +5% к фарму плюс +1 к характеристике!',
        'Заточка до +3 безопасна на 100%: 9 заточек на 3 кольца (4 500 серебра) дают +9 к статам и +45% к фарму монет с нулевым риском.',
        '«Универсальная заточка» пока недоступна. Для колец используй Заточку кольца.',
      ],
      [
        'At 500 squad silver, it is 10× cheaper than Skin Enchanter (5,000 silver) while granting the exact same +5% farm bonus PLUS +1 combat stat!',
        'Enchanting up to +3 is 100% safe: 9 scrolls across 3 rings (4,500 silver) yield +9 stats and +45% coin farm with zero burn risk.',
        'Universal Enchanter is currently unavailable. Use Ring Enchanter to sharpen rings.',
      ],
    ],
    links: [
      { to: '/assets/item/scroll-enchant-ring', label: ['Заточка кольца', 'Ring Enchanter'] },
      { to: '/assets/item/enchanter', label: ['Универсальная заточка (не подтверждена)', 'Universal Enchanter (unconfirmed)'] },
    ],
  },
  {
    id: 'golden-rings',
    tier: 'S+',
    icon: '/game/items/ring-wit-3.webp',
    title: ['Золотые и Обсидиановые кольца (Мудрость / Ловкость / Сила)', 'Golden & Obsidian Rings (Wisdom / Agility / Strength)'],
    role: ['До +30 стата и +100% фарма в одном слоте (3 слота)', 'Up to +30 stat & +100% farm per slot (3 slots)'],
    whyValuable: [
      [
        'Кольца повышают Мудрость, Ловкость или Силу.',
        'Кольцо мудрости — тихий фаворит почти для всех сборок: +10 базово (Золотое) даёт +200 маны на прокаст Тир-4/5 скиллов и +7% крита.',
        'Даже ненужное Золотое кольцо при распылении даёт 15 385 осколков скорлупы (хватает сразу на Золотое загадочное яйцо!).',
      ],
      [
        'Rings boost Wisdom, Agility, or Strength.',
        'Golden Ring of Wisdom (+10 base WIS) is the silent MVP for most builds, adding +200 mana to fund Tier-4/5 skills and Nutshell Aegis plus +7% crit.',
        'Even an unused Golden Ring breaks into 15,385 Eggshell Shards (enough to craft a Golden Mysterious Egg immediately!).',
      ],
    ],
    links: [
      { to: '/assets/item/ring-wit-3', label: ['Золотое кольцо мудрости', 'Golden Ring of Wisdom'] },
      { to: '/assets/item/ring-ag-3', label: ['Золотое кольцо ловкости', 'Golden Ring of Agility'] },
      { to: '/assets/item/ring-str-3', label: ['Золотое кольцо силы', 'Golden Ring of Strength'] },
    ],
  },
  {
    id: 'morpher',
    tier: 'S',
    icon: '/game/items/morpher.webp',
    title: ['Морфер', 'Morpher'],
    role: ['Полный сброс статов и навыков со 100% сохранением SP', 'Full stat & skill respec with 100% SP retention'],
    whyValuable: [
      [
        'Возвращает все очки характеристик и все SP, потраченные на прокачку навыков, без штрафа (в отличие от Фласки и Дискеты с налогом 50%).',
        'Позволяет качаться на старте через простые скиллы, а на 20+ уровне пересобрать чистый мета-билд ровно под капы 100 Ловкости/Мудрости.',
        'Покупай только в Лавке сквада за 5 000 серебра (экономия 250 Telegram Stars).',
      ],
      [
        'Refunds every attribute point and 100% of SP invested in skill levels with zero tax (unlike Flasks/Floppies which burn 50%).',
        'Lets you level smoothly with early skills, then respec at level 20+ into an exact cap-optimized meta build (<=100 AGI/WIS).',
        'Always buy in Squad Shop for 5,000 silver instead of spending 250 Telegram Stars.',
      ],
    ],
    links: [{ to: '/assets/item/morpher', label: ['Морфер в Предметах', 'Morpher in Items'] }],
  },
  {
    id: 'book',
    tier: 'S',
    icon: '/game/items/book.webp',
    title: ['Эпическая книга первооткрывателей', 'Epic Book of Explorers'],
    role: ['Ежедневный бафф +5 Мудрости на 24ч и серия ×3', 'Daily +5 Wisdom buff for 24h & up to 3× streak loot'],
    whyValuable: [
      [
        'Это не только викторина: +5 Мудрости на сутки дают +100 маны и +3,5% к шансу критического удара — как четвёртое Обсидиановое кольцо.',
        'Серия правильных ответов разгоняет ежедневную награду монетами и XP до ×3 и окупает цену книги (20 000 монет) за несколько дней.',
      ],
      [
        'It is more than trivia: +5 Wisdom for 24 hours gives +100 mana and +3.5% crit chance, like a fourth Obsidian Ring.',
        'Daily answer streaks multiply coin and XP rewards up to 3×, paying back its 20,000 coin cost within days.',
      ],
    ],
    links: [{ to: '/assets/item/book', label: ['Книга в Предметах', 'Book in Items'] }],
  },
  {
    id: 'skins-and-jettons',
    tier: 'S',
    icon: '/game/items/skin-jetton-golden.webp',
    title: ['Золотой / Эпический скин-жетоны, NFT-скин и Заточка скина', 'Golden / Epic Skin Jettons, NFT Skin & Skin Enchanter'],
    role: ['До +40% базового фарма деталей + до +100% заточкой', 'Up to +40% base trait farm + up to +100% from enchanting'],
    whyValuable: [
      [
        'Бонус к фарму даёт только надетый скин; скины в инвентаре бонуса не дают. Максимум без заточки: Золотое оперение (+15%) + Цепь NOT (+10%) + 3 детали по +5% = +40%.',
        'Золотой скин-жетон гарантирует самую ценную деталь — Золотое оперение (+15%) и шанс на Цепь NOT.',
        'Точи скин до +3 (+15% без риска), но только после того, как заточил 3 кольца до +3.',
      ],
      [
        'Only the equipped skin grants a farming bonus; skins in your inventory do not. Max without enchanting: Golden Plumage (+15%) + NOT Chain (+10%) + 3 traits (+15%) = +40%.',
        'Golden Skin Jetton guarantees the highest-value trait—Golden plumage (+15%)—plus a roll for NOT Chain.',
        'Enchant your main skin to +3 (+15% with 0% burn risk) right after finishing three +3 rings.',
      ],
    ],
    links: [
      { to: '/assets/item/skin-jetton-golden', label: ['Золотой скин-жетон', 'Golden Skin Jetton'] },
      { to: '/assets/item/skin-jetton-epic', label: ['Эпический скин-жетон', 'Epic Skin Jetton'] },
      { to: '/assets/item/scroll-enchant-skin', label: ['Заточка скина', 'Skin Enchanter'] },
    ],
  },
  {
    id: 'lighter',
    tier: 'A',
    icon: '/game/items/lighter.webp',
    title: ['Зажигалка (10 зарядов)', 'Lighter (10 charges)'],
    role: ['10 дней ритуалов сквада и 24-часовые баффы статов', '10 days of squad rituals & 24h attribute buffs'],
    whyValuable: [
      [
        'Один предмет за 2 500 серебра сквада (или 5 000 монет) закрывает 10 ежедневных ритуалов подряд (250 серебра в день).',
        'Когда в ритуале участвует ≥50% сквада, все участники получают суточный бафф к боевым характеристикам + прогресс стикера №51.',
      ],
      [
        'A single Lighter for 2,500 squad silver (or 5,000 coins) covers 10 consecutive daily squad rituals (250 silver/day).',
        'When ≥50% of the squad lights the ritual, every member receives a 24h combat stat buff plus progress toward sticker #51.',
      ],
    ],
    links: [{ to: '/assets/item/lighter', label: ['Зажигалка в Предметах', 'Lighter in Items'] }],
  },
  {
    id: 'shards-and-eggs',
    tier: 'A',
    icon: '/game/items/eggshell-shards-icon.webp',
    title: ['Осколки скорлупы и Золотое загадочное яйцо', 'Eggshell Shards & Golden Mysterious Egg'],
    role: ['Гарантированный крафт редких яиц через распыление', 'Pity-system crafting for high-tier eggs via item breaking'],
    whyValuable: [
      [
        'Осколки скорлупы — скрытый арбитраж инвентаря: распыление лишнего Чиллера даёт 7 693 осколка, Обсидианового кольца — 5 154, Золотого — 15 385.',
        'Копи 15 000 осколков скорлупы на Золотое загадочное яйцо: в нём падают Эпический скин-жетон, Заточки скина/кольца и Монтмориллонит (0,28%).',
      ],
      [
        'Shards enable inventory arbitrage: breaking a spare Chiller gives 7,693 shards, Obsidian Ring gives 5,154, and Golden Ring gives 15,385.',
        'Save 15,000 shards for the Golden Mysterious Egg—unlocking Epic Skin Jetton, Skin/Ring Enchanters, and 0.28% Montmorillonite odds.',
      ],
    ],
    links: [
      { to: '/assets/item/eggshell-shards-icon', label: ['Осколки скорлупы', 'Eggshell Shards'] },
      { to: '/owl/red', label: ['Золотое загадочное яйцо', 'Golden Mysterious Egg'] },
    ],
  },
  {
    id: 'seba-cola',
    tier: 'A',
    icon: '/game/items/seba-cola.webp',
    title: ['Seba Cola', 'Seba Cola'],
    role: ['24 часа неуязвимости от нападений и потери 3% монет', '24-hour raid immunity protecting 3% of your coin balance'],
    whyValuable: [
      [
        'Нападение забирает 3% баланса. При запасе от 50 000 монет (например, пока копишь на Золотое кольцо за 200 000 или Монтмориллонит за 1 000 000) Seba Cola за 1 500 монет окупается после одного отражённого нападения.',
      ],
      [
        'A raid takes 3% of your balance. If you hold at least 50,000 coins (for example, while saving 200,000 for a Golden Ring or 1,000,000 for Montmorillonite), a 1,500-coin Seba Cola pays for itself after one blocked raid.',
      ],
    ],
    links: [{ to: '/assets/item/seba-cola', label: ['Seba Cola в Предметах', 'Seba Cola in Items'] }],
  },
  {
    id: 'big-black-clock',
    tier: 'B',
    icon: '/game/items/big-black-clock.webp',
    title: ['Большие чёрные часы', 'Big Black Clock'],
    role: ['+30 дней защиты от голода (стакаются)', '+30 days of hunger immunity (stackable)'],
    whyValuable: [
      [
        'Спасают от 24-часового штрафа голода (×0,5 к монетам, XP и регену), если уезжаешь в отпуск или не заходишь каждые 3 дня.',
        'Часы замораживают таймер, но не снимают уже активный штраф голода. Используй их до того, как сова проголодается.',
      ],
      [
        'Prevents the brutal 24h hunger penalty (0.5× coins, XP, and regen) when going AFK for more than 3 days.',
        'The Clock freezes the timer but does not remove an active hunger penalty. Use it before your owl gets hungry.',
      ],
    ],
    links: [{ to: '/assets/item/big-black-clock', label: ['Часы в Предметах', 'Clock in Items'] }],
  },
  {
    id: 'flask-and-floppy',
    tier: 'B',
    icon: '/game/items/flask-empty.webp',
    title: ['Пустая фласка для SP и Пустая дискета XP', 'Empty SP Flask & Empty XP Floppy'],
    role: ['Упаковка SP и XP в NFT для продажи или переноса (налог 50%)', 'Bottling SP & XP into tradable NFTs (50% conversion tax)'],
    whyValuable: [
      [
        'Для заполнения требуют вдвое больше ресурса, чем вмещают (200k SP → фласка на 100k; 2M SP → фласка на 1M).',
        'При заполнении фласки списываются все свободные SP. Перед этим потрать лишние очки навыков на улучшения или навыки.',
        'Дискета XP полностью сжигает уровень, навыки и SP, возвращая сову в состояние яйца.',
      ],
      [
        'Require 2× the stored amount to fill (200k SP → 100k Half Flask; 2M SP → 1M Full Flask).',
        'Filling an SP Flask spends all unallocated SP. Use any extra skill points on upgrades or skills first.',
        'Filling an XP Floppy burns all current XP, SP, and skills, resetting your owl back into an Egg.',
      ],
    ],
    links: [
      { to: '/assets/item/flask-empty', label: ['Пустая фласка для SP', 'Empty SP Flask'] },
      { to: '/assets/item/floppy-empty', label: ['Пустая дискета XP', 'Empty XP Floppy'] },
    ],
  },
  {
    id: 'food-and-meds',
    tier: 'C',
    icon: '/game/items/pear.webp',
    title: ['Еда и Аптечки (лучшие по соотношению цена / эффект)', 'Food & Medicine (best coin-to-stat efficiency)'],
    role: ['Защита от штрафа голода и лечение HP', 'Preventing the hunger penalty & restoring HP'],
    whyValuable: [
      [
        'Еда: если любимая еда совы — Гусеница или Не Микки (200 монет за 10 сытости), бонус ×2 даёт все 20 сытости всего за 200 монет (вдвое выгоднее Груши и Круассана за 400).',
        'Лекарства: Пластырь (150 монет за +20 HP = 7,5 монет/HP) и Аптечка (400 за +50 HP = 8 монет/HP) выгоднее Подорожника (10 монет/HP).',
      ],
      [
        'Food: if your owl’s favorite food is Caterpillar or Not Mickey (200 coins for 10 satiety), the 2× favorite multiplier fills all 20 satiety for just 200 coins (half the cost of Pear/Croissant).',
        'Medicine: Patch (150 coins for +20 HP = 7.5 coins/HP) and First Aid Kit (400 for +50 HP = 8 coins/HP) beat Plantain (10 coins/HP).',
      ],
    ],
    links: [
      { to: '/assets/item/pear', label: ['Сочная груша', 'Juicy Pear'] },
      { to: '/assets/item/first-aid-kit', label: ['Аптечка', 'First Aid Kit'] },
      { to: '/assets/care', label: ['Вся еда и лекарства', 'All food & medicine'] },
    ],
  },
];

export function ItemValueRankingPage() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const [tier, setTier] = useState<ValueTier>('all');
  const visible = tier === 'all' ? rankedItems : rankedItems.filter(item => item.tier === tier);

  return (
    <div className="itemValuePage">
      <div className="hScrollFadeViewport">
        <div className="lifehackCats" role="tablist" aria-label={en ? 'Item value tiers' : 'Тиры ценности предметов'}>
          {tierFilters.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tier === t.id}
              className={tier === t.id ? 'isActive' : undefined}
              onClick={() => { lightHaptic(); setTier(t.id); }}
            >
              {en ? t.label[1] : t.label[0]}
            </button>
          ))}
        </div>
      </div>

      <p className="itemValueIntro">
        {en
          ? 'This ranking reflects how useful each item is in play. Tap an item link for details.'
          : 'Рейтинг учитывает практическую пользу предмета и ситуации, в которых он помогает. Нажми на предмет, чтобы открыть его в разделе «Предметы».'}
      </p>

      <div className="lifehackList">
        {visible.map(item => {
          const points = en ? item.whyValuable[1] : item.whyValuable[0];
          return (
            <details className="card itemValueCard mediaDetails memoCollapsible" key={item.id}>
              <summary className="memoCollapsibleSummary">
                <div className="itemValueHead">
                  <span className="lifehackIcon">
                    <GameArt path={item.icon} size={36} />
                  </span>
                  <div className="lifehackTitleWrap" style={{ flex: 1 }}>
                    <h2>{en ? item.title[1] : item.title[0]}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="itemValueTierBadge" data-tier={item.tier}>{item.tier}</span>
                      <span className="lifehackTag">{en ? item.role[1] : item.role[0]}</span>
                    </div>
                  </div>
                </div>
              </summary>

              <div className="memoCollapsibleBody">
                <div className="memoLines lifehackDetails">
                  {points.map(line => <p key={line}>{line}</p>)}
                </div>

                <div className="itemValueLinks">
                  {item.links.map(link => (
                    <DetailLink key={link.to} className="itemValueChipLink" to={link.to}>
                      <span>{en ? link.label[1] : link.label[0]}</span>
                      <span className="rowChevron" aria-hidden="true" />
                    </DetailLink>
                  ))}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
