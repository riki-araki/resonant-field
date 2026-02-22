import { useCallback, useRef, useState } from 'react'

/**
 * useAudio — システムオーディオをキャプチャして AnalyserNode を返す
 *
 * 流れ:
 * 1. ユーザーがクリック → getDisplayMedia() でシステム音声を取得
 *    (ブラウザのセキュリティ上、ユーザー操作が必須)
 * 2. AudioContext を作成
 * 3. MediaStream を AudioContext に接続
 * 4. AnalyserNode を挟んで周波数解析可能にする
 *
 * AudioContext のライフサイクル:
 *   MediaStream → MediaStreamSource → AnalyserNode → (destination不要: 再生はAbleton側)
 *
 * AnalyserNode は「観測するだけ」のノード。
 * 音声を加工せず、getByteFrequencyData() で周波数データを読み取れる。
 */

const FFT_SIZE = 2048 // 周波数分解能。大きいほど精密だがCPU負荷増

export const useAudio = () => {
  const [isCapturing, setIsCapturing] = useState(false)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const contextRef = useRef<AudioContext | null>(null)

  const startCapture = useCallback(async () => {
    if (contextRef.current) return // 二重起動防止

    try {
      // getDisplayMedia: 画面共有ダイアログが開く
      // audio: true でシステムオーディオを要求
      // video: true は必須（APIの仕様上、videoなしでは呼べないブラウザがある）
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true,
      })

      // ビデオトラックは「停止ではなく無効化」する
      // stop() するとストリーム自体が終了し、音声トラックも巻き添えで死ぬ
      // enabled = false なら映像処理だけスキップされ、ストリームは生き続ける
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false
      })

      // 音声トラックが取得できたか確認
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        console.warn('音声トラックが取得できませんでした。「システムの音声を共有」にチェックを入れてください')
        return
      }
      console.log('Audio track acquired:', audioTracks[0].label)

      // Web Audio API のセットアップ
      const ctx = new AudioContext()

      // ブラウザのポリシーで AudioContext が suspended になることがある
      // ユーザー操作の直後なので resume() で確実に起動する
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }

      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()

      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0.8

      source.connect(analyser)

      analyserRef.current = analyser
      contextRef.current = ctx
      setIsCapturing(true)
      console.log('Audio capture started successfully')
    } catch (err) {
      // ユーザーが共有ダイアログをキャンセルした場合もここに来る
      console.error('Audio capture failed:', err)
    }
  }, [])

  return { analyser: analyserRef, isCapturing, startCapture }
}
