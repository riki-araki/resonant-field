/**
 * 周波数バンドごとの正規化された音量値 (0.0 〜 1.0)
 *
 * AnalyserNode の getByteFrequencyData() の結果を
 * 低音・中音・高音に分割して正規化したもの。
 * この値がそのまま shader の uniform に渡される。
 */
export type FrequencyBands = {
  bass: number   // 低音域 (20-250Hz) → uBass
  mid: number    // 中音域 (250-4000Hz) → uMid
  treble: number // 高音域 (4000-20000Hz) → uTreble
  volume: number // 全帯域の平均 → uVolume
}
