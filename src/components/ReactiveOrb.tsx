import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  IcosahedronGeometry,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  TorusKnotGeometry,
  type Mesh,
  type ShaderMaterial,
} from 'three'
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

// hex→vec3変換用の再利用インスタンス（useFrame内でのアロケーション回避）
const _color = new Color()

export const GEOMETRY_TYPES = ['sphere', 'icosahedron', 'torus', 'torusKnot', 'plane'] as const
export type GeometryType = typeof GEOMETRY_TYPES[number]

const createRawGeometry = (type: GeometryType): BufferGeometry => {
  switch (type) {
    case 'sphere':       return new SphereGeometry(0.6, 48, 48)
    case 'icosahedron':  return new IcosahedronGeometry(0.6, 2)
    case 'torus':        return new TorusGeometry(0.45, 0.2, 32, 64)
    case 'torusKnot':    return new TorusKnotGeometry(0.4, 0.15, 128, 32)
    case 'plane':        return new PlaneGeometry(1.4, 1.4, 64, 64)
  }
}

type Props = {
  bandsRef: RefObject<FrequencyBands>
}

export const ReactiveOrb = ({ bandsRef }: Props) => {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<ShaderMaterial>(null)

  // leva: "Shader" フォルダにグルーピングされたコントロール群
  // useControls の返り値はスライダーを動かすたびにリアルタイムに変わる
  const {
    geometry: geometryType,
    noiseScale,
    noiseSpeed,
    baseDisplacement,
    midRange,
    bassScale,
    baseBrightness,
    fresnelPower,
    coldTint,
    wireColor,
  } = useControls('Shader', {
    geometry:         { value: 'sphere' as string, options: [...GEOMETRY_TYPES] },
    noiseScale:       { value: 1.5,  min: 0.5, max: 4.0, step: 0.1 },
    noiseSpeed:       { value: 0.3,  min: 0.0, max: 1.0, step: 0.01 },
    baseDisplacement: { value: 0.1,  min: 0.0, max: 0.5, step: 0.01 },
    midRange:         { value: 0.4,  min: 0.0, max: 1.0, step: 0.01 },
    bassScale:        { value: 0.8,  min: 0.0, max: 2.0, step: 0.1 },
    baseBrightness:   { value: 0.03, min: 0.0, max: 0.2, step: 0.005 },
    fresnelPower:     { value: 3.0,  min: 1.0, max: 6.0, step: 0.1 },
    coldTint:         '#6699FF',
    wireColor:        '#263349',
  })

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uVolume: { value: 0 },
      // leva 制御の新 uniform
      uNoiseScale: { value: 1.5 },
      uNoiseSpeed: { value: 0.3 },
      uBaseDisplacement: { value: 0.1 },
      uMidRange: { value: 0.4 },
      uBassScale: { value: 0.8 },
      uBaseBrightness: { value: 0.03 },
      uFresnelPower: { value: 3.0 },
      uColdTint: { value: new Color(0.4, 0.6, 1.0) },
      uWireColor: { value: new Color(0.15, 0.2, 0.3) },
    }),
    [],
  )

  // geometryType が変わるたびにジオメトリを生成し直す
  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const raw = createRawGeometry(geometryType as GeometryType)
    const nonIndexed = raw.toNonIndexed()
    raw.dispose()

    const count = nonIndexed.attributes.position.count
    const barycentric = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const idx = (i % 3) * 3
      barycentric[i * 3] = BARYCENTRIC_VECTORS[idx]
      barycentric[i * 3 + 1] = BARYCENTRIC_VECTORS[idx + 1]
      barycentric[i * 3 + 2] = BARYCENTRIC_VECTORS[idx + 2]
    }
    nonIndexed.setAttribute('aBarycentric', new Float32BufferAttribute(barycentric, 3))

    const old = mesh.geometry
    mesh.geometry = nonIndexed

    return () => {
      old.dispose()
    }
  }, [geometryType])

  useFrame((state) => {
    const mat = materialRef.current
    if (!mat) return

    const bands = bandsRef.current

    // オーディオ uniform
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uBass.value = bands.bass
    mat.uniforms.uMid.value = bands.mid
    mat.uniforms.uTreble.value = bands.treble
    mat.uniforms.uVolume.value = bands.volume

    // leva 制御の uniform をフレームごとに更新
    mat.uniforms.uNoiseScale.value = noiseScale
    mat.uniforms.uNoiseSpeed.value = noiseSpeed
    mat.uniforms.uBaseDisplacement.value = baseDisplacement
    mat.uniforms.uMidRange.value = midRange
    mat.uniforms.uBassScale.value = bassScale
    mat.uniforms.uBaseBrightness.value = baseBrightness
    mat.uniforms.uFresnelPower.value = fresnelPower

    // hex文字列 → Color（0〜1のRGB）に変換してシェーダーに渡す
    mat.uniforms.uColdTint.value.set(_color.set(coldTint))
    mat.uniforms.uWireColor.value.set(_color.set(wireColor))
  })

  return (
    <mesh ref={meshRef}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
