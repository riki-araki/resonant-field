import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float32BufferAttribute, type Mesh, type ShaderMaterial } from 'three'
import type { FrequencyBands } from '../types/audio'

import vertexShader from '../shaders/orb.vert?raw'
import fragmentShader from '../shaders/orb.frag?raw'

/**
 * 重心座標（Barycentric Coordinates）を生成する
 *
 * 三角形の3頂点にそれぞれ (1,0,0), (0,1,0), (0,0,1) を割り当てる。
 * フラグメントシェーダーで補間されると、辺に近い部分だけ 0 に近づく。
 * → これを使って「辺だけ光る」ワイヤーフレーム描画ができる。
 *
 * sphereGeometry はインデックス付きジオメトリなので、
 * まず .toNonIndexed() で展開してから割り当てる必要がある。
 */
const BARYCENTRIC_VECTORS = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
]

type Props = {
  bandsRef: RefObject<FrequencyBands>
}

export const ReactiveOrb = ({ bandsRef }: Props) => {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<ShaderMaterial>(null)

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

  // マウント時にジオメトリを非インデックス化して重心座標を注入
  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    // toNonIndexed: インデックス付き → 頂点展開
    // インデックス付きだと頂点が共有されるため、三角形ごとに異なる値を割り当てられない
    const nonIndexed = mesh.geometry.toNonIndexed()
    const count = nonIndexed.attributes.position.count

    // 頂点数分の重心座標を生成（3頂点 × 繰り返し）
    const barycentric = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const idx = (i % 3) * 3
      barycentric[i * 3] = BARYCENTRIC_VECTORS[idx]
      barycentric[i * 3 + 1] = BARYCENTRIC_VECTORS[idx + 1]
      barycentric[i * 3 + 2] = BARYCENTRIC_VECTORS[idx + 2]
    }

    nonIndexed.setAttribute('aBarycentric', new Float32BufferAttribute(barycentric, 3))
    mesh.geometry = nonIndexed
  }, [])

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
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.6, 48, 48]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
