import { useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { button, buttonGroup, levaStore, useControls } from 'leva'
import { useAudio } from './hooks/useAudio'
import { useFrequency } from './hooks/useFrequency'
import { usePresets } from './hooks/usePresets'
import { useScreenshot } from './hooks/useScreenshot'
import { useKeyboard } from './hooks/useKeyboard'
import { useMIDI } from './hooks/useMIDI'
import { ReactiveOrb, GEOMETRY_TYPES } from './components/ReactiveOrb'
import { AudioBloom } from './components/AudioBloom'
import { BUILTIN_PRESETS } from './presets'
import type { FrequencyBands } from './types/audio'
import type { MidiStatus } from './types/midi'

/**
 * Scene — R3F の Canvas 内で動くシーン
 *
 * Canvas 内のコンポーネントだけが useFrame 等の R3F hooks を使える。
 * そのため useFrequency はここで呼ぶ。
 */
/**
 * CameraRig — カメラをゆっくり自動旋回させる
 * 球体の周りを一定速度で周回。音量で距離が微妙に変わる（呼吸感）
 */
const CameraRig = ({ bandsRef }: { bandsRef: RefObject<FrequencyBands> }) => {
  // leva: "Camera" フォルダにグルーピング
  const { distance, orbitSpeed, verticalAmp } = useControls('Camera', {
    distance:    { value: 4.0, min: 2.0, max: 8.0, step: 0.1 },
    orbitSpeed:  { value: 0.3, min: 0.0, max: 1.0, step: 0.01 },
    verticalAmp: { value: 0.8, min: 0.0, max: 2.0, step: 0.1 },
  })

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const bands = bandsRef.current

    // 低音で距離が縮まる
    const d = distance - bands.bass * 0.5

    state.camera.position.x = Math.sin(t * orbitSpeed) * d
    state.camera.position.z = Math.cos(t * orbitSpeed) * d
    state.camera.position.y = Math.sin(t * orbitSpeed * 0.3) * verticalAmp

    state.camera.lookAt(0, 0, 0)
  })

  return null
}

/**
 * ScreenshotCapture — Canvas内でスクショを実行するコンポーネント
 *
 * useScreenshot は useFrame(priority 2) を使うので Canvas 内に配置が必要。
 * trigger 関数を外から受け取り、ref 経由で呼び出せるようにする。
 */
const ScreenshotCapture = ({ triggerRef }: { triggerRef: RefObject<(() => void) | null> }) => {
  const { trigger } = useScreenshot()
  triggerRef.current = trigger
  return null
}

const Scene = ({ analyser, screenshotRef }: {
  analyser: RefObject<AnalyserNode | null>
  screenshotRef: RefObject<(() => void) | null>
}) => {
  const bandsRef = useFrequency(analyser)

  return (
    <>
      <ambientLight intensity={0.2} />
      <ReactiveOrb bandsRef={bandsRef} />
      <CameraRig bandsRef={bandsRef} />
      <AudioBloom bandsRef={bandsRef} />
      <ScreenshotCapture triggerRef={screenshotRef} />
    </>
  )
}

const MIDI_STATUS_COLOR: Record<MidiStatus, string> = {
  connected: 'rgba(100,255,140,0.5)',
  pending: 'rgba(255,255,255,0.3)',
  disconnected: 'rgba(255,255,255,0.3)',
  unavailable: 'rgba(255,255,255,0.3)',
}

const MIDI_STATUS_TEXT: Record<MidiStatus, (n: number) => string> = {
  connected: (n) => `MIDI: ${n} device(s)`,
  pending: () => 'MIDI: connecting…',
  disconnected: () => 'MIDI: no devices',
  unavailable: () => 'MIDI: unavailable',
}

const MidiStatusLabel = ({ status, deviceCount }: { status: MidiStatus; deviceCount: number }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 12,
      left: 12,
      color: MIDI_STATUS_COLOR[status],
      fontSize: '11px',
      fontFamily: 'monospace',
      pointerEvents: 'none',
      userSelect: 'none',
    }}
  >
    {MIDI_STATUS_TEXT[status](deviceCount)}
  </div>
)

/**
 * App — アプリケーションルート
 *
 * - Canvas: R3Fの3D描画領域。フルスクリーン化はCSSで行う
 * - キャプチャ未開始時だけクリック誘導テキストを表示
 * - 画面クリックで getDisplayMedia() を起動
 */
export const App = () => {
  const { analyser, isCapturing, startCapture } = useAudio()
  const { allPresets, applyPreset, applyByIndex, saveCurrent } = usePresets()
  const screenshotRef = useRef<(() => void) | null>(null)

  // leva: "Presets" フォルダ — プリセット切替 + 保存 + スクリーンショット
  const builtinButtons = useMemo(() => {
    const group: Record<string, () => void> = {}
    for (const preset of BUILTIN_PRESETS) {
      group[preset.name] = () => applyPreset(preset)
    }
    return group
  }, [applyPreset])

  useControls('Presets', () => ({
    ' ': buttonGroup(builtinButtons),
    'Save Current': button(() => {
      const name = window.prompt('Preset name:')
      if (name?.trim()) saveCurrent(name.trim())
    }),
    'Screenshot': button(() => {
      screenshotRef.current?.()
    }),
  }), [builtinButtons, saveCurrent])

  // キーボードショートカット: 数字でプリセット切替、S でスクリーンショット、G でジオメトリ巡回
  const keyMap = useMemo(() => {
    const map: Record<string, () => void> = {
      s: () => screenshotRef.current?.(),
      g: () => {
        const data = levaStore.getData()
        const item = data['Shader.geometry']
        const current = (item && 'value' in item ? item.value : 'sphere') as string
        const idx = GEOMETRY_TYPES.indexOf(current as typeof GEOMETRY_TYPES[number])
        const next = GEOMETRY_TYPES[(idx + 1) % GEOMETRY_TYPES.length]
        levaStore.set({ 'Shader.geometry': next }, false)
      },
    }
    for (let i = 0; i < allPresets.length && i < 9; i++) {
      map[String(i + 1)] = () => applyByIndex(i)
    }
    return map
  }, [allPresets, applyByIndex])

  useKeyboard(keyMap)

  const { status: midiStatus, deviceCount: midiDeviceCount } = useMIDI()

  return (
    <div
      onClick={isCapturing ? undefined : startCapture}
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        cursor: isCapturing ? 'default' : 'pointer',
      }}
    >
      {/* preserveDrawingBuffer: スクリーンショット用。toDataURL()が空画像を返さないようにする */}
      <Canvas
        camera={{ position: [0, 0, 4], fov: 60 }}
        gl={{ autoClear: false, preserveDrawingBuffer: true }}
      >
        <Scene analyser={analyser} screenshotRef={screenshotRef} />
      </Canvas>

      <MidiStatusLabel status={midiStatus} deviceCount={midiDeviceCount} />

      {/* キャプチャ未開始時のみ表示する最小UI */}
      {!isCapturing && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '14px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          click to capture audio
        </div>
      )}
    </div>
  )
}
