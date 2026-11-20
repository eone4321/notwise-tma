export type SkinSlotKey = 'body' | 'chest' | 'hat' | 'glasses' | 'eyes';
export type SkinSelection = Record<SkinSlotKey, string | null>;
export type SkinRarity = 'Common' | 'Rare' | 'Epic' | 'Golden';

export const emptySkinSelection: SkinSelection = {
  body: null,
  chest: null,
  hat: null,
  glasses: null,
  eyes: null,
};

export type SkinTraitOption = {
  key: string;
  ru: string;
  en: string;
  bonus: number;
};

export const skinSlotMeta: Record<SkinSlotKey, {
  rigSlot: 'Body' | 'Chest' | 'Hat' | 'Glasses' | 'Eyes';
  ru: string;
  en: string;
  emptyRu: string;
  emptyEn: string;
}> = {
  body: { rigSlot: 'Body', ru: 'Оперение', en: 'Body', emptyRu: 'База', emptyEn: 'Base' },
  chest: { rigSlot: 'Chest', ru: 'Грудь', en: 'Chest', emptyRu: 'Пусто', emptyEn: 'None' },
  hat: { rigSlot: 'Hat', ru: 'Убор', en: 'Hat', emptyRu: 'Пусто', emptyEn: 'None' },
  glasses: { rigSlot: 'Glasses', ru: 'Очки', en: 'Glasses', emptyRu: 'Пусто', emptyEn: 'None' },
  eyes: { rigSlot: 'Eyes', ru: 'Глаза', en: 'Eyes', emptyRu: 'Пусто', emptyEn: 'None' },
};

export const skinTraitsBySlot: Record<SkinSlotKey, readonly SkinTraitOption[]> = {
  body: [
    { key: 'Golden', ru: 'Золотое', en: 'Golden', bonus: 15 },
    { key: 'Brown', ru: 'Коричневое', en: 'Brown', bonus: 5 },
    { key: 'Gray', ru: 'Серое', en: 'Gray', bonus: 5 },
    { key: 'Dark', ru: 'Тёмное', en: 'Dark', bonus: 5 },
    { key: 'Green', ru: 'Зелёное', en: 'Green', bonus: 5 },
    { key: 'ArcticBlue', ru: 'Арктическое', en: 'Arctic Blue', bonus: 5 },
    { key: 'Rose', ru: 'Розовое', en: 'Rose', bonus: 5 },
    { key: 'Violet', ru: 'Фиолетовое', en: 'Violet', bonus: 5 },
    { key: 'Cherry', ru: 'Вишнёвое', en: 'Cherry', bonus: 5 },
    { key: 'Polar', ru: 'Полярное', en: 'Polar', bonus: 5 },
    { key: 'Buckle', ru: 'Пряжка', en: 'Buckle', bonus: 5 },
    { key: 'Camo', ru: 'Камуфляж', en: 'Camo', bonus: 5 },
    { key: 'Artistry', ru: 'Арт', en: 'Artistry', bonus: 5 },
    { key: 'Demonic', ru: 'Демоническое', en: 'Demonic', bonus: 5 },
    { key: 'NightCity', ru: 'Ночной город', en: 'Night City', bonus: 5 },
    { key: 'Python', ru: 'Питон', en: 'Python', bonus: 5 },
  ],
  chest: [
    { key: 'NOT_Chain', ru: 'Цепь NOT', en: 'NOT Chain', bonus: 10 },
    { key: 'Bow_Tie', ru: 'Бабочка', en: 'Bow Tie', bonus: 5 },
    { key: 'Tie_red', ru: 'Красный галстук', en: 'Red Tie', bonus: 5 },
    { key: 'Tie_green', ru: 'Зелёный галстук', en: 'Green Tie', bonus: 5 },
    { key: 'Bolo', ru: 'Боло', en: 'Bolo Tie', bonus: 5 },
    { key: 'Pipe', ru: 'Трубка', en: 'Pipe', bonus: 5 },
    { key: 'Pipe+smoke', ru: 'Трубка с дымом', en: 'Smoking Pipe', bonus: 5 },
  ],
  hat: [
    { key: 'Crown', ru: 'Корона', en: 'Crown', bonus: 5 },
    { key: 'Golden_egg', ru: 'Золотое яйцо', en: 'Golden Egg', bonus: 5 },
    { key: 'Nimbus+light', ru: 'Нимб', en: 'Nimbus', bonus: 5 },
    { key: 'Ninja_Gear', ru: 'Повязка ниндзя', en: 'Ninja Gear', bonus: 5 },
    { key: 'Horns', ru: 'Рожки', en: 'Horns', bonus: 5 },
    { key: 'Broken_egg', ru: 'Шапка из скорлупы', en: 'Broken Egg', bonus: 5 },
    { key: 'Birthday_hat', ru: 'Праздничный колпак', en: 'Birthday Hat', bonus: 5 },
    { key: 'Captain_hat', ru: 'Капитанская фуражка', en: 'Captain Hat', bonus: 5 },
    { key: 'Detective_hat', ru: 'Шляпа детектива', en: 'Detective Hat', bonus: 5 },
    { key: 'Cherry', ru: 'Вишня', en: 'Cherry', bonus: 5 },
    { key: 'Nest', ru: 'Гнездо', en: 'Nest', bonus: 5 },
    { key: 'Patch', ru: 'Повязка', en: 'Patch', bonus: 5 },
  ],
  glasses: [
    { key: 'Aviator', ru: 'Авиаторы', en: 'Aviator', bonus: 5 },
    { key: 'Las_vegas', ru: 'Лас-Вегас', en: 'Las Vegas', bonus: 5 },
    { key: 'Pirate_patch', ru: 'Пиратская повязка', en: 'Pirate Patch', bonus: 5 },
  ],
  eyes: [
    { key: 'Laser_red', ru: 'Красный лазер', en: 'Red Laser', bonus: 5 },
    { key: 'Laser_blue', ru: 'Синий лазер', en: 'Blue Laser', bonus: 5 },
    { key: 'Demonic', ru: 'Демонические', en: 'Demonic', bonus: 5 },
    { key: 'Hight_blue', ru: 'Голубые', en: 'High Blue', bonus: 5 },
    { key: 'Hight_green', ru: 'Салатовые', en: 'High Green', bonus: 5 },
    { key: 'Hight_yellow', ru: 'Жёлтые', en: 'High Yellow', bonus: 5 },
    { key: 'Hight_pink', ru: 'Розовые', en: 'High Pink', bonus: 5 },
    { key: 'Hight_red', ru: 'Красные', en: 'High Red', bonus: 5 },
    { key: 'Hight_wine', ru: 'Бордовые', en: 'High Wine', bonus: 5 },
    { key: 'Hight_brown', ru: 'Карие', en: 'High Brown', bonus: 5 },
  ],
};

export type SkinPreset = {
  id: number;
  nameRu: string;
  nameEn: string;
  thumb: string;
  selection: SkinSelection;
};

export const skinPresets: readonly SkinPreset[] = [
  {
    id: 5405,
    nameRu: 'Золотой с цепью',
    nameEn: 'Golden with NOT Chain',
    thumb: '/game/skins/5405.svg',
    selection: { body: 'Golden', chest: 'NOT_Chain', eyes: 'Hight_green', glasses: 'Aviator', hat: null },
  },
  {
    id: 701,
    nameRu: 'Праздничный',
    nameEn: 'Party Owl',
    thumb: '/game/skins/701.svg',
    selection: { body: 'Dark', chest: 'NOT_Chain', eyes: 'Hight_blue', glasses: 'Aviator', hat: 'Birthday_hat' },
  },
  {
    id: 6568,
    nameRu: 'Золотой в скорлупе',
    nameEn: 'Golden Broken Egg',
    thumb: '/game/skins/6568.svg',
    selection: { body: 'Golden', chest: 'Bow_Tie', hat: 'Broken_egg', glasses: null, eyes: null },
  },
  {
    id: 5565,
    nameRu: 'Вишнёвый',
    nameEn: 'Cherry',
    thumb: '/game/skins/5565.svg',
    selection: { body: 'Cherry', chest: 'Bolo', glasses: 'Aviator', hat: 'Patch', eyes: null },
  },
  {
    id: 7895,
    nameRu: 'Золотой босс',
    nameEn: 'Golden Boss',
    thumb: '/game/skins/7895.png',
    selection: { body: 'Golden', chest: 'NOT_Chain', glasses: 'Las_vegas', hat: null, eyes: null },
  },
];

export const defaultHomeOwlSkin: SkinSelection =
  skinPresets.find(preset => preset.id === 7895)?.selection ?? {
    body: 'Golden',
    chest: 'NOT_Chain',
    glasses: 'Las_vegas',
    hat: null,
    eyes: null,
  };

export const homeOwlStorageKey = 'notwise.guide.home-owl.v1';

export function sanitizeSkinSelection(raw: unknown): SkinSelection | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const next: SkinSelection = { ...emptySkinSelection };
  let hasAny = false;
  for (const slot of ['body', 'chest', 'hat', 'glasses', 'eyes'] as const) {
    const val = record[slot];
    if (typeof val === 'string' && findTrait(slot, val)) {
      next[slot] = val;
      hasAny = true;
    }
  }
  return hasAny ? next : null;
}

export function sameSkinSelection(a: SkinSelection, b: SkinSelection): boolean {
  return (['body', 'chest', 'hat', 'glasses', 'eyes'] as const).every(slot => (a[slot] ?? null) === (b[slot] ?? null));
}

export function readHomeOwlSkin(): { selection: SkinSelection; isCustom: boolean } {
  try {
    const raw = JSON.parse(localStorage.getItem(homeOwlStorageKey) ?? 'null');
    const clean = sanitizeSkinSelection(raw);
    if (clean) return { selection: clean, isCustom: true };
  } catch { /* fallback */ }
  return { selection: { ...defaultHomeOwlSkin }, isCustom: false };
}

export function saveHomeOwlSkin(selection: SkinSelection | null): void {
  try {
    if (selection === null || sameSkinSelection(selection, defaultHomeOwlSkin)) {
      localStorage.removeItem(homeOwlStorageKey);
    } else {
      localStorage.setItem(homeOwlStorageKey, JSON.stringify(selection));
    }
  } catch { /* ignore */ }
}

export function findTrait(slot: SkinSlotKey, key: string | null) {
  if (!key) return undefined;
  return skinTraitsBySlot[slot].find(option => option.key === key);
}

export function skinPartBonus(slot: SkinSlotKey, key: string | null) {
  return findTrait(slot, key)?.bonus ?? 0;
}

export function skinBonusForSelection(selection: SkinSelection) {
  return (Object.keys(skinSlotMeta) as SkinSlotKey[]).reduce(
    (sum, slot) => sum + skinPartBonus(slot, selection[slot]),
    0,
  );
}

export function skinRarityForSelection(selection: SkinSelection): SkinRarity {
  if (selection.body === 'Golden') return 'Golden';
  let accessories = 0;
  for (const slot of ['chest', 'hat', 'glasses', 'eyes'] as const) {
    if (selection[slot]) accessories++;
  }
  if (accessories >= 2) return 'Epic';
  if (accessories === 1) return 'Rare';
  return 'Common';
}

export const rarityLabels: Record<SkinRarity, { ru: string; en: string }> = {
  Common: { ru: 'Обычный', en: 'Common' },
  Rare: { ru: 'Редкий', en: 'Rare' },
  Epic: { ru: 'Эпический', en: 'Epic' },
  Golden: { ru: 'Золотой', en: 'Golden' },
};

export function matchingJetton(selection: SkinSelection): {
  id: 25 | 26 | 27 | null;
  file: string;
  ru: string;
  en: string;
  noteRu: string;
  noteEn: string;
} {
  const rarity = skinRarityForSelection(selection);
  const hasAny = Boolean(selection.body || selection.chest || selection.hat || selection.glasses || selection.eyes);
  if (!hasAny) {
    return {
      id: null,
      file: 'skin-jetton.webp',
      ru: 'Жетоны скинов',
      en: 'Skin jettons',
      noteRu: 'Скин открывается жетоном или на Getgems',
      noteEn: 'Get skins from jettons or Getgems',
    };
  }
  if (rarity === 'Golden') {
    return {
      id: 27,
      file: 'skin-jetton-golden.webp',
      ru: 'Золотой жетон',
      en: 'Golden Jetton',
      noteRu: 'Гарантирует золотое оперение (+15%)',
      noteEn: 'Guarantees Golden body (+15%)',
    };
  }
  if (rarity === 'Epic' || selection.chest === 'NOT_Chain') {
    return {
      id: 26,
      file: 'skin-jetton-epic.webp',
      ru: 'Эпический жетон',
      en: 'Epic Jetton',
      noteRu: 'Оперение и 2+ аксессуара',
      noteEn: 'Body + multiple accessories',
    };
  }
  return {
    id: 25,
    file: 'skin-jetton.webp',
    ru: 'Обычный жетон',
    en: 'Skin Jetton',
    noteRu: 'Обычное оперение, без сложных сетов',
    noteEn: 'Common feathers, basic roll',
  };
}

// --- Game Bundle Lottie Skin Rig + tlottie WASM Engine ---

type RigPart = {
  rank: number;
  rig?: boolean;
  layers: unknown[];
};

export type SkinRigData = {
  v: string;
  fr: number;
  op: number;
  w: number;
  h: number;
  rig: unknown[];
  slots: ('Body' | 'Eyes' | 'Glasses' | 'Chest' | 'Hat')[];
  traits: Record<string, string[]>;
  parts: Record<string, RigPart>;
  skins: number[][];
};

type TlottieExports = {
  memory: WebAssembly.Memory;
  tlottie_alloc(len: number): number;
  tlottie_free(ptr: number, len: number): void;
  tlottie_new(ptr: number, len: number): number;
  tlottie_drop(inst: number): void;
  tlottie_width(inst: number): number;
  tlottie_height(inst: number): number;
  tlottie_frame_rate(inst: number): number;
  tlottie_frame_count(inst: number): number;
  tlottie_render(inst: number, frame: number, w: number, h: number, scale: number): number;
};

const simdProbe = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
]);

let rigPromise: Promise<SkinRigData> | null = null;
let enginePromise: Promise<TlottieExports> | null = null;
const textEncoder = new TextEncoder();

export function loadSkinRigData(): Promise<SkinRigData> {
  if (!rigPromise) {
    rigPromise = fetch('/game/lottie/skins.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load skin rig: ' + res.status);
        return res.json() as Promise<SkinRigData>;
      })
      .catch(err => {
        rigPromise = null;
        throw err;
      });
  }
  return rigPromise;
}

export function loadTlottieEngine(): Promise<TlottieExports> {
  if (!enginePromise) {
    const wasmUrl = WebAssembly.validate(simdProbe)
      ? '/game/lottie/tlottie.wasm'
      : '/game/lottie/tlottie.nosimd.wasm';
    enginePromise = fetch(wasmUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load tlottie WASM: ' + res.status);
        return res.arrayBuffer();
      })
      .then(bytes => WebAssembly.compile(bytes))
      .then(mod => WebAssembly.instantiate(mod, {}))
      .then(inst => inst.exports as unknown as TlottieExports)
      .catch(err => {
        enginePromise = null;
        throw err;
      });
  }
  return enginePromise;
}

export function buildSkinLottieBytes(data: SkinRigData, selection: SkinSelection): Uint8Array | null {
  const parts: RigPart[] = [];
  const entries: ['Body' | 'Eyes' | 'Glasses' | 'Chest' | 'Hat', string | null][] = [
    ['Body', selection.body ?? 'Brown'],
    ['Eyes', selection.eyes],
    ['Glasses', selection.glasses],
    ['Chest', selection.chest],
    ['Hat', selection.hat],
  ];
  for (const [slot, trait] of entries) {
    if (!trait) continue;
    const part = data.parts[`${slot}.${trait}`];
    if (part) parts.push(part);
  }
  if (!parts.length) return null;
  parts.sort((a, b) => a.rank - b.rank);
  const layers: unknown[] = [];
  let needsRig = false;
  for (const part of parts) {
    for (const layer of part.layers) layers.push(layer);
    if (part.rig) needsRig = true;
  }
  if (needsRig) {
    for (const rigLayer of data.rig) layers.push(rigLayer);
  }
  const json = JSON.stringify({
    v: data.v,
    fr: data.fr,
    ip: 0,
    op: data.op,
    w: data.w,
    h: data.h,
    assets: [],
    layers,
  });
  return textEncoder.encode(json);
}

export function selectionFromSkinId(data: SkinRigData, skinId: number): SkinSelection | null {
  const indices = data.skins[skinId - 1];
  if (!indices) return null;
  const result: SkinSelection = { ...emptySkinSelection };
  const mapSlot: Record<string, SkinSlotKey> = {
    Body: 'body',
    Eyes: 'eyes',
    Glasses: 'glasses',
    Chest: 'chest',
    Hat: 'hat',
  };
  for (let i = 0; i < data.slots.length; i++) {
    const slotName = data.slots[i];
    const traitIndex = indices[i];
    if (!traitIndex) continue;
    const traitKey = data.traits[slotName]?.[traitIndex - 1] ?? null;
    const target = mapSlot[slotName];
    if (target && traitKey) result[target] = traitKey;
  }
  return result;
}
