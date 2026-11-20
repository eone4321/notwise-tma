import { useGuideLocale } from '../features/guideLocale';

export function DockCoach({ step, onContinue }: { step: 'dock' | 'theme'; onContinue: () => void }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  return (
    <aside className="dockCoach card" aria-labelledby="dock-coach-title">
      <h2 id="dock-coach-title">
        {step === 'dock'
          ? (en ? 'One button for navigation' : 'Одна кнопка для навигации')
          : (en ? 'Theme and language' : 'Оформление и язык')}
      </h2>
      {step === 'dock' ? (
        <>
          <dl>
            <div>
              <dt>{en ? 'Single tap' : 'Один тап'}</dt>
              <dd>{en ? 'Go one level up' : 'На уровень выше'}</dd>
            </div>
            <div>
              <dt>{en ? 'Hold' : 'Удержание'}</dt>
              <dd>{en ? 'Jump to Home' : 'Сразу на главную'}</dd>
            </div>
          </dl>
          <p className="caption" style={{ margin: 0 }}>
            {en ? 'Tap the bottom navigation button to continue.' : 'Нажми на кнопку навигации внизу, чтобы продолжить.'}
          </p>
        </>
      ) : (
        <>
          <p role="status">
            {en ? (
              <>You can change the theme and interface language in <strong>“Settings” → “Appearance”</strong>.</>
            ) : (
              <>Тему оформления и язык можно поменять в разделе <strong>«Настройки» → «Оформление»</strong>.</>
            )}
          </p>
          <button className="secondary" type="button" onClick={onContinue}>
            {en ? 'Got it' : 'Понятно'}
          </button>
        </>
      )}
    </aside>
  );
}
