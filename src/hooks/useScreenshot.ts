import { useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

/**
 * スクリーンショットキャプチャフック
 *
 * trigger() を呼ぶと次フレームのレンダリング後に Canvas → PNG をキャプチャする。
 * AudioBloom が priority 1 でレンダリングするため、このフックは priority 2 で動き、
 * PostFX 適用済みの画面をキャプチャできる。
 *
 * Canvas 側に preserveDrawingBuffer: true が必要。
 */
export const useScreenshot = () => {
  const pendingRef = useRef(false)
  const gl = useThree((s) => s.gl)

  const trigger = useCallback(() => {
    pendingRef.current = true
  }, [])

  useFrame(() => {
    if (!pendingRef.current) return
    pendingRef.current = false

    const dataUrl = gl.domElement.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `sound-${Date.now()}.png`
    link.href = dataUrl
    link.click()
  }, 2)

  return { trigger }
}
