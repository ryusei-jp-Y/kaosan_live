# Kaosan Live プライベート配布ガイド

この配布物は、信頼できる相手へ直接渡すApple Silicon Mac向けのアプリです。Developer IDによる公開用署名やAppleの公証は行わず、アプリ内部はアドホック署名しています。

## 配布するファイル

通常は次のDMGだけを渡します。

```text
Kaosan-Live-0.1.0-arm64.dmg
```

ZIPはDMGを使えない場合の予備です。

モデル画像とアプリアイコンは公開Gitに含めず、配布ビルド時だけローカルの `private-assets/` からアプリへ同梱します。

## インストール

1. DMGを開きます。
2. `Kaosan Live` を `Applications` へドラッグします。
3. Finderのアプリケーションフォルダで `Kaosan Live` を右クリックします。
4. `開く` を選び、確認画面でも `開く` を押します。
5. マイクの利用確認が表示されたら許可します。

macOSがアプリを開けない場合は、配布元を信頼できることを確認した上で次を実行します。

```sh
xattr -dr com.apple.quarantine "/Applications/Kaosan Live.app"
```

## OBSとZoom

1. OBS Studioをインストールします。
2. OBS初回起動時にCamera Extensionを許可します。
3. Kaosan Liveで `Avatarを表示` を押します。
4. OBSのmacOS Screen Captureで `Kaosan Live Avatar` を選びます。
5. OBSの `Start Virtual Camera` を押します。
6. Zoomのカメラで `OBS Virtual Camera` を選びます。

## 対応環境

- Apple Silicon搭載Mac
- macOS 12以降
- OBS Studio
- Zoomなど仮想カメラを選択できるアプリ

Intel Macではこの配布物を利用できません。Intel対応が必要な場合は別途Universal版を作成します。
