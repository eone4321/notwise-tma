import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { DetailLink } from '../ui/DetailLink';
import { GameArt } from '../ui/GameArt';
import { GameGlyph } from '../ui/GameGlyph';
import { useModal } from '../ui/useModal';
import { artSrc } from '../ui/warmArt';
import { lightHaptic } from '../telegram/client';
import { battleLeagues } from './battle-leagues';
import { useGuideLocale } from './guideLocale';
import { OwlSkinCanvas } from './OwlSkinCanvas';
import {
  emptySkinSelection, findTrait, homeOwlChangeEvent, hydrateHomeOwlFromCloud, loadSkinRigData,
  matchingJetton, rarityLabels, readHomeOwlSkin, sameSkinSelection, saveHomeOwlSkin, scopedStorageKey,
  selectionFromSkinId, skinBonusForSelection, skinPartBonus, skinPresets, skinRarityForSelection,
  skinSlotMeta, skinTraitsBySlot, type SkinSelection, type SkinSlotKey,
} from './skinRig';

type SavedSkinCalc = {
  selection: SkinSelection;
  enchant: string;
  gear: { rings: (number | null)[]; artifact: boolean; league: number };
  presetId: number | null;
};

const skinCalcStorage = 'notwise.guide.skin-calc.v1';
const defaultGear: SavedSkinCalc['gear'] = { rings: [null, null, null], artifact: false, league: 0 };
const slotOrder: readonly SkinSlotKey[] = ['body', 'hat', 'glasses', 'chest', 'eyes'];

const bodySwatches: Record<string, string> = {
  Golden: 'linear-gradient(135deg, #fff0a8, #eab038, #9e6b14)',
  Brown: '#7c5338',
  Gray: '#828794',
  Dark: '#2a2e3d',
  Green: '#4b9b5e',
  ArcticBlue: '#64c2ef',
  Rose: '#e98da8',
  Violet: '#9c6ce8',
  Cherry: '#be344f',
  Polar: '#dbe6f2',
  Buckle: '#9c6e46',
  Camo: 'linear-gradient(135deg, #5d7444, #39482c)',
  Artistry: 'linear-gradient(135deg, #ef6c94, #6ab8ef, #ffd166)',
  Demonic: 'linear-gradient(135deg, #b8292f, #2c1419)',
  NightCity: 'linear-gradient(135deg, #273259, #c456e8)',
  Python: 'linear-gradient(135deg, #748c4a, #3c4a2a)',
};

function SlotGlyph({ slot }: { slot: SkinSlotKey }) {
  if (slot === 'body') {
    return <svg className="skinSlotSvg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>
    </svg>;
  }
  if (slot === 'chest') {
    return <svg className="skinSlotSvg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4c1 5 3.5 8 6 8s5-3 6-8"/><polygon points="12 12 9 18 15 18 12 12"/>
    </svg>;
  }
  if (slot === 'hat') {
    return <svg className="skinSlotSvg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 17 2-9 4.5 4L12 5l2.5 7L19 8l2 9z"/><line x1="4" y1="20" x2="20" y2="20"/>
    </svg>;
  }
  if (slot === 'glasses') {
    return <svg className="skinSlotSvg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7" cy="13" r="3.5"/><circle cx="17" cy="13" r="3.5"/><path d="M10.5 13h3M3.5 13l1-4M20.5 13l-1-4"/>
    </svg>;
  }
  return <svg className="skinSlotSvg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>
  </svg>;
}

function enchantValue(raw: string, max: number) {
  const digits = raw.replace(/\D/g, '');
  return digits ? String(Math.min(max, Number(digits))) : '';
}

function readSavedSkinCalc(): SavedSkinCalc {
  try {
    const key = scopedStorageKey(skinCalcStorage);
    const rawStr = sessionStorage.getItem(key)
      ?? localStorage.getItem(key)
      ?? sessionStorage.getItem(skinCalcStorage)
      ?? localStorage.getItem(skinCalcStorage);
    const raw = JSON.parse(rawStr ?? 'null');
    if (raw && typeof raw === 'object' && raw.selection && typeof raw.selection === 'object') {
      const sel: SkinSelection = { ...emptySkinSelection };
      for (const slot of slotOrder) {
        const val = raw.selection[slot];
        if (typeof val === 'string' && findTrait(slot, val)) sel[slot] = val;
      }
      const enchant = typeof raw.enchant === 'string' ? enchantValue(raw.enchant, 20) : '';
      const savedRings = raw.gear?.rings;
      const legacyTotal = typeof savedRings === 'string' ? Number(enchantValue(savedRings, 60)) : 0;
      const rings = defaultGear.rings.map((_, index) => {
        if (Array.isArray(savedRings)) {
          const level = savedRings[index];
          return Number.isInteger(level) && level >= 0 && level <= 20 ? level : null;
        }
        const level = Math.min(20, legacyTotal - index * 20);
        return level > 0 ? level : null;
      });
      const artifact = Boolean(raw.gear?.artifact);
      const league = typeof raw.gear?.league === 'number' && raw.gear.league >= 0 && raw.gear.league <= battleLeagues.length
        ? raw.gear.league : 0;
      const presetId = typeof raw.presetId === 'number' ? raw.presetId : null;
      return { selection: sel, enchant, gear: { rings, artifact, league }, presetId };
    }
  } catch { /* ignore */ }
  const home = readHomeOwlSkin();
  return {
    selection: home.isCustom ? { ...home.selection } : { ...emptySkinSelection },
    enchant: '',
    gear: defaultGear,
    presetId: null,
  };
}

function pickRandomTrait(slot: SkinSlotKey, allowEmpty: boolean): string | null {
  const list = skinTraitsBySlot[slot];
  if (allowEmpty && Math.random() < 0.25) return null;
  return list[Math.floor(Math.random() * list.length)].key;
}

export function SkinFarmCalculator({
  onSelectionChange,
}: {
  onSelectionChange?: (selection: SkinSelection) => void;
}) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const copy = (ru: string, enText: string) => en ? enText : ru;

  const [saved] = useState<SavedSkinCalc>(readSavedSkinCalc);
  const [selection, setSelection] = useState<SkinSelection>(saved.selection);
  const [homeSkin, setHomeSkin] = useState<SkinSelection>(() => readHomeOwlSkin().selection);
  const [enchant, setEnchant] = useState(saved.enchant);
  const [gear, setGear] = useState(saved.gear);
  const [presetId, setPresetId] = useState<number | null>(saved.presetId);
  const [slotPicker, setSlotPicker] = useState<SkinSlotKey | null>(null);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [leagueOpen, setLeagueOpen] = useState(false);
  const leagueRef = useRef<HTMLDivElement>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [skinIdInput, setSkinIdInput] = useState('');
  const [skinIdError, setSkinIdError] = useState('');
  const [lookingUpId, setLookingUpId] = useState(false);

  useEffect(() => {
    if (!leagueOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (leagueRef.current && !leagueRef.current.contains(event.target as Node)) setLeagueOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLeagueOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [leagueOpen]);

  useEffect(() => {
    const syncHome = () => setHomeSkin(readHomeOwlSkin().selection);
    window.addEventListener(homeOwlChangeEvent, syncHome);
    hydrateHomeOwlFromCloud(setHomeSkin);
    return () => window.removeEventListener(homeOwlChangeEvent, syncHome);
  }, []);

  useEffect(() => {
    try {
      const key = scopedStorageKey(skinCalcStorage);
      const payload = JSON.stringify({ selection, enchant, gear, presetId });
      sessionStorage.setItem(key, payload);
      localStorage.setItem(key, payload);
    } catch { /* ignore */ }
    onSelectionChange?.(selection);
  }, [selection, enchant, gear, presetId, onSelectionChange]);

  const enchantLevel = Number(enchant) || 0;
  const enchantBonus = 5 * enchantLevel;
  const partsBonus = skinBonusForSelection(selection);
  const skinTotal = partsBonus + enchantBonus;
  const ringBonus = gear.rings.reduce<number>((sum, level) => sum + (level ?? 0) * 5, 0);
  const gearBonus = ringBonus + (gear.artifact ? 10 : 0);
  const extras = gearBonus + gear.league;
  const total = skinTotal + extras;

  const rarity = skinRarityForSelection(selection);
  const jetton = matchingJetton(selection);
  const nextEnchantTarget = enchantLevel < 20 ? enchantLevel + 1 : 20;
  const enchantSuccess = 100 - Math.max(0, nextEnchantTarget - 3) * 5;
  const enchantBurn = 100 - enchantSuccess;
  const riskZone = enchantLevel >= 11 ? 'high' : enchantLevel >= 3 ? 'mid' : 'safe';

  function applySlot(slot: SkinSlotKey, key: string | null) {
    lightHaptic();
    setPresetId(null);
    setSelection(curr => ({ ...curr, [slot]: key }));
  }

  function applyPreset(id: number, nextSelection: SkinSelection) {
    lightHaptic();
    setPresetId(id);
    setSelection({ ...nextSelection });
  }

  function randomize() {
    lightHaptic();
    setPresetId(null);
    setSelection({
      body: pickRandomTrait('body', false),
      hat: pickRandomTrait('hat', true),
      glasses: pickRandomTrait('glasses', true),
      chest: pickRandomTrait('chest', true),
      eyes: pickRandomTrait('eyes', true),
    });
  }

  function reset() {
    lightHaptic();
    setSelection({ ...emptySkinSelection });
    setEnchant('');
    setGear(defaultGear);
    setPresetId(null);
  }

  async function lookupSkinById(requestClose?: () => void) {
    const id = Number(skinIdInput.replace(/\D/g, ''));
    if (!Number.isInteger(id) || id < 1 || id > 10285) {
      setSkinIdError(copy('Укажи номер от 1 до 10285', 'Enter an ID from 1 to 10285'));
      return;
    }
    setLookingUpId(true);
    setSkinIdError('');
    try {
      const data = await loadSkinRigData();
      const found = selectionFromSkinId(data, id);
      if (!found) {
        setSkinIdError(copy('Скин с таким номером не найден', 'Skin ID not found'));
        return;
      }
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      applyPreset(id, found);
      if (requestClose) requestClose();
      else setPresetModalOpen(false);
    } catch {
      setSkinIdError(copy('Не удалось загрузить базу скинов', 'Could not load skin rig data'));
    } finally {
      setLookingUpId(false);
    }
  }

  const isOnHome = sameSkinSelection(selection, homeSkin);

  function handleSetHome() {
    lightHaptic();
    if (isOnHome) return;
    const savedCopy = { ...selection };
    saveHomeOwlSkin(savedCopy);
    setHomeSkin(savedCopy);
    window.dispatchEvent(new CustomEvent('guide-award-action', { detail: 'cover' }));
  }

  return <section className="card buildPanel wardrobeCard" id="skin-calculator" aria-labelledby="farm-title" tabIndex={-1}>
    <div className="buildLoadoutTop">
      <div className="buildLoadoutControls">
        <span className="skinRarityPill" data-rarity={rarity}>
          {copy(rarityLabels[rarity].ru, rarityLabels[rarity].en)}
        </span>
        <button type="button" className="buildPresetChip" aria-haspopup="dialog"
          onClick={() => { lightHaptic(); setSkinIdError(''); setPresetModalOpen(true); }}>
          <GameGlyph name="skin"/>
          <span>{presetId ? `#${presetId}` : copy('Примеры / №', 'Presets / ID')}</span>
          <span className="buildChipCaret" aria-hidden="true">▾</span>
        </button>
      </div>
      <div className="buildLoadoutRight">
        <button type="button" className="wardrobeActionIcon" title={copy('Случайный образ', 'Randomize look')}
          aria-label={copy('Случайный образ', 'Randomize look')} onClick={randomize}>🎲</button>
        <button type="button" className="buildIconReset" title={copy('Сбросить скин', 'Reset skin')}
          aria-label={copy('Сбросить скин', 'Reset skin')} onClick={reset}>
          <span aria-hidden="true">↺</span><span>{copy('Сброс', 'Reset')}</span>
        </button>
        <button type="button" className="wardrobeActionIcon calcInfoBtn" title={copy('О калькуляторе скинов', 'About skin calculator')}
          aria-label={copy('О калькуляторе скинов', 'About skin calculator')} onClick={() => { lightHaptic(); setInfoOpen(true); }}>
          <GameGlyph name="info"/><span>{copy('Инфо', 'Info')}</span>
        </button>
      </div>
    </div>

    <div className="wardrobeStage" data-rarity={rarity}>
      <button
        type="button"
        className="wardrobeCoverPin"
        data-active={isOnHome || undefined}
        onClick={handleSetHome}
      >
        <span>{isOnHome ? copy('✓ На обложке', '✓ On cover') : copy('🖼️ На обложку', '🖼️ Set cover')}</span>
      </button>
      <div className="buildLoadoutOwl wardrobeOwl" data-rarity={rarity}>
        <OwlSkinCanvas selection={selection} size={156}/>
      </div>
      <div className="wardrobeStageHud">
        <div className="wardrobeBonusPill" role="status">
          <GameArt path="/game/items/wise-coin.webp" size={20}/>
          <strong id="farm-title">+{total}% {copy('к монетам', 'coins')}</strong>
        </div>
        <a href={jetton.id ? `#jetton-${jetton.id}` : '#skin-jettons'} className="skinJettonMatch"
          onClick={event => {
            event.preventDefault();
            lightHaptic();
            const targetId = jetton.id ? `jetton-${jetton.id}` : 'skin-jettons';
            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}>
          <GameArt path={`/game/items/${jetton.file}`} size={16}/>
          <span>{copy(jetton.ru, jetton.en)}</span>
        </a>
      </div>
    </div>

    <div className="wardrobeSlotTabs" role="group" aria-label={copy('Слоты образа', 'Skin slots')}>
      {slotOrder.map(slot => {
        const meta = skinSlotMeta[slot];
        const key = selection[slot];
        const trait = findTrait(slot, key);
        const bonus = skinPartBonus(slot, key);
        return <button
          key={slot}
          type="button"
          aria-haspopup="dialog"
          className="wardrobeSlotTab"
          data-filled={Boolean(trait) || undefined}
          data-gold={key === 'Golden' || key === 'NOT_Chain' || undefined}
          onClick={() => { lightHaptic(); setSlotPicker(slot); }}
        >
          <span className="wardrobeTabIcon">
            {slot === 'body' && key && bodySwatches[key]
              ? <span className="skinColorDot" style={{ background: bodySwatches[key] }} aria-hidden="true"/>
              : <SlotGlyph slot={slot}/>}
          </span>
          <span className="wardrobeTabLabel">{copy(meta.ru, meta.en)}</span>
          {trait ? <span className="wardrobeTabBonus">+{bonus}%</span> : <span className="wardrobeTabDot" aria-hidden="true"/>}
        </button>;
      })}
    </div>

    {slotPicker && <SkinModal
      title={copy(skinSlotMeta[slotPicker].ru, skinSlotMeta[slotPicker].en)}
      closeLabel={copy('Закрыть', 'Close')}
      onClose={() => setSlotPicker(null)}
    >
      {close => <div className="buildPickerOptions">
        {[{ key: null, ru: slotPicker === 'body' ? 'Базовое оперение' : 'Снять', en: slotPicker === 'body' ? 'Base plumage' : 'None', bonus: 0 },
          ...skinTraitsBySlot[slotPicker]].map(option => {
          const selected = selection[slotPicker] === option.key;
          const swatch = slotPicker === 'body' && option.key ? bodySwatches[option.key] : null;
          return <button key={option.key ?? 'empty'} className="buildPickerOption skinTraitOption"
            type="button" aria-pressed={selected} onClick={() => {
              applySlot(slotPicker, option.key);
              close();
            }}>
            <span className="wardrobeChipThumb" aria-hidden="true">
              {swatch ? <span className="skinColorDot" style={{ background: swatch }}/> : <SlotGlyph slot={slotPicker}/>}
            </span>
            <span><strong>{copy(option.ru, option.en)}</strong><small>+{option.bonus}% {copy('к монетам', 'coins')}</small></span>
            <span className="buildPickerCheck" aria-hidden="true">{selected ? '✓' : ''}</span>
          </button>;
        })}
      </div>}
    </SkinModal>}

    <div className="wardrobeEnchantCard">
      <div className="skinEnchantBox">
        <div className="skinEnchantHead">
          <div className="skinEnchantMeta">
            <GameArt path="/game/items/scroll-enchant-skin.webp" size={28}/>
            <strong>{copy('Заточка скина', 'Skin enchant')}</strong>
          </div>
          <b className="skinEnchantBonusTag">{enchantLevel > 0 ? `+${enchantLevel} · +${enchantBonus}%` : '+0%'}</b>
        </div>
        <div className="skinEnchantControls">
          <small className="skinEnchantHint" data-risk={riskZone}>
            {enchantLevel >= 20
              ? copy('Максимум +20 (+100%)', 'Max +20 (+100%)')
              : enchantBurn > 0
                ? copy(`На +${nextEnchantTarget}: ${enchantSuccess}% успех · ${enchantBurn}% риск 🔥`, `To +${nextEnchantTarget}: ${enchantSuccess}% ok · ${enchantBurn}% burn 🔥`)
                : copy(`На +${nextEnchantTarget}: 100% без сгорания`, `To +${nextEnchantTarget}: 100% safe`)}
          </small>
          <div className="buildStatStep skinEnchantStep">
            <button type="button" aria-label={copy('Уменьшить заточку', 'Decrease enchant')}
              disabled={enchantLevel <= 0}
              onClick={() => { lightHaptic(); setEnchant(enchantLevel <= 1 ? '' : String(enchantLevel - 1)); }}>−</button>
            <select
              className="skinEnchantSelect"
              aria-label={copy('Выбрать уровень заточки скина', 'Choose skin enchant level')}
              value={enchantLevel}
              onChange={event => { lightHaptic(); const v = Number(event.target.value); setEnchant(v > 0 ? String(v) : ''); }}
            >
              {Array.from({ length: 21 }, (_, lvl) => (
                <option key={lvl} value={lvl}>{lvl === 0 ? '0' : `+${lvl}`}</option>
              ))}
            </select>
            <button type="button" aria-label={copy('Увеличить заточку', 'Increase enchant')}
              disabled={enchantLevel >= 20}
              onClick={() => { lightHaptic(); setEnchant(String(enchantLevel + 1)); }}>+</button>
          </div>
        </div>
      </div>

      <div className="wardrobeRiskMeter" aria-hidden="true">
        <div className="wardrobeRiskTrack">
          <div className="wardrobeRiskFill" data-risk={riskZone} style={{ width: `${(enchantLevel / 20) * 100}%` }}/>
          <span className="wardrobeRiskSafeMark" style={{ left: '15%' }}/>
        </div>
        <div className="wardrobeRiskScale">
          <span>{copy('+0..+3 безопасно', '+0..+3 safe')}</span>
          <span>{copy('+4..+20 риск сгорания 🔥', '+4..+20 burn risk 🔥')}</span>
        </div>
      </div>
    </div>

    <details className="mediaDetails farmExtras wardrobeExtrasCard" id="farm-equipment">
      <summary>
        <GameGlyph name="shield"/>
        <strong>{copy('Кольца, артефакт и лига', 'Rings, artifact & league')}</strong>
        {extras > 0 && <b className="farmExtrasValue">+{extras}%</b>}
      </summary>
      <div className="wardrobeExtrasBody">
        <div className="wardrobeExtraRow">
          <div className="wardrobeExtraInfo">
            <GameArt path="/game/items/ring-wit-3.webp" size={28}/>
            <div>
              <strong>{copy('Заточка колец', 'Ring enchantments')}</strong>
              <small>{copy('+5% к монетам за каждый уровень', '+5% coins per enchant level')}</small>
            </div>
          </div>
          <strong className="farmExtrasValue">+{ringBonus}%</strong>
        </div>
        {gear.rings.map((level, index) => (
          <label className="wardrobeExtraRow" key={index}>
            <span className="wardrobeExtraInfo">
              <strong>{copy('Кольцо', 'Ring')} {index + 1}</strong>
              {level !== null && <small>+{level * 5}%</small>}
            </span>
            <select className="skinEnchantSelect skinRingSlotSelect"
              aria-label={copy(`Заточка кольца ${index + 1}`, `Ring ${index + 1} enchant`)}
              value={level ?? ''}
              onChange={event => {
                lightHaptic();
                const next = event.target.value === '' ? null : Number(event.target.value);
                setGear(current => ({ ...current, rings: current.rings.map((ring, slot) => slot === index ? next : ring) }));
              }}>
              <option value="">{copy('Пусто', 'Empty')}</option>
              {Array.from({ length: 21 }, (_, enchantment) => (
                <option key={enchantment} value={enchantment}>+{enchantment}</option>
              ))}
            </select>
          </label>
        ))}

        <button
          type="button"
          className="wardrobeArtifactBtn"
          aria-pressed={gear.artifact}
          onClick={() => { lightHaptic(); setGear({ ...gear, artifact: !gear.artifact }); }}
        >
          <span className="wardrobeExtraInfo">
            <GameArt path="/game/items/montmorillonite.webp" size={28}/>
            <span>
              <strong>{copy('Монтмориллонит', 'Montmorillonite')}</strong>
              <small>{copy('Полное HP и +10% к монетам', 'Full HP & +10% coins')}</small>
            </span>
          </span>
          <span className="wardrobeTogglePill">{gear.artifact ? '✓ +10%' : '+10%'}</span>
        </button>

        <div className="wardrobeLeagueBlock" ref={leagueRef}>
          <span className="wardrobeLeagueHead">
            <span>🏆 {copy('Боевая лига', 'Battle league')}</span>
            {gear.league > 0 && <strong>+{gear.league}%</strong>}
          </span>
          <button
            type="button"
            className="wardrobeLeagueTrigger"
            aria-haspopup="listbox"
            aria-expanded={leagueOpen}
            onClick={() => { lightHaptic(); setLeagueOpen(open => !open); }}
          >
            <span className="wardrobeLeagueTriggerText">
              {gear.league > 0 ? (() => {
                const [name, mmr] = battleLeagues[gear.league - 1];
                return <>
                  <strong>{name}</strong>
                  <small>{mmr.toLocaleString(locale)}+ MMR</small>
                </>;
              })() : (
                <strong>{copy('Без бонуса лиги', 'No league bonus')}</strong>
              )}
            </span>
            <span className="wardrobeLeagueTriggerRight">
              <span className="wardrobeLeaguePct">+{gear.league}%</span>
              <span className="wardrobeLeagueCaret" aria-hidden="true">{leagueOpen ? '▴' : '▾'}</span>
            </span>
          </button>
          {leagueOpen && (
            <div className="wardrobeLeagueMenu" role="listbox" aria-label={copy('Выбор боевой лиги', 'Choose battle league')}>
              <button
                type="button"
                role="option"
                className="wardrobeLeagueOption"
                aria-selected={gear.league === 0}
                onClick={() => {
                  lightHaptic();
                  setGear(current => ({ ...current, league: 0 }));
                  setLeagueOpen(false);
                }}
              >
                <span className="wardrobeLeagueOptionName">
                  <strong>{copy('Без бонуса лиги', 'No league bonus')}</strong>
                </span>
                <span className="wardrobeLeagueOptionMeta">+0%</span>
              </button>
              {battleLeagues.map(([name, mmr], index) => {
                const value = index + 1;
                const selected = gear.league === value;
                return (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    className="wardrobeLeagueOption"
                    aria-selected={selected}
                    onClick={() => {
                      lightHaptic();
                      setGear(current => ({ ...current, league: value }));
                      setLeagueOpen(false);
                    }}
                  >
                    <span className="wardrobeLeagueOptionName">
                      <strong>{name}</strong>
                      <small>{mmr.toLocaleString(locale)}+ MMR</small>
                    </span>
                    <span className="wardrobeLeagueOptionMeta">+{value}%</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="skinEnchantLinkRow">
          <DetailLink to="/assets/gear" className="textLink skinEnchantLink">{copy('Таблица шансов заточки', 'Enchant odds table')}</DetailLink>
        </div>
      </div>
    </details>

    {presetModalOpen && <SkinModal
      title={copy('Примеры и поиск по №', 'Presets & Skin ID')}
      closeLabel={copy('Закрыть', 'Close')}
      onClose={() => setPresetModalOpen(false)}>
      {requestClose => <>
        <form className="skinIdLookup" onSubmit={event => { event.preventDefault(); void lookupSkinById(requestClose); }}>
          <input value={skinIdInput} inputMode="numeric" maxLength={5}
            placeholder={copy('№ скина (например 5405)', 'Skin ID (e.g. 5405)')}
            onChange={event => { setSkinIdInput(event.target.value.replace(/\D/g, '')); setSkinIdError(''); }}/>
          <button className="secondary" type="submit" disabled={lookingUpId}>
            {lookingUpId ? '…' : copy('Примерить', 'Load')}
          </button>
        </form>
        {skinIdError && <p className="caption skinLookupError">{skinIdError}</p>}
        <div className="buildPickerOptions">
          {skinPresets.map(preset => {
            const bonus = skinBonusForSelection(preset.selection);
            const selected = presetId === preset.id;
            return <button key={preset.id} type="button" className="buildPickerOption"
              aria-pressed={selected}
              onClick={() => { applyPreset(preset.id, preset.selection); requestClose(); }}>
              <img className="skinPresetThumb" src={artSrc(preset.thumb)} width="38" height="38" alt=""/>
              <span>
                <strong>{copy(preset.nameRu, preset.nameEn)} · #{preset.id}</strong>
                <small>+{bonus}% {copy('без заточки', 'base bonus')}</small>
              </span>
              <span className="buildPickerCheck" aria-hidden="true">{selected ? '✓' : ''}</span>
            </button>;
          })}
        </div>
      </>}
    </SkinModal>}

    {infoOpen && <SkinModal
      title={copy('Зачем считать бонус к монетам', 'Why calculate coin bonus')}
      closeLabel={copy('Закрыть', 'Close')}
      onClose={() => setInfoOpen(false)}>
      {requestClose => <div className="calcInfoSheetBody">
        <p>{copy(
          'Суммарный процент (+% к монетам) увеличивает добычу золотых монет совы в PvP-боях и полётах (на гарантированные монеты из капсул бонус не действует).',
          'Your total coin bonus (+% coins) increases gold coin earnings in PvP battles and flights (it does not multiply guaranteed capsule coins).',
        )}</p>
        <div className="calcInfoList">
          <div>
            <strong>{copy('1. Детали скина (до +40% базово)', '1. Skin traits (up to +40% base)')}</strong>
            <p>{copy('Любая обычная деталь в 5 слотах даёт +5%, цепь NOT на груди — +10%, золотое оперение — +15%.', 'Any standard trait in the 5 slots grants +5%, NOT Chain grants +10%, and Golden plumage grants +15%.')}</p>
          </div>
          <div>
            <strong>{copy('2. Заточка скина и колец (+5% за ступень)', '2. Skin & ring enchanting (+5% per level)')}</strong>
            <p>{copy('Каждый +1 заточки скина и каждого из 3 колец добавляет ещё +5% к монетам (вплоть до +20 на предмет). До +3 заточка 100% безопасна, а с +4 появляется риск сгорания в осколки скорлупы.', 'Each +1 enchant on your skin and up to 3 rings adds +5% coins (up to +20 each). Enchanting to +3 is 100% safe; from +4 failed attempts burn the item into shards.')}</p>
          </div>
          <div>
            <strong>{copy('3. Артефакт и боевая лига', '3. Artifact & battle league')}</strong>
            <p>{copy('Экипированный Монтмориллонит добавляет +10% к монетам и держит полное HP, а текущая боевая лига даёт ещё от +1% до +13%.', 'Equipped Montmorillonite adds +10% coins and keeps HP full, while your battle league adds +1% to +13%.')}</p>
          </div>
        </div>
        <button type="button" className="secondary calcInfoDoneBtn" onClick={requestClose}>
          {copy('Понятно', 'Got it')}
        </button>
      </div>}
    </SkinModal>}
  </section>;
}

const sheetDrawerEasing = 'cubic-bezier(0.32, 0.72, 0, 1)';
const sheetReduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function SkinModal({ title, closeLabel, onClose, children }: {
  title: string; closeLabel: string; onClose: () => void; children: ReactNode | ((requestClose: () => void) => ReactNode);
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const animation = useRef<Animation | null>(null);
  const titleId = useId();
  useModal(ref, true, true);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || typeof dialog.animate !== 'function' || sheetReduceMotion()) return;
    animation.current = dialog.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
      { duration: 460, easing: sheetDrawerEasing });
    return () => animation.current?.cancel();
  }, []);

  function close() {
    const dialog = ref.current;
    if (!dialog || dialog.dataset.closing) return;
    const from = getComputedStyle(dialog).transform;
    animation.current?.cancel();
    if (typeof dialog.animate !== 'function' || sheetReduceMotion()) { onClose(); return; }
    dialog.dataset.closing = 'true';
    animation.current = dialog.animate([{ transform: from }, { transform: 'translateY(100%)' }],
      { duration: 360, easing: sheetDrawerEasing, fill: 'forwards' });
    animation.current.finished.then(onClose, () => {});
  }

  return <dialog className="modal buildPickerModal" ref={ref} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="dialogBody">
      <span className="sheetGrabber" aria-hidden="true"/>
      <header className="buildHeading"><h2 id={titleId} data-dialog-title tabIndex={-1}>{title}</h2>
        <button className="close" type="button" aria-label={closeLabel} onClick={() => { lightHaptic(); close(); }}>×</button></header>
      {typeof children === 'function' ? children(close) : children}
    </div>
  </dialog>;
}
