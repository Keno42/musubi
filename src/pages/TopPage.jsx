import { Link } from 'react-router-dom';

export default function TopPage() {
  return (
    <div className="page page--top">
      <h1>Musubi</h1>
      <p>
        Musubi は、地域の中で「行きたい」「手伝える」を安全につなぐための試作サービスです。
      </p>
      <p>この画面は検討用プロトタイプです。</p>
      <p>
        v2.5ではデータ保存と状態更新を行いますが、実際のメール送信は行われません。
      </p>
      <p>
        本番運用前に、入力項目・運用手順・安全確認の妥当性を確認するためのものです。
      </p>

      <div className="notice-box">
        <p>このプロトタイプにはデータ保存機能があります。</p>
        <p>
          本番運用前の試験では、実在する利用者の個人情報・詳細住所・緊急性のある情報は入力しないでください。
        </p>
      </div>

      <nav className="top-nav">
        <Link className="btn btn--primary btn--large" to="/user">利用者の方はこちら</Link>
        <Link className="btn btn--primary btn--large" to="/supporter">サポーターの方はこちら</Link>
        <Link className="btn btn--secondary btn--large" to="/admin">管理者の方はこちら</Link>
      </nav>
    </div>
  );
}
