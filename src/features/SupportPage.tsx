import { artSrc } from '../ui/warmArt';
import { useRef, useState } from 'react';
import { openTelegramInvoice, telegramPopup } from '../telegram/client';

const wallet = 'UQDm9yL64jkyN-3ejCnfmcVLq_zZu2u4YjR3qWg5w6itHPgz';
const presets = [1, 3, 5, 10, 25, 50, 100, 250, 500, 1000];
const stars = new Intl.NumberFormat('ru-RU');

async function paymentConfirmed(id: string, initData: string) {
  const response = await fetch(`/api/donations/${encodeURIComponent(id)}`, {
    headers: { Authorization: `tma ${initData}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Payment status unavailable');
  const result = await response.json();
  return result.state === 'paid';
}

export function SupportPage() {
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
      setMessage('Открой гайд в Telegram, чтобы поддержать проект звёздами.');
      return;
    }
    setBusy(true);
    if (!orderKey.current || orderKey.current.amount !== amount) orderKey.current = { amount, key: crypto.randomUUID() };
    setOrder('');
    setMessage('Создаём счёт…');
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
      setMessage('Ожидаем подтверждение оплаты…');
      const result = await openTelegramInvoice(invoiceUrl);
      if (result === 'paid') {
        for (let attempt = 0; attempt < 10; attempt++) {
          if (await paymentConfirmed(id, initData)) {
            setOrder('');
            setMessage('Спасибо за поддержку! ⭐');
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
        setMessage('Оплата ещё проверяется. Нажми «Проверить оплату».');
      } else if (result === 'cancelled' || result === 'failed') {
        setOrder('');
        setMessage(result === 'cancelled' ? 'Оплата отменена.' : 'Оплата не прошла.');
      } else {
        setMessage('Счёт открыт в Telegram. После оплаты можно проверить статус здесь.');
      }
    } catch {
      setMessage(orderKey.current
        ? 'Не удалось создать счёт. Попробуй ещё раз.'
        : 'Не удалось проверить оплату. Если счёт уже оплачен, проверь статус.');
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
        setMessage('Спасибо за поддержку! ⭐');
      } else {
        setMessage('Подтверждения оплаты пока нет.');
      }
    } catch {
      setMessage('Не удалось проверить оплату. Попробуй ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  async function copyWallet() {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopyStatus('Адрес скопирован.');
    } catch {
      walletField.current?.focus();
      walletField.current?.select();
      setCopyStatus('Адрес выделен. Его можно скопировать вручную.');
    }
  }

  return <>
    <section className="card aboutGuide">
      <div className="mediaHeading"><img src={artSrc('/brand/notwise.svg')} width="36" height="36" alt=""/>
        <h2>NOT Wise Guide</h2></div>
      <p>Мы собрали интерактивную базу знаний и аналитику по NOT Wise: The GAME на TON.</p>
      <p>Здесь можно разобраться в прокачке и уходе за совой, подобрать боевой билд и узнать, что выпадает из капсул и яиц. Цены Getgems и котировки токенов обновляются автоматически.</p>
      <a className="textLink aboutSignature" href="https://t.me/cryptoeone">
        <img src={artSrc('/brand/cryptoone.svg')} width="18" height="19" alt=""/>CryptoOne | MEDIA &amp; PRO ХОМЯКИ
      </a>
    </section>
    <div className="sectionHeading"><h2>Поддержать проект</h2>
      <p className="caption">Донаты помогают оплачивать сервер и развивать гайд.</p>
    </div>
    <section className="card">
      <h2>Telegram Stars</h2>
      <p>Выбери удобную сумму.</p>
      <div className="pills donationAmounts" aria-label="Сумма в Stars">
        {presets.map(value => <button className="amount" aria-pressed={amount === value} disabled={busy}
          key={value} onClick={() => setAmount(value)}>{stars.format(value)} ⭐</button>)}
      </div>
      <button className="primary" onClick={donate} disabled={busy}>Поддержать на {stars.format(amount)} ⭐</button>
      {message && <p className="supportStatus" role="status">{message}</p>}
      {order && <button className="secondary" onClick={check} disabled={busy}>Проверить оплату</button>}
    </section>
    <section className="card">
      <div className="walletHeading"><img src="/brand/tokens/gram.png" alt="" width="30" height="30"/><h2>Перевод в GRAM</h2></div>
      <p>Скопируй адрес и отправь любую сумму GRAM через свой кошелёк в сети TON.</p>
      <label className="field">Адрес кошелька
        <textarea className="walletAddress" ref={walletField} rows={2} readOnly value={wallet} onFocus={event => event.currentTarget.select()}/>
      </label>
      <button className="secondary" onClick={copyWallet}>Скопировать адрес</button>
      {copyStatus && <p className="supportStatus" role="status">{copyStatus}</p>}
    </section>
    <section className="card supporterCollection">
      <img src={artSrc('/brand/collections/prohamsters.jpg')} width="800" height="431" alt="Коллекция PRO ХОМЯКИ от CryptoOne"/>
      <div><h2>PRO ХОМЯКИ</h2><p>100 NFT · закрытый чат</p></div>
      <p>Владелец NFT получает доступ в закрытый чат сообщества участников рынка. CryptoOne объединяет их с 2022 года.</p>
      <a className="secondary" href="https://getgems.io/prohamsters" target="_blank" rel="noreferrer">Открыть на Getgems</a>
    </section>
  </>;
}
