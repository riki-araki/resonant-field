import { useEffect, useRef, type RefObject } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
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

  useEffect(() => {
    const renderPass = new RenderPass(scene, camera)

    // Bloom: 控えめに設定（無機質 = ギラギラしない）
    const bloom = new BloomEffect({
      intensity: 0.8,
      luminanceThreshold: 0.4,
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
      darkness: 0.7,
      offset: 0.3,
    })

    const effectPass = new EffectPass(camera, bloom, chromatic, vignette)

    const composer = new EffectComposer(gl)
    composer.addPass(renderPass)
    composer.addPass(effectPass)

    composerRef.current = composer
    bloomRef.current = bloom
    chromaticRef.current = chromatic

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
    const composer = composerRef.current
    if (!bloom || !chromatic || !composer) return

    const bands = bandsRef.current

    // Bloom: 音量で控えめに変調
    bloom.intensity = 0.5 + bands.volume * 1.5

    // ChromaticAberration: 低音ヒットでRGBがずれる → 衝撃感
    // bass が 0 のとき ≈ 0.001、bass が 1 のとき ≈ 0.01
    const aberrationStrength = 0.001 + bands.bass * 0.009
    chromatic.offset.set(aberrationStrength, aberrationStrength)

    composer.render(delta)
  }, 1)

  return null
}
