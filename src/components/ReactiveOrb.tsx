import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ShaderMaterial } from 'three'
import type { FrequencyBands } from '../types/audio'

// ?raw サフィックスで文字列としてimport（Viteの機能）
import vertexShader from '../shaders/orb.vert?raw'
import fragmentShader from '../shaders/orb.frag?raw'

/**
 * ReactiveOrb — 音に反応して変形する球体
 *
 * R3Fでは <mesh>, <sphereGeometry>, <shaderMaterial> を
 * JSXとして宣言的に書ける。これが three.js の
 * new Mesh(new SphereGeometry(...), new ShaderMaterial(...)) に相当する。
 *
 * 描画層の責務: シェーダーのuniformを毎フレーム更新すること
 * ロジック層(hooks)が計算した bands の値をそのまま流す「パイプ」の役割
 */

type Props = {
  bandsRef: RefObject<FrequencyBands>
}

export const ReactiveOrb = ({ bandsRef }: Props) => {
  // ShaderMaterial への参照（毎フレームuniformを書き換えるため）
  const materialRef = useRef<ShaderMaterial>(null)

  // 毎フレーム呼ばれるコールバック
  // state.clock.elapsedTime: シーン開始からの経過秒数
  useFrame((state) => {
    const mat = materialRef.current
    if (!mat) return

    const bands = bandsRef.current

    // uniform値を直接書き換える（新オブジェクト生成なし）
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uBass.value = bands.bass
    mat.uniforms.uMid.value = bands.mid
    mat.uniforms.uTreble.value = bands.treble
    mat.uniforms.uVolume.value = bands.volume
  })

  return (
    <mesh>
      {/*
        sphereGeometry の引数:
        [radius, widthSegments, heightSegments]
        セグメント数が多いほど滑らかだがGPU負荷増。
        64は十分滑らかで、ノイズ変形の細部も見える。
      */}
      <sphereGeometry args={[1, 64, 64]} />

      {/*
        shaderMaterial: カスタムGLSLシェーダーを使うマテリアル
        uniforms: シェーダーに渡す変数（CPUからGPUへの入力）
        { value: 初期値 } の形式で渡す
      */}
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uBass: { value: 0 },
          uMid: { value: 0 },
          uTreble: { value: 0 },
          uVolume: { value: 0 },
        }}
      />
    </mesh>
  )
}
