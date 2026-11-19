import { useState } from 'react';
import { syncTelegramTheme } from '../telegram/client';

const themeKey = 'notwise.guide.theme';

export function Appearance({ english = false }: { english?: boolean }) {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme === 'glass' ? 'glass' : 'graphite');
  return <section className="card" aria-labelledby="appearance-title">
    <h2 id="appearance-title">{english ? "Appearance" : "Оформление"}</h2>
    <div className="choiceBar themeChoices" role="group" aria-labelledby="appearance-title">
      {(['graphite', 'glass'] as const).map(value => <button key={value} type="button" aria-pressed={theme === value}
        onClick={() => {
          document.documentElement.dataset.theme = value;
          setTheme(value);
          syncTelegramTheme();
          try { localStorage.setItem(themeKey, value); } catch { /* Apply for the current visit. */ }
        }}>{value === 'graphite' ? english ? 'Graphite' : 'Графит' : english ? 'Game' : 'Игровая'}</button>)}
    </div>
  </section>;
}
