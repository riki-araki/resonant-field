# Sound Reactive 3D

Abletonの音にリアクティブに反応する3Dビジュアル。
`getDisplayMedia({ audio: true })` でシステムオーディオをキャプチャし、
周波数解析結果でシェーダーベースのジオメトリとポストプロセッシングを駆動する。

## Demo

1. `npm run dev` で開発サーバーを起動
2. **Chrome** で開く（Safari/Firefox非対応）
3. Abletonで音を鳴らせる状態にする
4. 黒い画面をクリック → 画面共有ダイアログが出る
5. **「画面全体」**を選択 → **「システムの音声を共有」にチェック** → 共有
6. Abletonで音を鳴らすと球体が反応する

## Stack

| カテゴリ | 技術 |
|---|---|
| Build | Vite 7 |
| UI | React 19 + TypeScript 5.9 (strict) |
| 3D | three.js 0.183 + @react-three/fiber 9 |
| Post-processing | postprocessing (直接使用) |
| Audio | Web Audio API (AnalyserNode + getDisplayMedia) |
| Shader | GLSL (custom vertex + fragment) |

> `@react-three/postprocessing`（R3Fラッパー）は React 19 との互換性問題（循環参照エラー）があるため、
> `postprocessing` ライブラリを直接使用している。

## Architecture

### Data Flow

```
Ableton Master Out
  → macOS System Audio
  → Chrome getDisplayMedia({ audio: true })
  → MediaStreamSource
  → AnalyserNode (fftSize: 2048)
  → getByteFrequencyData() [Uint8Array, 0-255]
  → Band separation (bass / mid / treble / volume) [0.0 - 1.0]
  → Shader uniforms (uBass, uMid, uTreble, uVolume, uTime)
  → Vertex deformation + Color modulation + Bloom intensity
```

### File Structure

```
src/
  main.tsx                 # エントリポイント。CSSリセット + ReactDOM.render
  App.tsx                  # Canvas + Scene構成。クリックでキャプチャ開始
  │
  hooks/                   # ロジック層 ― 音声データの取得と解析
  │  useAudio.ts           # getDisplayMedia → AnalyserNode を構築
  │  useFrequency.ts       # 毎フレームFFT → bass/mid/treble/volumeに分離
  │
  components/              # 描画層 ― R3Fコンポーネント
  │  ReactiveOrb.tsx       # ノイズ変形球体。uniformを毎フレーム更新
  │  AudioBloom.tsx        # 音量連動ブルーム。postprocessingを直接操作
  │
  shaders/                 # GLSL ― GPU上のビジュアルロジック
  │  orb.vert              # 頂点シェーダー: simplex noise変形 + bassスケール
  │  orb.frag              # フラグメントシェーダー: HSL色相変化 + フレネル
  │
  types/
  │  audio.ts              # FrequencyBands 型定義
  │
  vite-env.d.ts            # .vert/.frag の型宣言 (Vite raw import用)
```

### Design Principles

- **ロジックと描画の分離** — `hooks/` にデータ処理、`components/` に描画
- **シェーダー活用** — ビジュアル変形はGPU側。CPU側はuniform更新のみ
- **useFrame内アロケーション禁止** — ref経由で直接代入（GC負荷を避ける）
- **uniforms は useMemo で安定化** — Reactの再レンダーで参照がずれるのを防止

## Shader Details

### Vertex Shader (`orb.vert`)

球体の各頂点を3D Simplex Noiseで変形する。

| 入力 | 効果 |
|---|---|
| `uTime` | ノイズ |
| `uBass` | 球体全体のスケール (1.0 〜 1.8倍) |
| `uMid` | ノイズ変位の振幅を変調 |
| `uTreble` | 高周波の細かい揺れを追加 |

### Fragment Shader (`orb.frag`)

HSL色空間で色を決定し、フレネル効果で立体感を出す。

| 入力 | 効果 |
|---|---|
| `uTime` | ベース色相をゆっくり回転 |
| `uBass` | 色相を暖色方向にシフト |
| `uTreble` | 色相を寒色方向にシフト |
| `uVolume` | 彩度を上げる (0.5 〜 0.9) |
| `vDisplacement` | 変位が大きい部分を明るく |

### Post-processing (AudioBloom)

| 入力 | 効果 |
|---|---|
| `volume` | ブルーム強度 (1.0 〜 5.0) |
| `bass` | 発光閾値を下げる（暗い部分も光り始める） |
| `treble` | スムージング変調（高音でシャープな光） |

## Key Learnings

### `getDisplayMedia` のビデオトラック

```ts
// NG: stop() するとストリーム自体が終了し、音声トラックも死ぬ
stream.getVideoTracks().forEach((track) => track.stop())

// OK: enabled = false なら映像処理だけスキップ、ストリームは維持
stream.getVideoTracks().forEach((track) => { track.enabled = false })
```

### R3F の uniforms と React 再レンダー

```tsx
// NG: 毎レンダーで新オブジェクトが生成され、useFrameの更新がリセットされる
<shaderMaterial uniforms={{ uBass: { value: 0 } }} />

// OK: useMemo で参照を安定させる
const uniforms = useMemo(() => ({ uBass: { value: 0 } }), [])
<shaderMaterial uniforms={uniforms} />
```

### `@react-three/postprocessing` + React 19

R3Fラッパー (v3.0.4) は React 19 で循環参照エラーが発生する。
`postprocessing` ライブラリを直接使用し、`useThree` + `useFrame` で制御することで回避。

## Setup

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # プロダクションビルド
```

**Requirements**: Chrome (システム音声共有に対応しているブラウザ)
