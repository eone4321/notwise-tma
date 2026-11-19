export const guidePages = {
  home: 'Главная', squads: 'Сквады и войны', secrets: 'Секреты', capsules: 'Капсулы',
  owl: 'Яйца и скины', collections: 'Коллекции', combat: 'Бои и навыки',
  assets: 'Предметы', ecosystem: 'Экосистема', referrals: 'Пригласить друзей', support: 'О проекте',
} as const;

export const guideActions = {
  game: 'Открыли ссылку на игру',
  channel: 'Открыли ссылку на канал',
  share_copy: 'Скопировали ссылку на гайд',
  share_send: 'Открыли выбор получателя',
} as const;

export type GuideEvent = `view:${keyof typeof guidePages}` | `action:${keyof typeof guideActions}`;

export function isGuideEvent(event: unknown): event is GuideEvent {
  if (typeof event !== 'string') return false;
  const [kind, key, extra] = event.split(':');
  return extra === undefined && (kind === 'view' ? Object.hasOwn(guidePages, key) :
    kind === 'action' && Object.hasOwn(guideActions, key));
}
