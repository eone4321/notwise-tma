import { useRef, useState } from 'react';
import { openTelegramInvoice, telegramPopup } from '../telegram/client';

const wallet = 'UQDm9yL64jkyN-3ejCnfmcVLq_zZu2u4YjR3qWg5w6itHPgz';
const presets = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
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
  const [amount, setAmount] = useState(100);
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState('');
  const [busy, setBusy] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const walletField = useRef<HTMLTextAreaElement>(null);

  async function donate() {
    const initData = telegramPopup()?.initData;
    if (!initData) {
      setMessage('Открой гайд в Telegram, чтобы поддержать проект звёздами.');
      return;
    }
    setBusy(true);
    setOrder('');
    setMessage('Создаём счёт…');
    try {
      const response = await fetch('/api/donations/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${initData}`,
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ amountStars: amount }),
      });
      if (!response.ok) throw new Error('Invoice unavailable');
      const { id, invoiceUrl } = await response.json();
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
      setMessage('Не удалось подтвердить операцию. Если оплата уже была, проверь её статус.');
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
    <p className="intro">Донаты помогают оплачивать сервер и развивать гайд.</p>
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
    <section className="card">
      <h2>Вопросы об оплате</h2>
      <p>Напиши боту команду /paysupport или обратись к @cryptoeone.</p>
      <a className="textLink" href="https://t.me/NotWiseGuideBot">Открыть бота</a>
    </section>
  </>;
}
