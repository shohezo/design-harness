// 部品の Story。状態（hover・focus・長い文字・空）も並べて、抜けを目で見つけられるようにする
export default { title: 'Parts' };

export const Buttons = () => `
  <div style="display:flex;flex-wrap:wrap;gap:var(--spacing-md);align-items:center">
    <a class="btn btn--primary" href="#">取り置きを予約</a>
    <a class="btn btn--line" href="#">メニューを見る</a>
    <a class="btn btn--primary btn--sm" href="#">小さいボタン</a>
  </div>
  <div style="margin-top:var(--spacing-xl);padding:var(--spacing-xl);background:var(--brand)">
    <a class="btn btn--inverse" href="#">色の上のボタン</a>
  </div>`;

export const Card = () => `
  <div class="card-grid">
    <article class="card"><span class="tag">素材</span><h3 class="t-heading-card">国産小麦だけ</h3><p>北海道と九州の小麦を、パンの種類ごとに配合を変えて使っています。</p></article>
    <article class="card"><span class="tag">長い見出し</span><h3 class="t-heading-card">見出しが長くて2行に折り返すときも、行間と余白が崩れないこと</h3><p>説明文も長い場合。</p></article>
    <article class="card"><span class="tag">本文なし</span><h3 class="t-heading-card">説明文が無いカード</h3></article>
  </div>`;

export const Tag = () => `<span class="tag">素材</span> <span class="tag">季節限定</span>`;

export const PriceTable = () => `
  <table class="price-table"><caption>価格はすべて税込みです。</caption><tbody>
    <tr><th scope="row">食パン（1斤）</th><td>420円</td></tr>
    <tr><th scope="row">名前がとても長い季節限定のパン（ナッツとドライフルーツ）</th><td>1,280円</td></tr>
  </tbody></table>`;
