import { battleStats, skillHpMultiplier } from '../domain/combat';
import { GameAttribute, GameGlyph } from '../ui/GameGlyph';
import { GameSymbol } from '../ui/GameSymbol';
import { useGuideLocale } from './guideLocale';
import levels from './skill-levels.json';

const formats = ['ru-RU', 'en-US'].map(locale => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }));
const healthEffects = new Set(['strike', 'heal', 'chill', 'desperate', 'meteor', 'poison', 'burn']);
const effectLabels: Record<string, [string, string]> = {
  heal: ['Лечение', 'Healing'], poison: ['Урон за атаку врага', 'Damage per enemy attack'],
  reflect: ['Отражение', 'Reflection'], empower: ['Усиление удара', 'Hit bonus'],
  shield: ['Снижение урона', 'Damage reduction'], evade: ['Уклонений', 'Dodges'], flurry: ['Ударов', 'Hits'],
  cleanse: ['Ослабление эффектов', 'Effect reduction'], lifesteal: ['Лечение от урона', 'Lifesteal'],
  gamble: ['Шанс ×5', '×5 chance'], echo: ['Дополнительный урон', 'Extra damage'],
};

export function skillEffect(id: number, level: number, owlLevel: number, lang = 0) {
  const { type, value, dur, ...extra } = levels[String(id) as keyof typeof levels];
  const amount = value[level - 1];
  const duration = dur[level - 1];
  const multiplier = skillHpMultiplier(owlLevel);
  const format = (number: number) => formats[lang].format(number);
  const HP = ' HP';
  const seconds = lang ? ' s' : 'с';
  const rows: [string, string][] = [];
  const frac = amount - Math.floor(amount);
  const countRange = frac < 0.05 ? String(Math.floor(amount)) : frac > 0.95 ? String(Math.ceil(amount)) : `${Math.floor(amount)}–${Math.ceil(amount)}`;
  if (amount) {
    const hpVal = amount * multiplier;
    const main = healthEffects.has(type) ? format(hpVal >= 10 ? Math.round(hpVal) : hpVal) + HP :
      type === 'evade' || type === 'flurry' ? countRange : Math.trunc(amount) + '%';
    rows.push([(effectLabels[type] ?? ['Базовый урон', 'Base damage'])[lang], main]);
  }
  if ('dps' in extra) {
    const dpsVal = extra.dps[level - 1] * multiplier;
    rows.push([lang ? 'Burn' : 'Поджог', format(dpsVal >= 10 ? Math.round(dpsVal) : dpsVal) + (lang ? ' HP/s' : ' HP/с')]);
  }
  if (duration) rows.push([type === 'poison' ? (lang ? 'Triggers' : 'Срабатываний') : (lang ? 'Duration' : 'Длительность'),
    type === 'poison' ? String(Math.round(duration)) : format(duration) + seconds]);
  return rows;
}

export function BattleReadout({ stats }: { stats: ReturnType<typeof battleStats> }) {
  const { locale } = useGuideLocale();
  const lang = locale === 'en' ? 1 : 0;
  const format = (value: number) => formats[lang].format(value);
  const tiles = [
    [<GameSymbol name="heart" size={19}/>, 'Здоровье', 'Health', format(stats.health) + ' HP'],
    [<GameSymbol name="bolt" size={19}/>, 'Мана', 'Mana', format(stats.mana)],
    [<GameSymbol name="swords" size={19}/>, 'Удар', 'Hit', format(stats.hit) + ' HP'],
    [<GameAttribute name="agility"/>, 'Уклонение', 'Dodge', format(stats.dodge) + '%'],
    [<GameGlyph name="sparkles"/>, 'Крит ×2', 'Crit ×2', format(stats.crit) + '%'],
  ] as const;
  return <dl className="buildReadout" aria-label={lang ? 'Combat stats' : 'Боевые параметры'}>
    {tiles.map(([icon, ru, en, value]) => <div key={ru}><dt>{icon}{lang ? en : ru}</dt><dd>{value}</dd></div>)}
  </dl>;
}
