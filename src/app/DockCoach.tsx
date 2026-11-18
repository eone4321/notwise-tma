export function DockCoach({ onClose }: { onClose: () => void }) {
  return <aside className="dockCoach card" aria-labelledby="dock-coach-title">
    <h2 id="dock-coach-title">Одна кнопка для навигации</h2>
    <dl>
      <div><dt>Один тап</dt><dd>На уровень выше</dd></div>
      <div><dt>Удержание</dt><dd>Сразу на главную</dd></div>
    </dl>
    <button className="secondary" onClick={onClose}>Понятно</button>
  </aside>;
}
