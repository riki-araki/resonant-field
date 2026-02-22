import { useEffect, useRef, type RefObject } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  KernelSize,
} from 'postprocessing'
import type { FrequencyBands } from '../types/audio'

/**
 * AudioBloom — 音量に連動するブルーム（発光）エフェクト
 *
 * @react-three/postprocessing (R3Fラッパー) は React 19 との互換性問題があるため、
 * postprocessing ライブラリを直接使う。
 *
 * 仕組み:
 * 1. useThree() で R3F が管理する renderer / scene / camera を取得
 * 2. EffectComposer を自前で構築（RenderPass + BloomEffect）
 * 3. useFrame で毎フレーム composer.render() を呼ぶ（R3Fのデフォルト描画を上書き）
 *
 * ブルームのパラメータを音声データで動的に変調する。
 */

type Props = {
  bandsRef: RefObject<FrequencyBands>
}

export const AudioBloom = ({ bandsRef }: Props) => {
  const { gl, scene, camera, size } = useThree()
  const composerRef = useRef<EffectComposer | null>(null)
  const bloomRef = useRef<BloomEffect | null>(null)

  useEffect(() => {
    // RenderPass: シーンを通常通りレンダリングする基本パス
    const renderPass = new RenderPass(scene, camera)

    // BloomEffect: 明るい部分を光らせるエフェクト
    const bloom = new BloomEffect({
      intensity: 1.0,
      luminanceThreshold: 0.6,  // この明るさ以上が光る
      luminanceSmoothing: 0.3,  // 閾値付近の滑らかさ
      mipmapBlur: true,         // 高品質ぼかし
      kernelSize: KernelSize.LARGE, // ぼかし範囲
    })

    // EffectPass: エフェクトをまとめて適用するパス
    const effectPass = new EffectPass(camera, bloom)

    // EffectComposer: 描画パイプラインを管理するオブジェクト
    // gl (WebGLRenderer) → RenderPass → EffectPass(Bloom) → 画面出力
    const composer = new EffectComposer(gl)
    composer.addPass(renderPass)
    composer.addPass(effectPass)

    composerRef.current = composer
    bloomRef.current = bloom

    return () => {
      composer.dispose()
    }
  }, [gl, scene, camera])

  // リサイズ対応: Canvasサイズが変わったらComposerも更新
  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height)
  }, [size])

  // 毎フレーム: 音声データでブルームを変調 → composer で描画
  // 第2引数の 1 = 描画優先度。R3Fのデフォルト描画(優先度0)より後に実行される
  useFrame((_state, delta) => {
    const bloom = bloomRef.current
    const composer = composerRef.current
    if (!bloom || !composer) return

    const bands = bandsRef.current

    // 音量でブルームの強さを変調 (静寂時 1.0 → 最大音量時 5.0)
    bloom.intensity = 1.0 + bands.volume * 4.0

    // 低音で閾値を下げる（低音が強いほど、暗い部分も光り始める）
    bloom.luminanceMaterial.threshold = 0.6 - bands.bass * 0.4

    // 高音でスムージングを変える（高音が強いほどシャープな光）
    bloom.luminanceMaterial.smoothing = 0.3 + bands.treble * 0.3

    // R3Fのデフォルト描画を無効化して、composer経由で描画
    composer.render(delta)
  }, 1) // 優先度1: デフォルト描画の後に実行

  // このコンポーネントは描画をhookで制御するため、JSXは何も返さない
  return null
}
