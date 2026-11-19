export const guideAchievements = {
  mascot: { title: 'Кто там?', description: 'Секрет гайда', icon: '/brand/hamster.png' },
  explorer: { title: 'Знаю каждый уголок', description: 'Открой все девять разделов гайда', icon: '/brand/notwise.svg' },
  referral: { title: 'Свой маршрут', description: 'Привяжи приглашение из игры', icon: '/game/items/referral-egg.webp' },
  shared: { title: 'Передай дальше', description: 'Отправь гайд другу через Telegram', icon: '/game/items/egg.webp' },
  five: { title: 'Своя стая', description: 'Пригласи пять друзей в гайд', icon: '/game/items/skin-jetton.webp' },
  community: { title: 'Свой в чате', description: 'Присоединись к чату CryptoOne', icon: '/brand/cryptoone.svg' },
  squad: { title: 'Под одним крылом', description: 'Вступи в сквад CryptoOne', icon: '/game/items/lighter.webp' },
} as const;

export type GuideAchievement = keyof typeof guideAchievements;
export const explorerSections = ['squads', 'secrets', 'capsules', 'owl', 'collections', 'combat', 'assets', 'ecosystem', 'referrals'];
