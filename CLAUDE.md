# Sound Reactive 3D Art

## Project Overview
Abletonの音にリアクティブに反応する没入型3D作品。
`getDisplayMedia({ audio: true })` でシステムオーディオをキャプチャし、
周波数解析結果でシェーダーベースのジオメトリを駆動する。

## Tech Stack
- **Build**: Vite
- **UI**: React 18 + TypeScript (strict)
- **3D**: @react-three/fiber + @react-three/drei
- **Audio**: Web Audio API (AnalyserNode)
- **Shader**: GLSL (vertex + fragment)

## Architecture Principles

### File Structure
```
src/
  main.tsx          # エントリポイント
  App.tsx           # Canvas + シーン構成
  hooks/            # カスタムフック（ロジック層）
    useAudio.ts     # Web Audio API / getDisplayMedia
    useFrequency.ts # 周波数解析・バンド分離
  components/       # R3Fコンポーネント（描画層）
    ReactiveOrb.tsx # メインビジュアル
  shaders/          # GLSLファイル
    orb.vert        # 頂点シェーダー
    orb.frag        # フラグメントシェーダー
  types/            # 型定義
    audio.ts        # オーディオ関連の型
  utils/            # ユーティリティ（純粋関数）
```

### Design Rules
1. **ロジックと描画の分離** — hooks/ にロジック、components/ に描画
2. **シェーダー活用** — ビジュアル変形はGPU側で処理。CPU側はuniformの更新のみ
3. **型安全** — `any` 禁止。AudioContext等のWeb API型も明示
4. **最小UI** — 画面タップで音声キャプチャ開始するのみ。UIコンポーネント不要
5. **シンプル** — 抽象化は必要になるまで作らない。1ファイルで済むなら1ファイル
6. **パフォーマンス** — useFrame内でのアロケーション禁止。refで状態管理

### Coding Conventions
- 関数コンポーネント + hooks のみ（classは使わない）
- `export default` は使わない → named export のみ
- シェーダーは `.vert` / `.frag` ファイルに分離し、raw importする
- 定数は UPPER_SNAKE_CASE
- hooks は `use` プレフィックス
- コメントは「なぜ」だけ書く。「何を」は書かない

### Audio Pipeline
```
getDisplayMedia({ audio: true })
  → MediaStreamSource
  → AnalyserNode (fftSize: 2048)
  → getByteFrequencyData()
  → バンド分離 (low / mid / high)
  → uniform として shader に渡す
```

### Shader Uniforms Convention
```glsl
uniform float uTime;       // 経過時間
uniform float uBass;       // 低音域 (0.0 - 1.0, normalized)
uniform float uMid;        // 中音域 (0.0 - 1.0)
uniform float uTreble;     // 高音域 (0.0 - 1.0)
uniform float uVolume;     // 全体音量 (0.0 - 1.0)
```

### Git
- コミットメッセージは日本語OK
- 機能単位でコミット

### Commands
- `npm run dev` — 開発サーバー起動
- `npm run build` — プロダクションビルド
- `npm run preview` — ビルドプレビュー
