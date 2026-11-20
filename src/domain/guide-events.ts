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
  builds: 'Нажали «Собрать билд» на главной',
  share_send: 'Открыли выбор получателя',
} as const;

export const guideBuilds = {
  open: 'Открыли конструктор билда',
  preset: 'Применили готовый билд',
  edit: 'Меняли параметры и экипировку',
  analyze: 'Открыли анализ сборки',
  practice: 'Запустили тренировочные бои',
} as const;

export type GuideEvent =
  | `view:${keyof typeof guidePages}`
  | `action:${keyof typeof guideActions}`
  | `build:${keyof typeof guideBuilds}`;

export function isGuideEvent(event: unknown): event is GuideEvent {
  if (typeof event !== 'string') return false;
  const [kind, key, extra] = event.split(':');
  return extra === undefined && (
    kind === 'view' ? Object.hasOwn(guidePages, key) :
    kind === 'action' ? Object.hasOwn(guideActions, key) :
    kind === 'build' && Object.hasOwn(guideBuilds, key)
  );
}
