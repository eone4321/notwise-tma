type SkinSlot = 'body' | 'chest' | 'hat' | 'glasses' | 'eyes';

type SkinPart = readonly [slot: SkinSlot, name: string, bonus: number];

type SkinExample = {
  id: number;
  name: string;
  rarity: string;
  parts: readonly SkinPart[];
};

export const skinExamples: readonly SkinExample[] = [
  {
    id: 5405, name: 'Золотой с цепью', rarity: 'Золотой',
    parts: [['body', 'Золотое оперение', 15], ['chest', 'Цепь NOT', 10], ['eyes', 'Светло-зелёные глаза', 5], ['glasses', 'Авиаторы', 5]],
  },
  {
    id: 701, name: 'Праздничный', rarity: 'Эпический',
    parts: [['body', 'Тёмное оперение', 5], ['chest', 'Цепь NOT', 10], ['eyes', 'Голубые глаза', 5], ['glasses', 'Авиаторы', 5], ['hat', 'Праздничный колпак', 5]],
  },
  {
    id: 6568, name: 'Золотой в скорлупе', rarity: 'Золотой',
    parts: [['body', 'Золотое оперение', 15], ['chest', 'Бабочка', 5], ['hat', 'Шапка из скорлупы', 5]],
  },
  {
    id: 5565, name: 'Вишнёвый', rarity: 'Эпический',
    parts: [['body', 'Вишнёвое оперение', 5], ['glasses', 'Авиаторы', 5], ['chest', 'Боло', 5], ['hat', 'Повязка', 5]],
  },
];

export type SkinParts = Record<SkinSlot, number>;

export const emptySkin: SkinParts = { body: 0, chest: 0, hat: 0, glasses: 0, eyes: 0 };

export function skinPartsFor(example: SkinExample) {
  const parts = { ...emptySkin };
  for (const [slot, , bonus] of example.parts) parts[slot] = bonus;
  return parts;
}
