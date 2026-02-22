import { useMemo, useRef, type RefObject } from 'react'
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
  const materialRef = useRef<ShaderMaterial>(null)

  // useMemo でuniformsオブジェクトの参照を安定させる
  // これがないと、Reactの再レンダーのたびに新しいオブジェクトが生成され、
  // useFrame 内で ref 経由で書き換えた値がリセットされてしまう
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uVolume: { value: 0 },
    }),
    [],
  )

  useFrame((state) => {
    const mat = materialRef.current
    if (!mat) return

    const bands = bandsRef.current

    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uBass.value = bands.bass
    mat.uniforms.uMid.value = bands.mid
    mat.uniforms.uTreble.value = bands.treble
    mat.uniforms.uVolume.value = bands.volume
  })

  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
