import { channelInvite } from '../src/domain/guide-links';
import { enableBotDelivery, setSalePreference } from '../server/guide-notifications';
import { answerCheckout, recordPayment, validWebhook } from '../server/donations';

export const config = {
  runtime: 'edge',
};

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const TMA_URL = 'https://notwise-tma.vercel.app';
const BANNER_URL = `${TMA_URL}/banner_v3.png`;

async function callTelegram(method: string, body: Record<string, unknown>) {
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN environment variable is not configured');
    return null;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch {
    console.error(`Telegram API error (${method})`);
    return null;
  }
}

export default async function handler(req: Request) {
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'ok', bot: '@NotWiseGuideBot', serverless: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!BOT_TOKEN || !await validWebhook(req, BOT_TOKEN)) return new Response('Forbidden', { status: 403 });

  try {
    const update = await req.json();
    const message = update?.message;
    if (update?.pre_checkout_query) await answerCheckout(BOT_TOKEN, update.pre_checkout_query);
    if (message?.write_access_allowed && message.chat?.type === 'private' && Number.isSafeInteger(message.chat.id)) {
      await enableBotDelivery(String(message.chat.id));
    }
    if (message?.successful_payment) await recordPayment(message.successful_payment, message.from?.id);

    if (message?.text && message.chat?.id) {
      const chatId = message.chat.id;
      const text = message.text.trim();
      const privateChat = message.chat.type === 'private' && chatId === message.from?.id;
      const enableSales = /^(?:\/owlsales(?:@NotWiseGuideBot)?|\/start(?:@NotWiseGuideBot)? owl_sales)$/i.test(text);
      const disableSales = /^\/stopowlsales(?:@NotWiseGuideBot)?$/i.test(text);
      if (privateChat && (enableSales || disableSales)) {
        if (enableSales) await enableBotDelivery(String(chatId));
        await setSalePreference(String(chatId), 'genesis', enableSales);
        await callTelegram('sendMessage', {
          chat_id: chatId,
          text: enableSales
            ? 'Уведомления включены. Пришлю новые продажи сов основной коллекции NOT Wise с ценой и ссылкой на Getgems. Отключить — /stopowlsales.'
            : 'Уведомления о продажах выключены. Включить — /owlsales.',
        });
        return Response.json({ ok: true });
      }

      if (text === '/paysupport' || text === '/paysupport@NotWiseGuideBot') {
        await callTelegram('sendMessage', {
          chat_id: chatId,
          text: `По вопросам платежей напиши в CryptoOne: ${channelInvite}. Укажи время платежа и сумму в Stars.`,
        });
      }
      if (privateChat && /^\/start(?:@NotWiseGuideBot)?(?: |$)/i.test(text)) {
        await enableBotDelivery(String(chatId));
        // 1. Устанавливаем системную кнопку Menu WebApp слева от поля ввода
        void callTelegram('setChatMenuButton', {
          chat_id: chatId,
          menu_button: {
            type: 'web_app',
            text: 'Guide 🦉',
            web_app: { url: TMA_URL },
          },
        });

        // 2. Отправляем приветственное сообщение с баннером и кнопкой открытия гайда
        const caption =
          '🦉 **NOT Wise Guide** — интерактивная база знаний и аналитика по игре **NOT Wise: The GAME** на TON\n\n' +
          'Гайды по прокачке, шансы дропа из капсул, механика сов и яиц, боевые билды, актуальные цены Getgems и котировки токенов в реальном времени\n\n' +
          'CryptoOne | MEDIA & PRO ХОМЯКИ';

        await callTelegram('sendPhoto', {
          chat_id: chatId,
          photo: BANNER_URL,
          caption,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📱 Открыть гайд',
                  web_app: { url: TMA_URL },
                },
              ],
              [{ text: 'Уведомления о продажах сов', url: 'https://t.me/NotWiseGuideBot?start=owl_sales' }],
            ],
          },
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    console.error('Webhook update failed');
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
