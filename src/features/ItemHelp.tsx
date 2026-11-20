import { useId, useLayoutEffect, useRef, useState } from 'react';
import { GameArt } from '../ui/GameArt';
import { useModal } from '../ui/useModal';
import { lightHaptic } from '../telegram/client';
import { GameGlyph } from '../ui/GameGlyph';
import { useGuideLocale } from './guideLocale';

const itemGuide = [
  {
    icon: 'chiller.webp',
    mechanic: ['Открой дверцу в инвентаре, чтобы капсулы перестали начислять опыт. Монеты и предметы продолжают выпадать. Чтобы снова получать опыт, закрой дверцу всех открытых холодильников.', 'Open the door in your inventory to pause XP from capsules. Coins and items still drop. Close every open refrigerator to resume gaining XP.'],
    use: ['Если хочешь остаться на своём уровне, пока тренируешь навыки в Додзе или собираешь ресурсы перед следующим повышением.', 'Use it to stay at your current level while you train skills in the Dojo or gather resources before leveling up.'],
  },
  {
    icon: 'montmorillonite.webp',
    mechanic: ['Пока экипирован, поддерживает полное здоровье совы и добавляет 10% к фарму монет.', 'While equipped, keeps your owl at full health and adds 10% to coin farming.'],
    use: ['Если часто восстанавливаешь здоровье между боями или открываешь много капсул. Сытость проверяется отдельно.', 'Useful if you often restore health between fights or open a lot of capsules. Check satiety separately.'],
  },
  {
    icon: 'morpher.webp',
    mechanic: ['Сбрасывает распределение характеристик и навыки. Очки можно перераспределить, накопленные SP сохраняются.', 'Resets allocated attributes and skills. You can redistribute the points and keep your accumulated SP.'],
    use: ['Когда хочешь сменить стиль боя. Например, вложить очки силы в мудрость, чтобы чаще применять заклинания.', 'Use it when switching play styles. For example, move Strength points into Wisdom to cast more spells.'],
  },
  {
    icon: 'seba-cola.webp',
    mechanic: ['Защищает от рейдов и подбора в соперники на 24 часа. Если сам нападёшь, защита закончится раньше.', 'Protects you from raids and being matched as an opponent for 24 hours. Starting an attack ends the protection early.'],
    use: ['Когда копишь крупную сумму монет. При проигрыше рейда соперник забирает 3% баланса.', 'Use it when saving a large amount of coins. Losing a raid costs 3% of your balance.'],
  },
  {
    icon: 'big-black-clock.webp',
    mechanic: ['Дают 30 дней защиты от голода. Если штраф уже действует, он сохраняется до конца своего таймера.', 'Grant 30 days of hunger protection. An active hunger penalty lasts until its timer runs out.'],
    use: ['Активируй заранее, если надолго оставляешь сову без еды.', 'Activate them in advance if you will be away from your owl for a while.'],
  },
  {
    icon: 'book.webp',
    mechanic: ['На загадку даётся 60 секунд. Верный ответ приносит монеты, опыт и +5 мудрости на сутки. После трёх ошибок книга сгорает.', 'You get 60 seconds for the riddle. A correct answer grants coins, XP and +5 Wisdom for a day. Three mistakes burn the book.'],
    use: ['Реши загадку перед серией боёв, чтобы получить +100 маны и прибавку к шансу крита.', 'Solve the riddle before a series of fights to get 100 extra mana and a higher crit chance.'],
  },
  {
    icon: 'floppy-empty.webp',
    mechanic: ['Выбери объём записи. Понадобится вдвое больше XP, чем сохранит дискета. При записи весь XP, SP и навыки сбрасываются. Сова снова становится яйцом.', 'Choose a capacity. Recording costs twice the XP stored, clears XP, SP and skills, and returns the owl to its egg.'],
    use: ['Чтобы сохранить часть XP перед перерождением. Перед подтверждением проверь, сколько опыта останется на дискете.', 'Use it to keep some XP before starting over. Check how much the disk will hold before confirming.'],
  },
  {
    icon: 'flask-empty.webp',
    mechanic: ['Для записи нужно вдвое больше SP, чем вмещает выбранная колба. При записи списываются все свободные SP.', 'Recording costs twice the SP the flask can hold and spends all unallocated SP.'],
    use: ['Проверь ёмкость перед записью. Если свободных SP заметно больше, чем нужно, сначала распредели лишние очки.', 'Check the capacity before recording. If you have surplus SP, consider spending them first.'],
  },
  {
    icon: 'lighter.webp',
    mechanic: ['Зажигалка содержит 10 зарядов. Одно благословение тратит один заряд. Когда ритуал выполнит половина сквада, участники получают бонус на сутки.', 'The lighter holds 10 charges. One blessing spends one charge. Once half the squad has completed the ritual, its participants get a bonus for a day.'],
    use: ['Договорись со сквадом, чтобы достаточно участников успели выполнить ритуал.', 'Coordinate with your squad so enough members can complete the ritual.'],
  },
] as const;

const ringHelp = {
  mechanic: ['Можно надеть до трёх колец. Заточка прибавляет +1 к атрибуту кольца и +5% к фарму монет за ступень. До +3 успех гарантирован, дальше кольцо может рассыпаться в скорлупу.', 'Equip up to three rings. Each sharpening level adds +1 to the ring’s attribute and +5% coin farming. Sharpening through +3 is guaranteed. Beyond that the ring can break into eggshell shards.'],
  use: ['Выбирай силу для обычных ударов, ловкость для уклонения или мудрость для маны и критов. Навыки открываются за очки, вложенные в ветку.', 'Choose Strength for basic hits, Agility for dodging or Wisdom for mana and crits. Invest points in a branch to unlock its skills.'],
} as const;

const drawerEasing = 'cubic-bezier(0.32, 0.72, 0, 1)';
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ItemHelp({ name, file, art, effect, source }: {
  name: string; file: string; art?: string; effect: string; source?: string;
}) {
  const [open, setOpen] = useState(false);
  const { locale } = useGuideLocale();
  const lang = locale === 'en' ? 1 : 0;
  const isRing = file.startsWith('ring-');
  const info = isRing ? ringHelp : itemGuide.find(item => item.icon === file);
  return <>
    <button className="itemHelpTrigger" type="button" aria-haspopup="dialog"
      aria-label={lang ? `About ${name}` : `О предмете «${name}»`} onClick={() => { lightHaptic(); setOpen(true); }}>
      <GameGlyph name="info"/>
    </button>
    {open && <ItemHelpSheet title={name} art={art ?? '/game/items/' + file}
      mechanic={isRing ? effect + ' ' + ringHelp.mechanic[lang] : info?.mechanic[lang] ?? effect}
      use={info?.use[lang]} source={source}
      lang={lang} onClose={() => setOpen(false)}/>}
  </>;
}

function ItemHelpSheet({ title, art, mechanic, use, source, lang, onClose }: {
  title: string; art: string; mechanic: string; use?: string; source?: string; lang: number; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const animation = useRef<Animation | null>(null);
  const titleId = useId();
  useModal(ref, true);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || reduceMotion()) return;
    animation.current = dialog.animate([{ translate: '0 100%' }, { translate: '0 0' }],
      { duration: 500, easing: drawerEasing });
    return () => animation.current?.cancel();
  }, []);

  function close() {
    const dialog = ref.current;
    if (!dialog || dialog.dataset.closing) return;
    const from = getComputedStyle(dialog).translate;
    animation.current?.cancel();
    if (reduceMotion()) { onClose(); return; }
    dialog.dataset.closing = 'true';
    animation.current = dialog.animate([{ translate: from }, { translate: '0 100%' }],
      { duration: 400, easing: drawerEasing, fill: 'forwards' });
    animation.current.finished.then(onClose, () => {});
  }

  return <dialog ref={ref} className="modal itemHelpSheet" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="itemSheetContent">
      <header className="itemSheetHeader">
        <button className="close" type="button" aria-label={lang ? 'Close' : 'Закрыть'} onClick={() => { lightHaptic(); close(); }}>×</button>
        <GameArt path={art} size={64}/>
        <h2 id={titleId} data-dialog-title tabIndex={-1}>{title}</h2>
      </header>
      <div className="itemSheetBody">
        <p>{mechanic}</p>
        {use && <section><h3>{lang ? 'When to use it' : 'Когда пригодится'}</h3><p>{use}</p></section>}
        {source && <small>{source}</small>}
      </div>
    </div>
  </dialog>;
}
