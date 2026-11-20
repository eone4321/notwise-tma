import { DetailLink } from '../ui/DetailLink';
import { trackGuide } from './guideAnalytics';
import { channelInvite } from '../domain/guide-links';
import { artSrc } from '../ui/warmArt';
import { GramEstimate } from './GamePrice';
import { useRef, useState } from 'react';
import { openTelegramInvoice, telegramPopup } from '../telegram/client';
import { useGuideLocale } from './guideLocale';

const wallet = 'UQDm9yL64jkyN-3ejCnfmcVLq_zZu2u4YjR3qWg5w6itHPgz';
const presets = [1, 3, 5, 10, 25, 50, 100, 250, 500, 1000];
const starsRu = new Intl.NumberFormat('ru-RU');
const starsEn = new Intl.NumberFormat('en-US');

async function paymentConfirmed(id: string, initData: string) {
  const response = await fetch(`/api/donations/${encodeURIComponent(id)}`, {
    headers: { Authorization: `tma ${initData}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Payment status unavailable');
  const result = await response.json();
  return result.state === 'paid';
}

export function SupportPage({ isAdmin }: { isAdmin: boolean }) {
  const { locale } = useGuideLocale();
  const en = locale === 'en';
  const stars = en ? starsEn : starsRu;
  const [amount, setAmount] = useState(5);
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState('');
  const [busy, setBusy] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const walletField = useRef<HTMLTextAreaElement>(null);
  const orderKey = useRef<{ amount: number; key: string } | null>(null);

  async function donate() {
    const initData = telegramPopup()?.initData;
    if (!initData) {
      setMessage(en ? 'Open the guide in Telegram to support the project with Stars.' : 'Открой гайд в Telegram, чтобы поддержать проект звёздами.');
      return;
    }
    setBusy(true);
    if (!orderKey.current || orderKey.current.amount !== amount) orderKey.current = { amount, key: crypto.randomUUID() };
    setOrder('');
    setMessage(en ? 'Creating invoice…' : 'Создаём счёт…');
    try {
      const response = await fetch('/api/donations/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${initData}`,
          'Idempotency-Key': orderKey.current.key,
        },
        body: JSON.stringify({ amountStars: amount }),
      });
      if (!response.ok) throw new Error('Invoice unavailable');
      const { id, invoiceUrl } = await response.json();
      orderKey.current = null;
      setOrder(id);
      setMessage(en ? 'Waiting for payment confirmation…' : 'Ожидаем подтверждение оплаты…');
      const result = await openTelegramInvoice(invoiceUrl);
      if (result === 'paid') {
        for (let attempt = 0; attempt < 10; attempt++) {
          if (await paymentConfirmed(id, initData)) {
            setOrder('');
            setMessage(en ? 'Thank you for your support! ⭐' : 'Спасибо за поддержку! ⭐');
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
        setMessage(en ? 'Payment is still being verified. Tap "Check payment".' : 'Оплата ещё проверяется. Нажми «Проверить оплату».');
      } else if (result === 'cancelled' || result === 'failed') {
        setOrder('');
        setMessage(result === 'cancelled' ? (en ? 'Payment cancelled.' : 'Оплата отменена.') : (en ? 'Payment failed.' : 'Оплата не прошла.'));
      } else {
        setMessage(en ? 'Invoice opened in Telegram. You can check the payment status here after paying.' : 'Счёт открыт в Telegram. После оплаты можно проверить статус здесь.');
      }
    } catch {
      setMessage(orderKey.current
        ? (en ? 'Could not create invoice. Please try again.' : 'Не удалось создать счёт. Попробуй ещё раз.')
        : (en ? 'Could not verify payment. If you already paid, check the status.' : 'Не удалось проверить оплату. Если счёт уже оплачен, проверь статус.'));
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    const initData = telegramPopup()?.initData;
    if (!initData || !order) return;
    setBusy(true);
    try {
      if (await paymentConfirmed(order, initData)) {
        setOrder('');
        setMessage(en ? 'Thank you for your support! ⭐' : 'Спасибо за поддержку! ⭐');
      } else {
        setMessage(en ? 'No payment confirmation yet.' : 'Подтверждения оплаты пока нет.');
      }
    } catch {
      setMessage(en ? 'Could not verify payment. Please try again.' : 'Не удалось проверить оплату. Попробуй ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  async function copyWallet() {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopyStatus(en ? 'Address copied.' : 'Адрес скопирован.');
    } catch {
      walletField.current?.focus();
      walletField.current?.select();
      setCopyStatus(en ? 'Address selected. You can copy it manually.' : 'Адрес выделен. Его можно скопировать вручную.');
    }
  }

  return <>
    <section className="card aboutGuide">
      <div className="mediaHeading"><img src={artSrc('/brand/notwise.svg')} width="36" height="36" alt=""/>
        <h2>NOT Wise Guide</h2></div>
      <p>{en ? 'We built an interactive knowledge base and market radar for NOT Wise: The GAME on TON.' : 'Мы собрали интерактивную базу знаний и аналитику по NOT Wise: The GAME на TON.'}</p>
      <p>{en ? 'The guide covers leveling, owl care, combat skills, and capsule & egg drop rates.' : 'В гайде собраны прокачка, уход за совой, боевые навыки и награды из капсул и яиц.'}</p>
      <p>{en ? 'Live Getgems floor prices and token rates are updated here too.' : 'Здесь же обновляются цены Getgems и курсы токенов.'}</p>
      <a className="textLink aboutSignature" href={channelInvite} onClick={() => trackGuide('action:channel')}>
        <img src={artSrc('/brand/cryptoone.svg')} width="18" height="19" alt=""/>CryptoOne | MEDIA &amp; PRO ХОМЯКИ
      </a>
    </section>
    <div className="sectionHeading"><h2>{en ? 'Support the project' : 'Поддержать проект'}</h2>
      <p className="caption">{en ? 'Donations help cover server costs and develop the guide.' : 'Донаты помогают оплачивать сервер и развивать гайд.'}</p>
    </div>
    <section className="card">
      <h2>Telegram Stars</h2>
      <p>{en ? 'Pick an amount.' : 'Выбери удобную сумму.'}</p>
      <div className="pills donationAmounts" aria-label={en ? 'Amount in Stars' : 'Сумма в Stars'}>
        {presets.map(value => <button className="amount" aria-pressed={amount === value} disabled={busy}
          key={value} onClick={() => setAmount(value)}>{stars.format(value)} ⭐</button>)}
      </div>
      <p className="caption donationEquivalent">{en ? 'GRAM equivalent' : 'Эквивалент в GRAM'} <GramEstimate stars={amount} purpose="support" showUnavailable/></p>
      <button className="primary" onClick={donate} disabled={busy}>{en ? `Support with ${stars.format(amount)} ⭐` : `Поддержать на ${stars.format(amount)} ⭐`}</button>
      {message && <p className="supportStatus" role="status">{message}</p>}
      {order && <button className="secondary" onClick={check} disabled={busy}>{en ? 'Check payment' : 'Проверить оплату'}</button>}
    </section>
    <section className="card">
      <div className="walletHeading"><img src={artSrc('/brand/tokens/gram.png')} alt="" width="30" height="30"/><h2>{en ? 'GRAM transfer' : 'Перевод в GRAM'}</h2></div>
      <p>{en ? 'Copy the address and send any amount of GRAM from your TON wallet.' : 'Скопируй адрес и отправь любую сумму GRAM через свой кошелёк в сети TON.'}</p>
      <label className="field">{en ? 'Wallet address' : 'Адрес кошелька'}
        <textarea className="walletAddress" ref={walletField} rows={2} readOnly value={wallet} onFocus={event => event.currentTarget.select()}/>
      </label>
      <button className="secondary" onClick={copyWallet}>{en ? 'Copy address' : 'Скопировать адрес'}</button>
      {copyStatus && <p className="supportStatus" role="status">{copyStatus}</p>}
    </section>
    <section className="card supporterCollection">
      <img src={artSrc('/brand/collections/prohamsters.jpg')} width="800" height="431" alt={en ? 'PRO HAMSTERS collection by CryptoOne' : 'Коллекция PRO ХОМЯКИ от CryptoOne'}/>
      <div><h2>PRO ХОМЯКИ</h2><p>{en ? '100 NFTs · private chat' : '100 NFT · закрытый чат'}</p></div>
      <p>{en ? 'NFT holders get access to the private market community chat brought together by CryptoOne since 2022.' : 'Владелец NFT получает доступ в закрытый чат сообщества участников рынка. CryptoOne объединяет их с 2022 года.'}</p>
      <a className="secondary" href="https://getgems.io/prohamsters" target="_blank" rel="noreferrer">{en ? 'Open on Getgems' : 'Открыть на Getgems'}</a>
    </section>
    <section className="card">
      <h2>{en ? 'Guide analytics' : 'Статистика гайда'}</h2>
      <p>{en ? 'In Telegram we count section views and link taps in aggregate statistics. Message content and personal links are never recorded.' : 'В Telegram считаем открытия разделов и нажатия на ссылки в сводной статистике. Содержимое сообщений и личные ссылки в отчёт не попадают.'}</p>
      {isAdmin && <DetailLink to="/admin" className="textLink">{en ? 'Open admin panel' : 'Открыть админку'}</DetailLink>}
    </section>
    <details className="card" id="game-settings">
      <summary><strong>{en ? 'NOT Wise game settings' : 'Настройки игры NOT Wise'}</strong></summary>
      <dl className="analyticsRows">
        <div><dt>{en ? 'Graphics' : 'Графика'}</dt><dd>{en ? 'Three modes' : 'Три режима'}</dd></div>
        <div><dt>{en ? 'Shadows & glow' : 'Тени и свечение'}</dt><dd>{en ? 'Separate toggles' : 'Отдельные переключатели'}</dd></div>
        <div><dt>{en ? 'Weather, tilt & sound' : 'Погода, наклон и звук'}</dt><dd>{en ? 'Optional' : 'По желанию'}</dd></div>
      </dl>
      <p>{en ? 'Performance mode disables shadows and glow. Medium enables shadows, and High adds glow. Available modes depend on your device.' : 'Производительный режим убирает тени и свечение. Средний включает тени, максимальный — ещё и свечение. Набор режимов зависит от устройства.'}</p>
      <p>{en ? 'Live weather requires location access. Tilt moves the camera at home and in the Dojo. Music and sound effects volume are adjusted separately.' : 'Живая погода требует доступа к геолокации. Наклон двигает камеру дома и в Додзе. Громкость музыки и эффектов настраивается отдельно.'}</p>
      <p>{en ? 'Language is switched via the button at the top of the in-game settings. Graphics, world, and audio changes are applied with "Save".' : 'Язык меняется кнопкой в верхней части настроек игры. Изменения графики, мира и звука подтверждаются кнопкой «Сохранить».'}</p>
    </details>
  </>;
}
