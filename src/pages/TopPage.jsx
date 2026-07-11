import { Link } from 'react-router-dom';

export default function TopPage() {
  return (
    <div className="page page--top">
      <h1>結び</h1>
      <p>
        結びは、地域の中で「行きたい」「手伝える」を安全につなぐための試作サービスです。
      </p>
      <p>この画面は検討用の試作版です。実際のメール送信は行われません。</p>

      <div className="notice-box">
        <p>このプロトタイプにはデータ保存機能があります。</p>
        <p>
          本番運用前の試験では、実在する利用者の個人情報・詳細住所・緊急性のある情報は入力しないでください。
        </p>
        <p>お試しで登録するときは、実在しない名前・住所をお使いください。</p>
      </div>

      {/* 管理者入口は意図的に載せない(2026-07-11): 管理者は /admin の直接URLで入る。
          サイトを開いた関係者に管理者ログインを見せない・迷わせないための措置で、
          データ保護そのものは firestore.rules の admin クレーム判定が担う。 */}
      <nav className="top-nav">
        <Link className="btn btn--primary btn--large" to="/user">利用者の方はこちら</Link>
        <Link className="btn btn--primary btn--large" to="/supporter">サポーターの方はこちら</Link>
      </nav>
    </div>
  );
}
