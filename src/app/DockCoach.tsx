export function DockCoach({ step, onContinue }: { step: 'dock' | 'theme'; onContinue: () => void }) {
  return <aside className="dockCoach card" aria-labelledby="dock-coach-title">
    <h2 id="dock-coach-title">{step === 'dock' ? 'Одна кнопка для навигации' : 'Выбери оформление'}</h2>
    {step === 'dock' ? <dl>
      <div><dt>Один тап</dt><dd>На уровень выше</dd></div>
      <div><dt>Удержание</dt><dd>Сразу на главную</dd></div>
    </dl> : <p role="status">Тему можно поменять в разделе <strong>«Настройки» → «Оформление»</strong>.</p>}
    <button className="secondary" onClick={onContinue}>{step === 'dock' ? 'Дальше' : 'Понятно'}</button>
  </aside>;
}
