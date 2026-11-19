export const guideAchievements = {
  mascot: { title: 'Кто там?', description: 'Такое нельзя встретить случайно. Почти.', icon: '/brand/hamster.png' },
  explorer: { title: 'Знаю каждый уголок', description: 'Любопытство заводит дальше знакомых троп.', icon: '/brand/awards/blue.png' },
  referral: { title: 'Свой маршрут', description: 'У каждой тропы есть свой след.', icon: '/brand/awards/code.png' },
  shared: { title: 'Передай дальше', description: 'Хорошие находки редко остаются у одного.', icon: '/brand/awards/hoodie.png' },
  five: { title: 'Своя стая', description: 'По одному сюда уже не летают.', icon: '/brand/awards/tie.png' },
  community: { title: 'Свой в чате', description: 'Где-то разговор продолжается даже ночью.', icon: '/brand/awards/blue.png' },
  squad: { title: 'Под одним крылом', description: 'Некоторые крылья летят в одном строю.', icon: '/brand/awards/tie.png' },
} as const;

export type GuideAchievement = keyof typeof guideAchievements;
export const explorerSections = ['squads', 'secrets', 'capsules', 'owl', 'collections', 'combat', 'assets', 'ecosystem', 'referrals'];
