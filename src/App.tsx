import { Canvas, useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { useAudio } from './hooks/useAudio'
import { useFrequency } from './hooks/useFrequency'
import { ReactiveOrb } from './components/ReactiveOrb'
import { AudioBloom } from './components/AudioBloom'
import type { FrequencyBands } from './types/audio'

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
const CameraRig = ({ bandsRef }: { bandsRef: React.RefObject<FrequencyBands> }) => {
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

const Scene = ({ analyser }: { analyser: React.RefObject<AnalyserNode | null> }) => {
  const bandsRef = useFrequency(analyser)

  return (
    <>
      <ambientLight intensity={0.2} />
      <ReactiveOrb bandsRef={bandsRef} />
      <CameraRig bandsRef={bandsRef} />
      <AudioBloom bandsRef={bandsRef} />
    </>
  )
}

/**
 * App — アプリケーションルート
 *
 * - Canvas: R3Fの3D描画領域。フルスクリーン化はCSSで行う
 * - キャプチャ未開始時だけクリック誘導テキストを表示
 * - 画面クリックで getDisplayMedia() を起動
 */
export const App = () => {
  const { analyser, isCapturing, startCapture } = useAudio()

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
      {/* gl.autoClear=false: EffectComposerが描画を制御するため、R3Fの自動クリアを無効化 */}
      <Canvas
        camera={{ position: [0, 0, 4], fov: 60 }}
        gl={{ autoClear: false }}
      >
        <Scene analyser={analyser} />
      </Canvas>

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
