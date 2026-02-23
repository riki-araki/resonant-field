import { useEffect, useRef, useState } from 'react'
import { levaStore } from 'leva'
import { DEFAULT_CC_MAP } from '../midi'
import type { MidiCCMapping, MidiStatus } from '../types/midi'

/** CC値 (0-127) をパラメータ範囲にリニアマッピング */
const ccToValue = (ccVal: number, min: number, max: number): number =>
  min + (ccVal / 127) * (max - min)

/** MIDIメッセージのステータスバイト上位4bit: 0xB0 = CC */
const CC_STATUS = 0xb0
const STATUS_MASK = 0xf0

export const useMIDI = (mappings: MidiCCMapping[] = DEFAULT_CC_MAP) => {
  const [status, setStatus] = useState<MidiStatus>('pending')
  const [deviceCount, setDeviceCount] = useState(0)

  // O(1) ルックアップ用 Map（高頻度メッセージ対応）
  const ccMapRef = useRef<Map<number, MidiCCMapping>>(new Map())

  // mappings が変わったら Map を再構築
  useEffect(() => {
    const map = new Map<number, MidiCCMapping>()
    for (const m of mappings) {
      map.set(m.cc, m)
    }
    ccMapRef.current = map
  }, [mappings])

  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setStatus('unavailable')
      return
    }

    let disposed = false
    let access: MIDIAccess | null = null

    const handleMessage = (e: MIDIMessageEvent) => {
      const data = e.data
      if (!data || data.length < 3) return

      // CC メッセージ判定（チャンネル無視）
      if ((data[0] & STATUS_MASK) !== CC_STATUS) return

      const cc = data[1]
      const val = data[2]
      const mapping = ccMapRef.current.get(cc)
      if (!mapping) return

      levaStore.set(
        { [mapping.levaPath]: ccToValue(val, mapping.min, mapping.max) },
        false,
      )
    }

    /** 全入力ポートにリスナーを登録し、デバイス数を更新 */
    const bindInputs = (acc: MIDIAccess) => {
      let count = 0
      acc.inputs.forEach((input) => {
        input.onmidimessage = handleMessage
        count++
      })
      setDeviceCount(count)
      setStatus(count > 0 ? 'connected' : 'disconnected')
    }

    navigator.requestMIDIAccess({ sysex: false }).then(
      (acc) => {
        if (disposed) return
        access = acc

        bindInputs(acc)

        // ホットプラグ対応
        acc.onstatechange = () => {
          if (disposed) return
          bindInputs(acc)
        }
      },
      () => {
        if (!disposed) setStatus('unavailable')
      },
    )

    return () => {
      disposed = true
      if (access) {
        access.inputs.forEach((input) => {
          input.onmidimessage = null
        })
        access.onstatechange = null
      }
    }
  }, [])

  return { status, deviceCount }
}
