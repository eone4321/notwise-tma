export const guideAchievements = {
  mascot: { title: 'Кто там?', description: 'Такое нельзя встретить случайно. Почти.', icon: '/brand/hamster.png' },
  explorer: { title: 'Знаю каждый уголок', description: 'Любопытство заводит дальше знакомых троп.', icon: '/brand/notwise.svg' },
  referral: { title: 'Свой маршрут', description: 'У каждой тропы есть свой след.', icon: '/game/items/referral-egg.webp' },
  shared: { title: 'Передай дальше', description: 'Хорошие находки редко остаются у одного.', icon: '/game/items/egg.webp' },
  five: { title: 'Своя стая', description: 'По одному сюда уже не летают.', icon: '/game/items/skin-jetton.webp' },
  community: { title: 'Свой в чате', description: 'Где-то разговор продолжается даже ночью.', icon: '/brand/cryptoone.svg' },
  squad: { title: 'Под одним крылом', description: 'Некоторые крылья летят в одном строю.', icon: '/game/items/lighter.webp' },
} as const;

export type GuideAchievement = keyof typeof guideAchievements;
export const explorerSections = ['squads', 'secrets', 'capsules', 'owl', 'collections', 'combat', 'assets', 'ecosystem', 'referrals'];
