import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { FrequencyBands } from '../types/audio'

/**
 * useFrequency — 毎フレーム周波数データを解析してバンド分離する
 *
 * AnalyserNode.getByteFrequencyData() は Uint8Array (0-255) を返す。
 * これは FFT の結果で、配列のインデックスが周波数ビンに対応:
 *
 *   index 0 = 0Hz, index 1 = sampleRate/fftSize Hz, ...
 *
 * 例: sampleRate=44100, fftSize=2048 の場合
 *   1ビンあたり ≈ 21.5Hz (44100 / 2048)
 *   index 0-11   ≈ 0-250Hz    (低音: バスドラム、ベース)
 *   index 12-186  ≈ 250-4000Hz (中音: ボーカル、ギター)
 *   index 186-930 ≈ 4000-20000Hz (高音: ハイハット、シンバル)
 *
 * 各バンドの平均値を 0-255 → 0.0-1.0 に正規化して返す。
 */

// 周波数ビンの区切り位置（sampleRate=44100, fftSize=2048 前提）
// 実際の正確な値はcontextによって変わるが、近似で十分
const BASS_END = 12     // 〜250Hz
const MID_END = 186     // 〜4000Hz

// 配列の指定範囲の平均値を0-1に正規化する純粋関数
const bandAverage = (data: Uint8Array<ArrayBuffer>, start: number, end: number): number => {
  let sum = 0
  for (let i = start; i < end; i++) {
    sum += data[i]
  }
  return sum / ((end - start) * 255) // 255で割って0-1に正規化
}

export const useFrequency = (analyserRef: RefObject<AnalyserNode | null>) => {
  // useFrame 内でのアロケーション禁止（パフォーマンス）なので、
  // バッファとresultをrefで持つ
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const bandsRef = useRef<FrequencyBands>({
    bass: 0,
    mid: 0,
    treble: 0,
    volume: 0,
  })

  // useFrame: R3Fが毎フレーム（≈60fps）呼ぶコールバック
  // ここで音声データを読み取り → bands を更新する
  useFrame(() => {
    const analyser = analyserRef.current
    if (!analyser) return

    // 初回だけバッファを作成（frequencyBinCount = fftSize / 2）
    if (!dataRef.current) {
      dataRef.current = new Uint8Array(analyser.frequencyBinCount)
    }

    const data = dataRef.current

    // AnalyserNode から最新の周波数データを取得（dataに上書き）
    analyser.getByteFrequencyData(data)

    // 各バンドの平均を計算して更新（新オブジェクト生成せず直接代入）
    const bands = bandsRef.current
    bands.bass = bandAverage(data, 0, BASS_END)
    bands.mid = bandAverage(data, BASS_END, MID_END)
    bands.treble = bandAverage(data, MID_END, data.length)
    bands.volume = bandAverage(data, 0, data.length)
  })

  return bandsRef
}
