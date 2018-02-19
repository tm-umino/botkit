## windows環境構築

### node.jsのインストール
https://nodejs.org/en/
からnode.jsをダウンロード

```
node --version
```
```
npm --version
```
で正常にダウンロードできているか確認

### 事前準備
https://github.com/tm-umino/botkit/tree/tm-study-meeting

botkitフォルダに移動し、依存パッケージインストール
```
npm install
```

### 実行
```
set token=SLACK_API_TOKEN
node slack_bot2.js
```
