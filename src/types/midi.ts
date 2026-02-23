export type MidiCCMapping = {
  cc: number         // CC番号 (0-127)
  levaPath: string   // "Shader.noiseScale" 等
  min: number
  max: number
  label: string      // ドキュメント/デバッグ用
}

export type MidiStatus = 'pending' | 'connected' | 'disconnected' | 'unavailable'
