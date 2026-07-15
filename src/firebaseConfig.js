// デプロイ先の識別情報(Firebaseプロジェクト)はこのrepoに置かない。
// このrepoはエンジンで、自分がどこにデプロイされるかを知らない、という
// レイヤ分離のため(値自体は公開identifierで秘密鍵ではない — handoff sec.9)。
// 本番ビルドは GitHub Environment「Musubi」の secret FIREBASE_CONFIG
// (コンソールのconfigを厳密なJSONにしたもの)を VITE_FIREBASE_CONFIG として
// 注入する(.github/workflows/deploy.yml 参照)。
// 未設定時は Emulator Suite 専用の demo 設定になり、実プロジェクトには
// 一切繋がらない。ローカルで実プロジェクトに繋ぎたい場合のみ、gitignore
// 済みの .env.local に VITE_FIREBASE_CONFIG を書くこと。
export const firebaseConfig = import.meta.env.VITE_FIREBASE_CONFIG
  ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG)
  : {
      apiKey: 'demo-api-key',
      authDomain: 'demo-musubi.firebaseapp.com',
      projectId: 'demo-musubi',
      appId: 'demo-app-id',
    };
