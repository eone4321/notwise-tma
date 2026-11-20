import { useRef } from 'react';
import { GameArt } from '../ui/GameArt';
import { useModal } from '../ui/useModal';
import { lightHaptic } from '../telegram/client';
import { useGuideLocale } from './guideLocale';

const artifactGuide = [
  {
    icon: 'chiller.webp', title: ['Холодильник XP', 'XP Refrigerator'],
    mechanic: ['Открой дверцу в инвентаре, чтобы капсулы перестали начислять опыт. Монеты и предметы продолжают выпадать. Чтобы снова получать опыт, закрой дверцу всех открытых холодильников.', 'Open the door in your inventory to pause XP from capsules. Coins and items still drop. Close every open refrigerator to resume gaining XP.'],
    use: ['Если хочешь остаться на своём уровне, пока тренируешь навыки в Додзе или собираешь ресурсы перед следующим повышением.', 'Use it to stay at your current level while you train skills in the Dojo or gather resources before leveling up.'],
  },
  {
    icon: 'ring-wit-3.webp', title: ['Кольца и заточка', 'Rings and sharpening'],
    mechanic: ['Можно надеть три кольца. Деревянное даёт +2 к своему атрибуту с 5-го уровня, обсидиановое +5 с 10-го, золотое +10 с 20-го. Заточка прибавляет +1 к атрибуту кольца и +5% к фарму монет за ступень. До +3 успех гарантирован, дальше кольцо может рассыпаться в скорлупу.', 'Equip up to three rings. Wooden grants +2 to its attribute from level 5, obsidian +5 from level 10, golden +10 from level 20. Each sharpening level adds +1 to the ring’s attribute and +5% coin farming. Sharpening through +3 is guaranteed. Beyond that the ring can break into eggshell shards.'],
    use: ['Выбирай силу для обычных ударов, ловкость для уклонения или мудрость для маны и критов. Навыки открываются за очки, вложенные в ветку.', 'Choose Strength for basic hits, Agility for dodging or Wisdom for mana and crits. Invest points in a branch to unlock its skills.'],
  },
  {
    icon: 'montmorillonite.webp', title: ['Монтмориллонит', 'Montmorillonite'],
    mechanic: ['Пока экипирован, поддерживает полное здоровье совы и добавляет 10% к фарму монет.', 'While equipped, keeps your owl at full health and adds 10% to coin farming.'],
    use: ['Если часто восстанавливаешь здоровье между боями или открываешь много капсул. Сытость проверяется отдельно.', 'Useful if you often restore health between fights or open a lot of capsules. Check satiety separately.'],
  },
  {
    icon: 'morpher.webp', title: ['Морфер', 'Morpher'],
    mechanic: ['Сбрасывает распределение характеристик и навыки. Очки можно перераспределить, накопленные SP сохраняются.', 'Resets allocated attributes and skills. You can redistribute the points and keep your accumulated SP.'],
    use: ['Когда хочешь сменить стиль боя. Например, вложить очки силы в мудрость, чтобы чаще применять заклинания.', 'Use it when switching play styles. For example, move Strength points into Wisdom to cast more spells.'],
  },
  {
    icon: 'seba-cola.webp', title: ['Seba Cola', 'Seba Cola'],
    mechanic: ['Защищает от рейдов и подбора в соперники на 24 часа. Если сам нападёшь, защита закончится раньше.', 'Protects you from raids and being matched as an opponent for 24 hours. Starting an attack ends the protection early.'],
    use: ['Когда копишь крупную сумму монет. При проигрыше рейда соперник забирает 3% баланса.', 'Use it when saving a large amount of coins. Losing a raid costs 3% of your balance.'],
  },
  {
    icon: 'big-black-clock.webp', title: ['Большие чёрные часы', 'Big Black Clock'],
    mechanic: ['Дают 30 дней защиты от голода. Если штраф уже действует, он сохраняется до конца своего таймера.', 'Grant 30 days of hunger protection. An active hunger penalty lasts until its timer runs out.'],
    use: ['Активируй заранее, если надолго оставляешь сову без еды.', 'Activate them in advance if you will be away from your owl for a while.'],
  },
  {
    icon: 'book.webp', title: ['Эпическая книга первооткрывателей', 'The Story'],
    mechanic: ['На загадку даётся 60 секунд. Верный ответ приносит монеты, опыт и +5 мудрости на сутки. После трёх ошибок книга сгорает.', 'You get 60 seconds for the riddle. A correct answer grants coins, XP and +5 Wisdom for a day. Three mistakes burn the book.'],
    use: ['Реши загадку перед серией боёв, чтобы получить +100 маны и прибавку к шансу крита.', 'Solve the riddle before a series of fights to get 100 extra mana and a higher crit chance.'],
  },
  {
    icon: 'floppy-empty.webp', title: ['Дискеты XP и колбы SP', 'XP disks and SP flasks'],
    mechanic: ['Для записи нужно вдвое больше XP или SP, чем поместится в накопитель. Запись XP возвращает сову в яйцо и сбрасывает XP, SP и навыки. При записи в колбу списываются все свободные SP.', 'Recording costs twice as much XP or SP as the item will hold. Recording XP returns your owl to its egg and resets XP, SP and skills. Recording into a flask spends all unallocated SP.'],
    use: ['Сверь стоимость записи и ёмкость до подтверждения, особенно если текущий запас намного больше того, что вернётся из предмета.', 'Check the recording cost and capacity before confirming, especially when you have far more than you will recover.'],
  },
] as const;

export function ArtifactInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { locale } = useGuideLocale();
  const lang = locale === 'en' ? 1 : 0;
  useModal(ref, open);
  if (!open) return <dialog ref={ref}/>;
  return <dialog className="modal artifactInfoModal" ref={ref} aria-labelledby="artifact-modal-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialogBody">
      <div className="buildHeading"><h2 id="artifact-modal-title" data-dialog-title tabIndex={-1}>{lang ? 'How items work' : 'Как работают предметы'}</h2>
        <button className="close" type="button" aria-label={lang ? 'Close' : 'Закрыть'} onClick={() => { lightHaptic(); onClose(); }}>×</button>
      </div>
      <div className="artifactCardsList">
        {artifactGuide.map(item => <details className="mediaDetails" key={item.icon} open={item.icon === 'chiller.webp' || undefined}>
          <summary><GameArt path={'/game/items/' + item.icon} size={34}/><strong>{item.title[lang]}</strong></summary>
          <p>{item.mechanic[lang]}</p>
          <p><strong>{lang ? 'When to use it' : 'Когда пригодится'}</strong><br/>{item.use[lang]}</p>
        </details>)}
      </div>
    </div>
  </dialog>;
}
