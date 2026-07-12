# Kaosan Live

線画イラスト1枚を、マイク音声に合わせて動かす個人利用向け Electron アバターアプリです。
OBS Studio の Window Capture と Virtual Camera で Zoom などへ渡す前提です。

## 起動

```sh
npm install
npm run dev
```

## 使い方

1. Control Window で `画像選択` を押して PNG/JPG/JPEG を読み込みます。
2. `Avatar Window起動` でOBS用の表示専用ウィンドウを開きます。
3. 口、目、画像位置、背景色、解像度、FPSをスライダーで調整します。
4. `マイクON` で音声解析を開始します。
5. OBS Studio の Window Capture で `Kaosan Live Avatar` を選びます。
6. OBS Virtual Camera を開始し、Zoom 側で `OBS Virtual Camera` を選びます。

## 実装済み

- Electron + Vite + TypeScript
- Control Window / Avatar Window
- Canvas 画像表示
- ベジェ曲線による動的な口
- 口消しパッチ
- マイク入力のRMS/ピーク/周波数傾向解析
- ノイズゲート、アタック/リリース、スムージング
- A/I/U/O風の口形ブレンド
- 自動瞬き、二連続瞬き
- 待機揺れ、話し中バウンス、瞬き沈み
- OBS向け背景色、1280x720 / 1920x1080、30fps / 60fps
- 常に最前面、フルスクリーン、デバッグ表示
- 設定JSONの保存、読み込み、別名保存

## 確認

```sh
npm run typecheck
npm run build
```

## 開発再開用ドキュメント

開発状況、設計判断、検証結果、次の作業は `DEVELOPMENT_PROGRESS.md` に集約しています。

## 設定保存先

通常保存は Electron の `userData` 配下に `settings.json` として保存します。
`別名保存` を使うと任意の場所へ JSON を書き出せます。
