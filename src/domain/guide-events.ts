export const guidePages = {
  home: 'Главная', squads: 'Сквады и войны', secrets: 'Секреты', capsules: 'Капсулы',
  care: 'Кормление', modes: 'Режимы игры', owl: 'Яйца и скины', collections: 'Коллекции', combat: 'Бои и навыки',
  assets: 'Предметы', ecosystem: 'Экосистема', referrals: 'Пригласить друзей', support: 'Настройки',
} as const;

export const guideActions = {
  game: 'Открыли ссылку на игру',
  channel: 'Открыли ссылку на канал',
  share_copy: 'Скопировали ссылку на гайд',
  chat: 'Открыли ссылку на чат',
  squad: 'Открыли ссылку на сквад',
  share_send: 'Открыли выбор получателя',
} as const;

export type GuideEvent = `view:${keyof typeof guidePages}` | `action:${keyof typeof guideActions}`;

export function isGuideEvent(event: unknown): event is GuideEvent {
  if (typeof event !== 'string') return false;
  const [kind, key, extra] = event.split(':');
  return extra === undefined && (kind === 'view' ? Object.hasOwn(guidePages, key) :
    kind === 'action' && Object.hasOwn(guideActions, key));
}
