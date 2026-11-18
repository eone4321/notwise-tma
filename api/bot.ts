export const config = {
  runtime: 'edge',
};

const BOT_TOKEN = '9241156948:AAHDZUWr0tzimNPMOOYOoqJ0YOdE0cLPJCQ';
const TMA_URL = 'https://notwise-tma.vercel.app';
const BANNER_URL = `${TMA_URL}/banner.png`;

async function callTelegram(method: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API error (${method}):`, err);
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

  try {
    const update = await req.json();
    const message = update?.message;

    if (message?.text && message.chat?.id) {
      const chatId = message.chat.id;
      const text = message.text.trim();

      if (text.startsWith('/start')) {
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
          '🦉 **NOT Wise Guide** — интерактивная база знаний и аналитика по игре **NOT Wise: The GAME** на TON.\n\n' +
          'Гайды по прокачке, шансы дропа из капсул, механика сов и яиц, боевые билды, актуальные цены Getgems и котировки токенов в реальном времени.';

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
            ],
          },
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
