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

    // getDisplayMedia: 画面共有ダイアログが開く
    // audio: true でシステムオーディオを要求
    // video: true は必須（APIの仕様上、videoなしでは呼べないブラウザがある）
    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true, // videoトラックは使わないが、API仕様上必要
    })

    // ビデオトラックは不要なので即停止（音声だけ使う）
    stream.getVideoTracks().forEach((track) => track.stop())

    // Web Audio API のセットアップ
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()

    // fftSize: FFT（高速フーリエ変換）の窓サイズ
    // frequencyBinCount = fftSize / 2 = 1024個の周波数ビンが得られる
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0.8 // 0-1: 高いほど滑らか（前フレームとの補間）

    // source → analyser を接続（destinationには繋がない = スピーカーから音は出ない）
    source.connect(analyser)

    analyserRef.current = analyser
    contextRef.current = ctx
    setIsCapturing(true)
  }, [])

  return { analyser: analyserRef, isCapturing, startCapture }
}
