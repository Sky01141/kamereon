# MIMICRY (オンライン擬態ゲーム)

ステージの背景に合わせて自分をペイントし、ポーズを決めて隠れる。鬼はマップを探索して擬態プレイヤーを見破る。
ブラウザだけで遊べるオンライン対戦ゲーム。**素材・名称・UIはすべてオリジナル**(既存作品の素材は使用しない)。

## 技術構成
HTML / CSS / JavaScript (Canvas) + Node.js + Express + Socket.IO
GitHub → Render(Web Service)でデプロイ。

## 起動
```bash
npm install
cp .env.example .env   # 値を設定
npm run dev            # http://localhost:3000
```
Owner用ハッシュの作り方: `node -e "console.log(require('crypto').createHash('sha256').update('your-secret').digest('hex'))"`

## Renderへのデプロイ
1. GitHubにpush
2. Render: New → Web Service → リポジトリ選択
3. Build: `npm install` / Start: `npm start`
4. Environment に `OWNER_ID` `OWNER_SECRET_HASH` `IP_HASH_SALT` を設定
5. Health Check Path: `/health`
(無料枠はスリープするため、初回接続に時間がかかることがある → Loading Machine で「Server Connection」を表示する理由)

## 実装状況(v0.1)
実装済み: Loading/Title/設定/ルーム(Quick・作成・参加)/役割割当/Hide→Search→Resultループ/8x8ペイント(スポイト・Undo/Redo・不透明度・縞・グラデ)/ポーズ/Scan(失敗CD4秒)/サーバー側CAMOUFLAGE SCORE/チャット([OWNER]表示)/ログ窓/キーコンフィグ/お知らせ/通報/Owner(Shift+O+S→サーバー認証、Dashboard・Players・Rooms・Reports・Bans・Announce・Log、WARN/KICK/TEMP・PERM BAN、確認ダイアログ、操作ログ)
未実装・簡易: マップは1種(CITY)のみ・壁/階段の衝突なし、コントローラー、多言語、BGM再生(URL欄のみ)、スマホ操作、DB(現状 `data/state.json`)。
**注意**: このZIPは `npm install` 後の実機動作を未検証です。不具合は報告してください。

## フォルダ構成
- `public/` クライアント(`js/` に機能別モジュール、`assets/` に画像・音・マップ)
- `server/` 機能別マネージャー(room / player / ban / report / owner / announcement)
- `server.js` エントリーポイント

## セキュリティ方針
- サーバーが正。位置・状態はサーバーで検証する
- Owner権限は**サーバー側認証のみ**。`Shift+O+S` はパネルを開く入口にすぎない
- BAN判定はサーバー側。IP等は salt付きハッシュで最小限のみ保持
- Ownerの全操作を OwnerActionLog に記録、重要操作は確認画面つき
- 秘密情報は `.env` / Render環境変数のみ。コミットしない

## データモデル(分離管理・将来DB移行可)
Player / Room / Match / Ban / Report / Announcement / OwnerActionLog / ServerLog
最初はメモリ+JSON、後で PostgreSQL / MongoDB / Firebase へ差し替えできるよう、各managerにストレージ層を閉じ込める。

## 実装ロードマップ
| Phase | 内容 | 完了条件 |
|---|---|---|
| 0 | 雛形・Render接続確認 | `/health` が通り、Loading→Title が出る |
| 1 | **オフライン版の核**: 移動、Canvasペイント(スポイト/ブラシ/Undo)、ポーズ、1マップ、鬼のScan、CAMOUFLAGE SCORE | 1人で擬態→探索→判定まで遊べる |
| 2 | Socket.IO化 + 位置・状態のサーバー検証 | 2人で同じマップを動ける |
| 3 | Room / Quick Match / 役割割当 / フェーズ進行 / チャット | 一試合が最後まで進む |
| 4 | Paint同期(差分送信・サイズ上限) | 相手の擬態が見える |
| 5 | Owner認証 + Dashboard + ログ | 認証なしでOwnerイベントが拒否される |
| 6 | BAN / Kick / Report | 再接続してもBANが効く |
| 7 | Announcement + Settings + キーコンフィグ(LocalStorage) | 設定が保存される |
| 8 | サーバー監視 + マップ追加 + 演出・スマホ対応 | 負荷下でも安定 |

## 設計上の注意
- 中核体験は Paint → Position → Pose → Background → Search → Detection の連鎖。Phase 1で面白さを先に検証する
- Paintデータは容量が大きいので、低解像度キャンバス+圧縮+送信頻度制限を前提にする
- 鬼がScanを連打できないよう、失敗時クールダウンはサーバー側で管理
