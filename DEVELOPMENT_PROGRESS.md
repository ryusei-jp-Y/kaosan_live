# Kaosan Live Development Progress

最終更新: 2026-07-12

このドキュメントは、別端末・別セッションで開発を再開するときに、プロジェクトの現在地を失わないための引き継ぎメモです。

## プロジェクト概要

Kaosan Live は、1枚の線画イラストをマイク音声に合わせて動かす個人利用向け Electron デスクトップアプリです。

主な用途:

- Zoomなどのオンライン会議で、自分の代わりに線画アバターを表示する。
- アプリ自体は仮想カメラを出力しない。
- OBS Studio の Window Capture と OBS Virtual Camera を使って Zoom に渡す。

想定OS:

- macOS優先

現在の技術構成:

- Electron
- Vite
- TypeScript
- HTML Canvas
- Web Audio API
- JSON設定保存

## 起動方法

```sh
cd /Users/ymn/git/kaosan_live
npm install
npm run dev
```

Control Window が起動します。Control Window から `Avatar Window起動` を押すと OBS でキャプチャする表示専用ウィンドウが開きます。

## 検証コマンド

```sh
npm run typecheck
npm run build
npm audit
node --check electron/main.cjs
node --check electron/preload.cjs
```

直近の確認結果:

- `npm run typecheck`: 成功
- `npm run build`: 成功
- `npm audit`: 0 vulnerabilities
- Electron main/preload 構文チェック: 成功

注意:

- GUI実機確認、マイク権限、OBS連携、Zoom表示は未確認。
- 次に作業を再開したら、まず `TODO.md` の P0 を実施する。

## 主要ファイル

- `package.json`: npm scripts と依存関係
- `electron/main.cjs`: Electron main process、ウィンドウ作成、設定保存、画像用カスタムプロトコル
- `electron/preload.cjs`: Renderer に公開する安全な IPC API
- `src/control.ts`: Control Window のUI、設定操作、マイク開始停止、手動プレビュー
- `src/avatar.ts`: Avatar Window の状態受信と描画起動
- `src/avatarRenderer.ts`: Canvas描画エンジン
- `src/audio.ts`: Web Audio API によるマイク解析
- `src/defaults.ts`: renderer側の既定設定と設定マージ
- `src/types.ts`: 設定型、リップシンク状態型
- `src/bus.ts`: BroadcastChannel による Control / Avatar 間状態共有
- `src/media.ts`: ローカル画像パスを `kaosan-file://` URL へ変換
- `src/styles/control.css`: Control Window UI
- `src/styles/avatar.css`: Avatar Window 表示
- `README.md`: ユーザー向け起動・利用手順
- `TODO.md`: 次に実施する作業リスト

## 現在実装済み

アプリ基盤:

- Electron + Vite + TypeScript 構成
- Control Window / Avatar Window の2ウィンドウ構成
- Control Window から Avatar Window 起動
- 設定JSONの読み込み、保存、別名保存
- Electron `userData/settings.json` への通常保存

Canvas描画:

- 画像ファイル読み込み
- Canvas上への画像配置
- 表示位置、スケール、回転の調整
- 背景色の変更
- 口消しパッチ
- ベジェ曲線による動的な口描画
- 手描き風の微細な揺らぎ
- 瞬き時の目消しパッチと閉じ目線
- 待機揺れ、話し中バウンス、瞬き沈み
- デバッグ表示

リップシンク:

- マイク入力
- RMS音量
- ピーク音量
- ノイズゲート
- 音量正規化
- アタック/リリース制御
- 周波数帯の簡易解析
- `mouthOpen`, `mouthWide`, `mouthRound`, `smile`, `talkIntensity` 生成
- A/I/U/O風の口形ブレンド
- 手動プレビュー

瞬き:

- 自動ランダム瞬き
- 二連続瞬き
- 瞬き有効/無効
- 瞬き間隔、速度、閉じ目幅、線幅の調整
- 左右の目位置調整

OBS向け:

- Avatar Window はUIなし
- 1280x720 / 1920x1080
- 30fps / 60fps
- 背景色変更
- 常に最前面
- フルスクリーン

## 重要な設計判断

### 仮想カメラは実装しない

仕様通り、アプリから仮想カメラを直接出力しない。OBS Studio の Window Capture と Virtual Camera を使う。

### 口は画像差し替えではなく Canvas ベジェ曲線

元画像の口部分をパッチで隠し、その上に動的な口を描画する。今後の調整は `src/avatarRenderer.ts` の `drawMouth` が中心。

### ローカル画像は `file://` ではなく `kaosan-file://`

レビューで `webSecurity: false` と `file://` 直接読み込みを避ける修正を実施済み。

現在は `electron/main.cjs` で `kaosan-file` カスタムプロトコルを登録し、`.png`, `.jpg`, `.jpeg` のみ返す。

関連箇所:

- `electron/main.cjs`: `protocol.registerSchemesAsPrivileged`, `handleLocalImageRequest`
- `src/media.ts`: `filePathToUrl`

### Control / Avatar 間通信

Control Window と Avatar Window の状態同期は `BroadcastChannel("kaosan-live-state")` を使う。

保存済み設定の反映やウィンドウネイティブ設定の反映は IPC も併用する。

## 直近レビューで修正した内容

- `webSecurity: false` を削除
- ローカル画像読み込みを `kaosan-file://` 専用プロトコル化
- Electron main 側にも深い設定マージを追加
- Avatar Window 既存起動時にもサイズ、フルスクリーン、最前面、背景色を反映
- 設定読み込み後に Preview Canvas renderer を再生成
- 手動プレビューOFF時に Avatar Window を最新リップシンク状態へ戻す
- マイク一覧取得時の不要な権限要求を削除
- マイク停止時に音声解析内部状態をリセット
- 画像読み込み失敗時の表示メッセージを追加
- `TODO.md` を追加

## 既知の未確認事項

次回作業開始時に優先確認すること:

- `npm run dev` で Control Window が開くか
- `Avatar Window起動` で表示専用ウィンドウが開くか
- 画像選択後、プレビューとAvatar Windowの両方に画像が出るか
- macOS のマイク権限ダイアログ後に `マイクON` が動くか
- Control Window の各スライダーが Avatar Window に即時反映されるか
- 手動プレビューON/OFFで Avatar Window の口が戻るか
- OBS Studio の Window Capture で `Kaosan Live Avatar` が選択できるか
- OBS Virtual Camera 経由で Zoom に表示できるか

## 次の作業順

基本方針:

まず実機運用の詰まりを潰し、その後に表現品質を上げる。

1. `TODO.md` の P0 を実施する。
2. 実際の線画イラストで、口・目・画像位置の初期値を調整する。
3. Control Window に音量値、口開き、無音判定を数値表示する。
4. 口形プリセットをUIから手動選択できるようにする。
5. 画像ごとのプリセット保存一覧を作る。
6. Electron Builder で macOS アプリ化する。

## 注意点

- `dist/` はビルド成果物。ソース修正は `src/`, `electron/`, HTML, CSS を編集する。
- `node_modules/` はコミット対象外。
- このプロジェクトは現時点では git repository ではなかった。必要なら次回 `git init` から始める。
- 設定保存先は Electron の `userData/settings.json`。手元の設定状態はリポジトリ内に残らない。
- OBS/Zoom連携は実装コードだけでは完了判定できない。必ず実機で Window Capture と Virtual Camera を確認する。

## 再開時の短いチェックリスト

```sh
cd /Users/ymn/git/kaosan_live
npm install
npm run typecheck
npm run build
npm audit
npm run dev
```

その後:

- 画像を選択
- Avatar Window 起動
- マイクON
- OBSでWindow Capture
- ZoomでOBS Virtual Camera選択
