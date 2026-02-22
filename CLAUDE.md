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
- **GUI**: leva (runtime parameter controls)

## Architecture Principles

### File Structure

```
src/
  main.tsx          # エントリポイント
  App.tsx           # Canvas + シーン構成 + プリセットUI統合
  presets.ts        # ビルトインプリセット4種のデータ
  hooks/            # カスタムフック（ロジック層）
    useAudio.ts     # Web Audio API / getDisplayMedia
    useFrequency.ts # 周波数解析・バンド分離
    usePresets.ts   # levaStore経由のプリセット管理 + localStorage永続化
    useScreenshot.ts # Canvas→PNG キャプチャ + ダウンロード
    useKeyboard.ts  # キーボードショートカット登録
  components/       # R3Fコンポーネント（描画層）
    ReactiveOrb.tsx # メインビジュアル（Shader GUI付き）
    AudioBloom.tsx  # ポストプロセッシング（PostFX GUI付き）
  shaders/          # GLSLファイル
    orb.vert        # 頂点シェーダー
    orb.frag        # フラグメントシェーダー
  types/            # 型定義
    audio.ts        # オーディオ関連の型
    preset.ts       # プリセット関連の型
  utils/            # ユーティリティ（純粋関数）
doc/                # ドキュメント（.gitignore対象）
```

### Design Rules

1. **ロジックと描画の分離** — hooks/ にロジック、components/ に描画
2. **シェーダー活用** — ビジュアル変形はGPU側で処理。CPU側はuniformの更新のみ
3. **型安全** — `any` 禁止。AudioContext等のWeb API型も明示
4. **最小UI** — 画面タップで音声キャプチャ開始するのみ。leva GUIは開発・ライブ操作用
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
// === オーディオ駆動（useFrequency から自動更新） ===
uniform float uTime;       // 経過時間
uniform float uBass;       // 低音域 (0.0 - 1.0, normalized)
uniform float uMid;        // 中音域 (0.0 - 1.0)
uniform float uTreble;     // 高音域 (0.0 - 1.0)
uniform float uVolume;     // 全体音量 (0.0 - 1.0)

// === leva GUI 制御（リアルタイム調整可能） ===
// 頂点シェーダー (orb.vert)
uniform float uNoiseScale;       // ノイズ空間スケール [0.5 - 4.0]
uniform float uNoiseSpeed;       // ノイズ時間速度 [0.0 - 1.0]
uniform float uBaseDisplacement; // 基本変位量 [0.0 - 0.5]
uniform float uMidRange;         // mid変位追加量 [0.0 - 1.0]
uniform float uBassScale;        // bassスケール倍率 [0.0 - 2.0]
// フラグメントシェーダー (orb.frag)
uniform float uBaseBrightness;   // ベース明度 [0.0 - 0.2]
uniform float uFresnelPower;     // フレネルべき乗 [1.0 - 6.0]
uniform vec3  uColdTint;         // 寒色ティント (color picker)
uniform vec3  uWireColor;        // ワイヤー色 (color picker)
```

### leva GUI Convention

- 各コンポーネントが `useControls("フォルダ名", { ... })` で自分のパラメータを管理
- フォルダ: Shader / PostFX / Camera / Presets
- useEffect の依存配列に leva 値を入れない（再生成を避ける）→ useFrame で毎フレーム反映
- カラー値は hex → Three.js Color で変換してシェーダーに渡す

### Preset System

- ビルトイン4種: Cold (default) / Aggressive / Minimal / Ethereal
- ユーザープリセット: localStorage に永続化
- `levaStore.set(flatValues, false)` でドット記法パス（`"Shader.noiseScale"` 等）で一括復元
- `levaStore.getData()` で現在値をキャプチャして保存
- ReactiveOrb / AudioBloom / CameraRig は変更不要（levaStore.set → useControls が自動反映）

### Keyboard Shortcuts

| キー | アクション |
| --- | --- |
| `1`〜`4` | ビルトインプリセット切替 |
| `5`〜 | ユーザープリセット切替 |
| `S` | スクリーンショット（PNG） |

INPUT/TEXTAREA にフォーカス中は無視（leva入力との競合回避）。

### Screenshot

- Canvas の `preserveDrawingBuffer: true` が必要（toDataURL 用）
- `useScreenshot` が `useFrame(priority 2)` でキャプチャ
  - AudioBloom の `useFrame(priority 1)` でPostFXレンダリング完了後に実行

### Git

- コミットメッセージは日本語OK
- 機能単位でコミット

### Commands

- `npm run dev` — 開発サーバー起動
- `npm run build` — プロダクションビルド
- `npm run preview` — ビルドプレビュー
