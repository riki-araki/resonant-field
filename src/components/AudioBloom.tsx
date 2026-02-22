import { useEffect, useRef, type RefObject } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
  KernelSize,
} from 'postprocessing'
import { Vector2 } from 'three'
import type { FrequencyBands } from '../types/audio'

/**
 * PostEffects — 無機質な質感のポストプロセッシング
 *
 * 3つのエフェクトを組み合わせる:
 * - Bloom: 控えめ。ワイヤーフレームのエッジだけがほんのり光る
 * - ChromaticAberration: 色収差。RGB各チャンネルをずらす。低音ヒットで強く
 * - Vignette: 画面端を暗くする。無機質なトンネルビジョン感
 */

type Props = {
  bandsRef: RefObject<FrequencyBands>
}

export const AudioBloom = ({ bandsRef }: Props) => {
  const { gl, scene, camera, size } = useThree()
  const composerRef = useRef<EffectComposer | null>(null)
  const bloomRef = useRef<BloomEffect | null>(null)
  const chromaticRef = useRef<ChromaticAberrationEffect | null>(null)
  const vignetteRef = useRef<VignetteEffect | null>(null)

  // leva: "PostFX" フォルダにグルーピング
  const {
    bloomIntensity,
    bloomThreshold,
    aberrationMax,
    vignetteDark,
    vignetteOffset,
  } = useControls('PostFX', {
    bloomIntensity:  { value: 0.8,   min: 0.0, max: 3.0,  step: 0.1 },
    bloomThreshold:  { value: 0.4,   min: 0.0, max: 1.0,  step: 0.05 },
    aberrationMax:   { value: 0.009, min: 0.0, max: 0.03, step: 0.001 },
    vignetteDark:    { value: 0.7,   min: 0.0, max: 1.5,  step: 0.05 },
    vignetteOffset:  { value: 0.3,   min: 0.0, max: 1.0,  step: 0.05 },
  })

  useEffect(() => {
    const renderPass = new RenderPass(scene, camera)

    // Bloom: 控えめに設定（無機質 = ギラギラしない）
    const bloom = new BloomEffect({
      intensity: bloomIntensity,
      luminanceThreshold: bloomThreshold,
      luminanceSmoothing: 0.2,
      mipmapBlur: true,
      kernelSize: KernelSize.MEDIUM,
    })

    // ChromaticAberration: RGBチャンネルを位置的にずらす
    // レンズの色収差を再現。冷たい・デジタルな印象を与える
    const chromatic = new ChromaticAberrationEffect({
      offset: new Vector2(0.001, 0.001),
      radialModulation: true,
      modulationOffset: 0.5,
    })

    // Vignette: 画面の四隅を暗くする
    // 視野を狭める効果 → 没入感 + 無機質なモニター感
    const vignette = new VignetteEffect({
      darkness: vignetteDark,
      offset: vignetteOffset,
    })

    const effectPass = new EffectPass(camera, bloom, chromatic, vignette)

    const composer = new EffectComposer(gl)
    composer.addPass(renderPass)
    composer.addPass(effectPass)

    composerRef.current = composer
    bloomRef.current = bloom
    chromaticRef.current = chromatic
    vignetteRef.current = vignette

    return () => {
      composer.dispose()
    }
  }, [gl, scene, camera])

  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height)
  }, [size])

  useFrame((_state, delta) => {
    const bloom = bloomRef.current
    const chromatic = chromaticRef.current
    const vignette = vignetteRef.current
    const composer = composerRef.current
    if (!bloom || !chromatic || !vignette || !composer) return

    const bands = bandsRef.current

    // Bloom: leva の基準値 + 音量で変調
    bloom.intensity = bloomIntensity + bands.volume * 1.5
    bloom.luminanceMaterial.threshold = bloomThreshold

    // ChromaticAberration: 低音ヒットでRGBがずれる → 衝撃感
    // bass が 0 のとき ≈ 0.001、bass が 1 のとき ≈ aberrationMax
    const aberrationStrength = 0.001 + bands.bass * aberrationMax
    chromatic.offset.set(aberrationStrength, aberrationStrength)

    // Vignette: leva から直接更新
    vignette.darkness = vignetteDark
    vignette.offset = vignetteOffset

    composer.render(delta)
  }, 1)

  return null
}
