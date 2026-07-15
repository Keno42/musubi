// 実際の連絡先はリポジトリに書かない。本番デプロイ時のみ GitHub Environment
// 「Musubi」の secrets から VITE_EMERGENCY_CONTACT_* として注入される
// (.github/workflows/deploy.yml 参照)。未設定時はここに書いた
// プレースホルダのままになる。
const CONTACT_NAME = import.meta.env.VITE_EMERGENCY_CONTACT_NAME || 'ごっちゃまぜカフェ運営担当 / 結び管理者';
const CONTACT_EMAIL = import.meta.env.VITE_EMERGENCY_CONTACT_EMAIL || 'example@example.com';
const CONTACT_PHONE = import.meta.env.VITE_EMERGENCY_CONTACT_PHONE || '本番運用時に設定';

export default function EmergencyContactFooter() {
  return (
    <footer className="emergency-footer">
      <p className="emergency-footer__title">困ったとき・当日のトラブル時:</p>
      <p>{CONTACT_NAME}</p>
      <p>メール: {CONTACT_EMAIL}</p>
      <p>電話: {CONTACT_PHONE}</p>
    </footer>
  );
}
