# MOTHVOID1

既存版のメンテナンス用リポジトリ。現在の修正版は **v1.2.6**。
リメイクとは分けて、v1.2.5のゲーム内容を基準に安定性と管理構成を整える。

## 構成

```text
index.html                 公開入口（元と同じ場所）
css/style.css              画面・演出の見た目
src/runtime.js             更新ループ・ゲーム時間・ポーズ可能なタイマー
src/animation.js           敵9種類・蛾・パリィ・爆発のアトラス再生
src/game.js                状態、開始・終了、敵・アイテム、パリィ、得点
src/input.js               キーボード・タッチ操作
src/audio.js               BGM切替、SE、曲名表示
src/ranking.js             名前入力・ランキング表示
assets/images/             現在の画像・アニメーション
assets/audio/bgm/           BGM
assets/audio/se/            効果音
source-assets/alternates/  未使用のWebP候補・旧タイトルPNG・敵の旧GIF（保管）
docs/                      仕様・変更内容・素材調整の案内
tests/                     不具合の再発を確認するテスト
tools/                     ローカル確認・公開用ファイル作成
```

## 起動と確認

外部パッケージのインストールは通常不要。Node.jsを使う場合：

```text
node tools/serve.cjs
node --test tests/*.test.cjs
node tools/package.cjs
```

ローカルURLは `http://127.0.0.1:4173/`。`index.html` を直接開いても動作する。
`npm start`、`npm test`、`npm run build` も利用可能。
公開用の `dist/` は、入口とCSS・スクリプト・使用素材のみを含む生成物。
生成物とテスト画面はGit登録しない。

## GitHub公開

既存リポジトリは `MOFUMOFUKAI/moth_game`、既定ブランチは `main`。
GitHub Pagesの利用は確認済み。公開元ブランチ・フォルダの設定は未取得。
ルートの `index.html` と相対参照を維持しているため、現在の公開入口を維持できる。
`main` のルートを公開している場合、変更した入口・コード・素材を**同じコミットで**反映する。
`dist/` を使う公開方式では、生成した内容を公開対象にする。
CSSだけ、画像の移動だけなど一部分のみを公開しないこと。

修正前の状態：タグ `pre-maintenance-v1.2.5`（コミット `7d17da7`）。
修正ブランチ：`maintenance/v1-completion`。
現在はローカルの修正版。GitHubへのpush・公開切替は未実施。

変更内容と確認範囲は [docs/MAINTENANCE-v1.2.6.md](docs/MAINTENANCE-v1.2.6.md)。
敵アトラスの現在の構成は [docs/ENEMY-ATLAS-INTEGRATION.md](docs/ENEMY-ATLAS-INTEGRATION.md)。
ジャストパリィ演出は [docs/JUST-PARRY-ATLAS.md](docs/JUST-PARRY-ATLAS.md)。
通常パリィ・爆発は [docs/PARRY-BOMB-ATLAS.md](docs/PARRY-BOMB-ATLAS.md)。
蛾のドット絵と左右移動は [docs/MOTH-ATLAS.md](docs/MOTH-ATLAS.md)。
素材の調整案は [docs/ASSET-GUIDE.md](docs/ASSET-GUIDE.md)。
