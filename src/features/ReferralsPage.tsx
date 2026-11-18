export function ReferralsPage() {
  return <>
    <p className="intro">Приглашай друзей в NOT Wise по своей игровой ссылке через бота CryptoOne.</p>
    <section className="card">
      <h2>Как подключиться</h2>
      <ol className="referralSteps">
        <li>Подпишись на канал <a className="inlineAction" href="https://t.me/cryptoeone">@cryptoeone</a>.</li>
        <li>В игре открой приглашение друзей и скопируй свою ссылку.</li>
        <li>Открой раздел «Партнёрка» в боте и нажми «Установить свой код из игры». Пришли скопированную ссылку.</li>
        <li>Скопируй личную ссылку на бота из раздела «Партнёрка» и отправь друзьям.</li>
      </ol>
      <a className="primary referralCta" href="https://t.me/NotWiseGuideBot?start=partner">Открыть партнёрку в боте</a>
    </section>
    <section className="card">
      <h2>Что увидят друзья</h2>
      <p>При входе через твою ссылку бот запомнит приглашение. Кнопка «Играть» в боте откроет игру по твоему коду, если ты его подключил.</p>
      <p>«Наш сквад» ведёт в общий сквад CryptoOne. Подписка нужна для подключения личного кода. Гайд доступен всем.</p>
    </section>
  </>;
}
