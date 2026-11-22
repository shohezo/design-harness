// セクションの Story。見本ページ（ui/index.html）と同じマークアップを使う
export default { title: 'Sections', parameters: { layout: 'fullscreen' } };

export const Hero = () => `
  <section class="hero"><div class="wrap">
    <p class="overline">SINCE 2016</p>
    <h1 class="t-display-hero">朝7時、<br>焼きたてを。</h1>
    <p class="lead">国産小麦と自家製の酵母で、毎朝30種類のパンを焼いています。</p>
    <div class="hero__actions"><a class="btn btn--primary" href="#">取り置きを予約</a><a class="btn btn--line" href="#">メニューを見る</a></div>
  </div></section>`;

export const CtaBand = () => `
  <section class="cta-band"><div class="wrap">
    <h2 class="t-heading-section">前日までなら、取り置きできます。</h2>
    <p>予約フォームから、受け取りの日とパンを選んでください。</p>
    <a class="btn btn--inverse" href="#">取り置きを予約</a>
  </div></section>`;
