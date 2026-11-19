import { useRef } from 'react';
import { useModal } from '../ui/useModal';
import { useGuideLocale } from './guideLocale';
import { lightHaptic } from '../telegram/client';
import { GameArt } from '../ui/GameArt';

export type ArtifactTag = 'farm' | 'pvp' | 'security' | 'reset';

export interface ArtifactGuideItem {
  id: string;
  icon: string;
  extraIcons?: string[];
  titleRu: string;
  titleEn: string;
  tags: ArtifactTag[];
  mechanicRu: string;
  mechanicEn: string;
  tacticRu: string;
  tacticEn: string;
}

const tagLabels: Record<ArtifactTag, { ru: string; en: string }> = {
  farm: { ru: 'Фарм', en: 'Farm' },
  pvp: { ru: 'PvP', en: 'PvP' },
  security: { ru: 'Безопасность', en: 'Security' },
  reset: { ru: 'Сброс', en: 'Reset' },
};

export const artifactGuideItems: ArtifactGuideItem[] = [
  {
    id: 'chiller',
    icon: '/game/items/chiller.webp',
    titleRu: 'Холодильник XP (Чиллер)',
    titleEn: 'XP Refrigerator (Chiller)',
    tags: ['security', 'farm'],
    mechanicRu:
      'Пока открыт, капсулы дают 100% монет, яиц, стикеров и токенов NOT, но опыт (XP) заморожен на 0.',
    mechanicEn:
      'While open, capsules grant 100% coins, eggs, stickers, and NOT tokens, but experience (XP) gain is completely frozen at 0.',
    tacticRu:
      'Защита от преждевременного перехода в высокие PvP-лиги и к жестоким боссам. Позволяет спокойно фармить монеты, качать SP в Додзё и точить кольца на удобном уровне.',
    tacticEn:
      'Protects from premature ascent into high PvP leagues and brutal bosses. Allows you to safely farm coins, accumulate SP in the Dojo, and sharpen rings at your optimal level tier.',
  },
  {
    id: 'morpher',
    icon: '/game/items/morpher.webp',
    titleRu: 'Морфер (Morpher)',
    titleEn: 'Morpher',
    tags: ['reset', 'pvp'],
    mechanicRu:
      'Полный сброс всех распределённых очков характеристик (STR, AGI, WIS, END) и дерева навыков. Накопленные Skill Points (SP) сохраняются на 100%.',
    mechanicEn:
      'Full reset of all allocated attribute points (STR, AGI, WIS, END) and skill tree. All accumulated Skill Points (SP) are 100% preserved.',
    tacticRu:
      'Бесплатная смена роли под мету: переход из ловкача-уворотчика в мудрого крит-мага или выносливого танка без потери прокачки.',
    tacticEn:
      'Free role respec to adapt to the meta: transition from an agile dodge fighter into a high-crit wisdom mage or endurance tank without losing leveling progress.',
  },
  {
    id: 'sharpening',
    icon: '/game/items/scroll-enchant-ring.webp',
    extraIcons: ['/game/items/scroll-enchant-skin.webp', '/game/items/enchanter.webp'],
    titleRu: 'Заточка колец и скинов',
    titleEn: 'Sharpening & Enchants',
    tags: ['farm', 'pvp'],
    mechanicRu:
      'Кольца получают +1 к главному стату и +5% к фарму монет за уровень (до +20). Скины дают +5% к фарму. Безопасная заточка от +1 до +3 (100% шанс, 0% поломки). Начиная с +4 появляется шанс поломки предмета в осколки скорлупы!',
    mechanicEn:
      'Rings receive +1 to primary stat and +5% coin farm per level (up to +20). Skins give +5% coin farm per tier. Safe sharpening from +1 to +3 (100% success, 0% break). Starting at +4, items risk breaking into eggshell shards!',
    tacticRu:
      'Обязательно точить все основные кольца и скин на +3 (гарантированные +15% монет). Выше +3 точить только дубликаты.',
    tacticEn:
      'Always sharpen all primary rings and skin to +3 (guaranteed +15% coins). Above +3, sharpen only backup duplicates.',
  },
  {
    id: 'seba-cola',
    icon: '/game/items/seba-cola.webp',
    titleRu: 'Себа-Кола (Seba-Cola)',
    titleEn: 'Seba-Cola',
    tags: ['security', 'pvp'],
    mechanicRu:
      '24 часа полной неуязвимости от рейдов и подбора соперниками в PvP. Снимается раньше срока, если напасть самому.',
    mechanicEn:
      '24 hours of total immunity from raids and PvP opponent matchmaking. Removed early if you initiate an attack yourself.',
    tacticRu:
      'Защита капитала. При проигрыше рейда теряется 3% от всего баланса монет. Себа-Кола незаменима при накоплении крупных сумм (100k+ на Чиллер или кольца).',
    tacticEn:
      'Capital protection. Losing a raid costs 3% of your entire coin balance. Seba-Cola is indispensable when accumulating large coin sums (100k+ for Chiller or rings).',
  },
  {
    id: 'montmorillonite',
    icon: '/game/items/montmorillonite.webp',
    titleRu: 'Монтмориллонит (Montmorillonite)',
    titleEn: 'Montmorillonite',
    tags: ['farm', 'security'],
    mechanicRu: 'Фиксирует здоровье совы на 100% навсегда и даёт +10% к фарму монет.',
    mechanicEn: 'Permanently locks owl health at 100% and grants +10% coin farm bonus while equipped.',
    tacticRu: 'Экономия еды и лекарств, идеален для бесконечного гринда.',
    tacticEn: 'Saves all food and medicine costs; ideal for uninterrupted endless grinding.',
  },
  {
    id: 'book',
    icon: '/game/items/book.webp',
    titleRu: 'Эпическая книга / The Story',
    titleEn: 'The Story (Epic Book)',
    tags: ['pvp', 'farm'],
    mechanicRu:
      'Ежедневная загадка на 60 секунд. Даёт +5 Мудрости на 24 часа (+3.5% крита, +100 маны). Осторожно: 3 ошибки сжигают книгу навсегда.',
    mechanicEn:
      'Daily 60-second riddle. Grants +5 Wisdom for 24 hours (+3.5% crit chance, +100 mana). Caution: 3 mistakes burn the book forever.',
    tacticRu: 'Активировать перед решающими клановыми битвами или сериями PvP.',
    tacticEn: 'Activate right before decisive clan sieges or competitive PvP win-streak sessions.',
  },
  {
    id: 'big-black-clock',
    icon: '/game/items/big-black-clock.webp',
    titleRu: 'Большие чёрные часы',
    titleEn: 'Big Black Clock',
    tags: ['farm', 'security'],
    mechanicRu: 'Дают 30 дней иммунитета к голоду (нет штрафа -50% к наградам).',
    mechanicEn: 'Grants 30 days of hunger immunity (prevents the -50% penalty on rewards).',
    tacticRu: 'Спокойный пассивный фарм без необходимости кормить сову каждые 3 дня.',
    tacticEn: 'Worry-free passive farming without the chore of feeding the owl every 3 days.',
  },
  {
    id: 'xp-sp-storage',
    icon: '/game/items/floppy-1m.webp',
    extraIcons: ['/game/items/flask-full.webp'],
    titleRu: 'Дискеты опыта и Колбы SP',
    titleEn: 'XP Floppies & SP Flasks',
    tags: ['security', 'reset'],
    mechanicRu:
      'Хранение и моментальное вливание опыта или очков навыков. Пустые накопители позволяют законсервировать прогресс совы, а полные — моментально вкачать свежего персонажа.',
    mechanicEn:
      'Storage and instant infusion of XP or Skill Points. Empty media preserve character progress, while loaded items instantly boost a fresh character.',
    tacticRu:
      'Использовать перед перерождением или для безопасной передачи ресурсов при переходе между сезонами и прокачке специализированных билдов.',
    tacticEn:
      'Use prior to rebirth or to safely bank and transfer resources when switching builds or preparing for seasonal competitions.',
  },
];

export function ArtifactInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { locale } = useGuideLocale();
  const en = locale === 'en';

  useModal(dialogRef, open);

  const handleClose = () => {
    lightHaptic();
    onClose();
  };

  return (
    <dialog
      className="modal artifactInfoModal"
      ref={dialogRef}
      aria-labelledby="artifact-modal-title"
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialogBody artifactModalBody">
        <div className="artifactModalHeader">
          <div className="artifactModalHeading">
            <span className="infoCircleBtn artifactHeaderBadge" aria-hidden="true">
              i
            </span>
            <h2 id="artifact-modal-title" data-dialog-title tabIndex={-1}>
              {en ? 'Artifact Mechanics' : 'Гайд по артефактам'}
            </h2>
          </div>
          <button
            className="close artifactModalClose"
            type="button"
            aria-label={en ? 'Close guide' : 'Закрыть гайд'}
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <p className="artifactModalSubtitle">
          {en
            ? 'Tactical guide, hidden mechanics, and optimal strategies for key game artifacts.'
            : 'Тактическое руководство, скрытые механики и оптимальное применение ключевых предметов.'}
        </p>

        <div className="artifactCardsList">
          {artifactGuideItems.map(item => (
            <article key={item.id} className="artifactCard">
              <header className="artifactCardHeader">
                <div className="artifactCardIcons">
                  <GameArt path={item.icon} size={38} />
                  {item.extraIcons?.map(extra => (
                    <GameArt key={extra} path={extra} size={28} />
                  ))}
                </div>
                <div className="artifactCardTitleCol">
                  <h3 className="artifactCardTitle">{en ? item.titleEn : item.titleRu}</h3>
                  <div className="artifactBadges">
                    {item.tags.map(tag => (
                      <span key={tag} className={`artifactBadge artifactBadge--${tag}`}>
                        {tagLabels[tag][locale === 'en' ? 'en' : 'ru']}
                      </span>
                    ))}
                  </div>
                </div>
              </header>

              <div className="artifactCardBody">
                <div className="artifactSection artifactMechanic">
                  <span className="artifactSectionLabel">
                    {en ? 'Mechanics' : 'Механика'}
                  </span>
                  <p className="artifactSectionText">{en ? item.mechanicEn : item.mechanicRu}</p>
                </div>

                <div className="artifactSection artifactTactic">
                  <span className="artifactSectionLabel">
                    {en ? 'Tactics' : 'Тактика'}
                  </span>
                  <p className="artifactSectionText">{en ? item.tacticEn : item.tacticRu}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </dialog>
  );
}
