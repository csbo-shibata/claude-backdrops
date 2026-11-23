# backdrops

Claude（デスクトップアプリ・モバイルアプリ）の会話の後ろに、動く背景を出すMODです。
`/backdrop` コマンドでいつでも切り替えられ、選んだ背景は次のセッションでも記憶されます。

| 背景 | 内容 |
| --- | --- |
| `matrix`（既定） | 0と1が3層の遠近感つきで降る。コンテキスト使用率が上がるほど列が増え、緑→黄→赤に変わる |
| `fish` | 魚が泳ぐ海の中。コンテキスト使用率が上がるほど泡が増える |
| `off` | 背景なし |

## インストール

ターミナルで動かしている Claude Code のプロンプトで:

```
/plugin install backdrops --marketplace csbo-shibata/claude-backdrops
```

`Add marketplace?` に `y`、スコープは user（一番上）を Enter で選びます。

シェルから:

```bash
claude plugin install backdrops --marketplace csbo-shibata/claude-backdrops
```

デスクトップアプリ（`/plugin` が使えない場合）: プロンプト欄の横の ＋ → Plugins → Add marketplace に `csbo-shibata/claude-backdrops` を入れ、Add plugin で backdrops を追加します。

## 使い方

```
/backdrop          今の背景と一覧を表示
/backdrop matrix   0と1の雨にする
/backdrop fish     魚の水槽にする
/backdrop off      背景を消す
```

背景はデスクトップアプリとモバイルアプリで表示されます（ターミナルやエディタには出ません）。
「視差効果を減らす」設定がオンの環境では、動きを止めた絵として表示されます。
