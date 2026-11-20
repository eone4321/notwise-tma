import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
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
  emptySkinSelection, findTrait, loadSkinRigData, matchingJetton, rarityLabels,
  selectionFromSkinId, skinBonusForSelection, skinPartBonus, skinPresets,
  skinRarityForSelection, skinSlotMeta, skinTraitsBySlot,
  type SkinSelection, type SkinSlotKey,
} from './skinRig';

type SavedSkinCalc = {
  selection: SkinSelection;
  enchant: string;
  gear: { rings: string; artifact: boolean; league: number };
  presetId: number | null;
};

const skinCalcStorage = 'notwise.guide.skin-calc.v1';
const defaultGear = { rings: '', artifact: false, league: 0 };

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
    const raw = JSON.parse(sessionStorage.getItem(skinCalcStorage) ?? 'null');
    if (raw && typeof raw === 'object' && raw.selection && typeof raw.selection === 'object') {
      const sel: SkinSelection = { ...emptySkinSelection };
      for (const slot of ['body', 'chest', 'hat', 'glasses', 'eyes'] as const) {
        const val = raw.selection[slot];
        if (typeof val === 'string' && findTrait(slot, val)) sel[slot] = val;
      }
      const enchant = typeof raw.enchant === 'string' ? enchantValue(raw.enchant, 20) : '';
      const rings = typeof raw.gear?.rings === 'string' ? enchantValue(raw.gear.rings, 60) : '';
      const artifact = Boolean(raw.gear?.artifact);
      const league = typeof raw.gear?.league === 'number' && raw.gear.league >= 0 && raw.gear.league <= battleLeagues.length
        ? raw.gear.league : 0;
      const presetId = typeof raw.presetId === 'number' ? raw.presetId : null;
      return { selection: sel, enchant, gear: { rings, artifact, league }, presetId };
    }
  } catch { /* ignore */ }
  return { selection: { ...emptySkinSelection }, enchant: '', gear: defaultGear, presetId: null };
}

export function SkinFarmCalculator() {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const copy = (ru: string, enText: string) => en ? enText : ru;

  const [saved] = useState<SavedSkinCalc>(readSavedSkinCalc);
  const [selection, setSelection] = useState<SkinSelection>(saved.selection);
  const [enchant, setEnchant] = useState(saved.enchant);
  const [gear, setGear] = useState(saved.gear);
  const [presetId, setPresetId] = useState<number | null>(saved.presetId);
  const [activeSlot, setActiveSlot] = useState<SkinSlotKey | null>(null);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [skinIdInput, setSkinIdInput] = useState('');
  const [skinIdError, setSkinIdError] = useState('');
  const [lookingUpId, setLookingUpId] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(skinCalcStorage, JSON.stringify({ selection, enchant, gear, presetId }));
    } catch { /* ignore */ }
  }, [selection, enchant, gear, presetId]);

  const enchantLevel = Number(enchant) || 0;
  const enchantBonus = 5 * enchantLevel;
  const partsBonus = skinBonusForSelection(selection);
  const skinTotal = partsBonus + enchantBonus;
  const gearBonus = 5 * (Number(gear.rings) || 0) + (gear.artifact ? 10 : 0);
  const extras = gearBonus + gear.league;
  const total = skinTotal + extras;

  const rarity = skinRarityForSelection(selection);
  const jetton = matchingJetton(selection);
  const nextEnchantTarget = enchantLevel < 20 ? enchantLevel + 1 : 20;
  const enchantSuccess = 100 - Math.max(0, nextEnchantTarget - 3) * 5;
  const enchantBurn = 100 - enchantSuccess;

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

  function reset() {
    lightHaptic();
    setSelection({ ...emptySkinSelection });
    setEnchant('');
    setGear(defaultGear);
    setPresetId(null);
  }

  async function lookupSkinById() {
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
      applyPreset(id, found);
      setPresetModalOpen(false);
    } catch {
      setSkinIdError(copy('Не удалось загрузить базу скинов', 'Could not load skin rig data'));
    } finally {
      setLookingUpId(false);
    }
  }

  const renderSlotButton = (slot: SkinSlotKey) => {
    const meta = skinSlotMeta[slot];
    const key = selection[slot];
    const trait = findTrait(slot, key);
    const bonus = skinPartBonus(slot, key);
    return <button key={slot} type="button" className="buildLoadoutSlot skinLoadoutSlot"
      data-filled={Boolean(trait) || undefined}
      data-gold={key === 'Golden' || key === 'NOT_Chain' || undefined}
      aria-haspopup="dialog"
      aria-label={`${copy(meta.ru, meta.en)}: ${trait ? copy(trait.ru, trait.en) : copy(meta.emptyRu, meta.emptyEn)}`}
      onClick={() => { lightHaptic(); setActiveSlot(slot); }}>
      <span className="skinSlotKind">{copy(meta.ru, meta.en)}</span>
      {trait ? <>
        {slot === 'body' && key && bodySwatches[key]
          ? <span className="skinColorDot" style={{ background: bodySwatches[key] }} aria-hidden="true"/>
          : <SlotGlyph slot={slot}/>}
        <span className="skinSlotValue">{copy(trait.ru, trait.en)}</span>
        <span className="buildLoadoutTag">+{bonus}%</span>
      </> : <>
        <span className="buildSlotPlus" aria-hidden="true">+</span>
        <span className="skinSlotEmpty">{copy(meta.emptyRu, meta.emptyEn)}</span>
      </>}
    </button>;
  };

  return <section className="card buildPanel buildLoadoutCard skinLoadoutCard" id="skin-calculator" aria-labelledby="farm-title" tabIndex={-1}>
    <div className="buildLoadoutTop">
      <div className="buildLoadoutControls">
        <span className="skinRarityPill" data-rarity={rarity}>
          {copy(rarityLabels[rarity].ru, rarityLabels[rarity].en)}
        </span>
        <button type="button" className="buildPresetChip" aria-haspopup="dialog"
          onClick={() => { lightHaptic(); setSkinIdError(''); setPresetModalOpen(true); }}>
          <GameGlyph name="skin"/>
          <span>{presetId ? `#${presetId}` : copy('Примеры', 'Presets')}</span>
          <span className="buildChipCaret" aria-hidden="true">▾</span>
        </button>
      </div>
      <div className="buildLoadoutRight">
        <span className="buildBudgetPill skinTotalPill">+{total}%</span>
        <button type="button" className="buildIconReset" title={copy('Сбросить скин', 'Reset skin')}
          aria-label={copy('Сбросить скин', 'Reset skin')} onClick={reset}>↺</button>
      </div>
    </div>

    <div className="buildLoadoutStage skinLoadoutStage">
      <div className="buildLoadoutCol skinLoadoutCol">
        {(['body', 'chest'] as const).map(renderSlotButton)}
      </div>

      <div className="buildLoadoutHero skinLoadoutHero">
        <div className="buildLoadoutOwl skinLoadoutOwl" data-rarity={rarity}>
          <OwlSkinCanvas selection={selection} size={144}/>
        </div>
        <a href={jetton.id ? `#jetton-${jetton.id}` : '#skin-jettons'} className="skinJettonMatch"
          onClick={event => {
            event.preventDefault();
            lightHaptic();
            const targetId = jetton.id ? `jetton-${jetton.id}` : 'skin-jettons';
            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}>
          <GameArt path={`/game/items/${jetton.file}`} size={18}/>
          <span>{copy(jetton.ru, jetton.en)}</span>
        </a>
      </div>

      <div className="buildLoadoutCol skinLoadoutCol">
        {(['hat', 'glasses', 'eyes'] as const).map(renderSlotButton)}
      </div>
    </div>

    <div className="skinQuickPresets" role="group" aria-label={copy('Готовые образы', 'Example skins')}>
      {skinPresets.slice(0, 4).map(preset => (
        <button key={preset.id} type="button" className="skinQuickChip"
          aria-pressed={presetId === preset.id}
          onClick={() => applyPreset(preset.id, preset.selection)}>
          <img src={artSrc(preset.thumb)} width="26" height="26" alt=""/>
          <span>#{preset.id}</span>
        </button>
      ))}
    </div>

    <div className="farmTotal" role="status">
      <GameArt path="/game/items/wise-coin.webp" size={30}/>
      <span>
        <strong id="farm-title" className="skinFarmHeading">{copy('Бонус к монетам', 'Coin farm bonus')}</strong>
        <small>
          {copy('Детали', 'Parts')} +{partsBonus}%
          {enchantBonus > 0 && ` · ${copy('заточка', 'enchant')} +${enchantBonus}%`}
          {extras > 0 && ` · ${copy('экип', 'gear')} +${extras}%`}
        </small>
      </span>
      <strong className="skinFarmTotalVal">+{total}%</strong>
    </div>

    <div className="skinEnchantBox">
      <div className="skinEnchantMeta">
        <GameArt path="/game/items/scroll-enchant-skin.webp" size={28}/>
        <div>
          <strong>{copy('Заточка скина', 'Skin enchant')}</strong>
          <small>
            {enchantLevel >= 20
              ? copy('Максимум +20 (+100%)', 'Max +20 (+100%)')
              : enchantBurn > 0
                ? copy(`На +${nextEnchantTarget}: ${enchantSuccess}% успех · ${enchantBurn}% риск 🔥`, `To +${nextEnchantTarget}: ${enchantSuccess}% ok · ${enchantBurn}% burn 🔥`)
                : copy(`На +${nextEnchantTarget}: 100% без сгорания`, `To +${nextEnchantTarget}: 100% safe`)}
          </small>
        </div>
      </div>
      <div className="buildStatStep skinEnchantStep">
        <button type="button" aria-label={copy('Уменьшить заточку', 'Decrease enchant')}
          disabled={enchantLevel <= 0}
          onClick={() => { lightHaptic(); setEnchant(enchantLevel <= 1 ? '' : String(enchantLevel - 1)); }}>−</button>
        <input aria-label={copy('Уровень заточки скина', 'Skin enchant level')}
          value={enchant} placeholder="0" inputMode="numeric" maxLength={2}
          onChange={event => setEnchant(enchantValue(event.target.value, 20))}/>
        <button type="button" aria-label={copy('Увеличить заточку', 'Increase enchant')}
          disabled={enchantLevel >= 20}
          onClick={() => { lightHaptic(); setEnchant(String(enchantLevel + 1)); }}>+</button>
      </div>
    </div>

    <details className="mediaDetails farmExtras" id="farm-equipment">
      <summary><GameGlyph name="shield"/><strong>{copy('Кольца, артефакт и лига', 'Rings, artifact & league')}</strong>
        {extras > 0 && <b className="farmExtrasValue">+{extras}%</b>}
      </summary>
      <div className="calculatorGrid">
        <label className="field">{copy('Сумма заточек колец', 'Total ring enchant')}
          <input value={gear.rings} inputMode="numeric" maxLength={2} placeholder="0"
            onChange={event => setGear({ ...gear, rings: enchantValue(event.target.value, 60) })}/>
        </label>
        <label className="field">{copy('Боевая лига', 'Battle league')}
          <select value={gear.league} onChange={event => setGear({ ...gear, league: Number(event.target.value) })}>
            <option value={0}>{copy('Без бонуса', 'No bonus')}</option>
            {battleLeagues.map(([name], index) => <option key={name} value={index + 1}>{name} +{index + 1}%</option>)}
          </select>
        </label>
      </div>
      <label className="farmArtifact"><input type="checkbox" checked={gear.artifact}
        onChange={event => setGear({ ...gear, artifact: event.target.checked })}/> {copy('Монтмориллонит +10%', 'Montmorillonite +10%')}</label>
      <DetailLink to="/assets/gear" className="textLink skinEnchantLink">{copy('Таблица шансов заточки', 'Enchant odds table')}</DetailLink>
    </details>

    {activeSlot && <SkinModal
      title={`${copy(skinSlotMeta[activeSlot].ru, skinSlotMeta[activeSlot].en)}`}
      closeLabel={copy('Закрыть', 'Close')}
      onClose={() => setActiveSlot(null)}>
      <div className="buildPickerOptions">
        <button type="button" className="buildPickerOption skinOptionRow"
          aria-pressed={selection[activeSlot] === null}
          onClick={() => { applySlot(activeSlot, null); setActiveSlot(null); }}>
          <span className="skinOptionIcon"><SlotGlyph slot={activeSlot}/></span>
          <span>
            <strong>{activeSlot === 'body' ? copy('Без скина (базовая сова)', 'None (base owl)') : copy('Снять предмет', 'Unequip')}</strong>
            <small>{copy('0% к фарму монет', '0% coin bonus')}</small>
          </span>
          <span className="buildPickerCheck" aria-hidden="true">{selection[activeSlot] === null ? '✓' : ''}</span>
        </button>
        {skinTraitsBySlot[activeSlot].map(option => {
          const selected = selection[activeSlot] === option.key;
          return <button key={option.key} type="button" className="buildPickerOption skinOptionRow"
            aria-pressed={selected}
            onClick={() => { applySlot(activeSlot, option.key); setActiveSlot(null); }}>
            {activeSlot === 'body' && bodySwatches[option.key]
              ? <span className="skinColorDot skinOptionDot" style={{ background: bodySwatches[option.key] }} aria-hidden="true"/>
              : <span className="skinOptionIcon" aria-hidden="true"><SlotGlyph slot={activeSlot}/></span>}
            <span>
              <strong>{copy(option.ru, option.en)}</strong>
              <small>+{option.bonus}% {copy('к монетам', 'coin bonus')}</small>
            </span>
            <span className="buildPickerCheck" aria-hidden="true">{selected ? '✓' : ''}</span>
          </button>;
        })}
      </div>
    </SkinModal>}

    {presetModalOpen && <SkinModal
      title={copy('Примеры и поиск по №', 'Presets & Skin ID')}
      closeLabel={copy('Закрыть', 'Close')}
      onClose={() => setPresetModalOpen(false)}>
      <form className="skinIdLookup" onSubmit={event => { event.preventDefault(); void lookupSkinById(); }}>
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
            onClick={() => { applyPreset(preset.id, preset.selection); setPresetModalOpen(false); }}>
            <img className="skinPresetThumb" src={artSrc(preset.thumb)} width="38" height="38" alt=""/>
            <span>
              <strong>{copy(preset.nameRu, preset.nameEn)} · #{preset.id}</strong>
              <small>+{bonus}% {copy('без заточки', 'base bonus')}</small>
            </span>
            <span className="buildPickerCheck" aria-hidden="true">{selected ? '✓' : ''}</span>
          </button>;
        })}
      </div>
    </SkinModal>}
  </section>;
}

function SkinModal({ title, closeLabel, onClose, children }: {
  title: string; closeLabel: string; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useModal(ref, true);
  return <dialog className="modal buildPickerModal" ref={ref} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialogBody">
      <header className="buildHeading"><h2 id={titleId} data-dialog-title tabIndex={-1}>{title}</h2>
        <button className="close" type="button" aria-label={closeLabel} onClick={onClose}>×</button></header>
      {children}
    </div>
  </dialog>;
}
