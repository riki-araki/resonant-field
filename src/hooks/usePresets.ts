import { useState, useCallback, useMemo } from 'react'
import { levaStore } from 'leva'
import { BUILTIN_PRESETS } from '../presets'
import type { Preset, PresetValues } from '../types/preset'

const STORAGE_KEY = 'sound-user-presets'

/**
 * PresetValues のネスト構造を leva のドット記法レコードに変換する
 *
 * { Shader: { noiseScale: 1.5 } } → { "Shader.noiseScale": 1.5 }
 * levaStore.set() はこのドット記法パスを受け取る。
 */
const flattenPreset = (values: PresetValues): Record<string, unknown> => {
  const flat: Record<string, unknown> = {}
  for (const [folder, params] of Object.entries(values)) {
    for (const [key, value] of Object.entries(params)) {
      flat[`${folder}.${key}`] = value
    }
  }
  return flat
}

/**
 * levaStore の現在値から PresetValues を構築する
 *
 * getData() は内部的なメタデータも含むため、
 * .value プロパティだけを抽出する。
 */
const captureCurrentValues = (): PresetValues => {
  const data = levaStore.getData()
  const get = (path: string) => {
    const item = data[path]
    return item && 'value' in item ? item.value : undefined
  }

  return {
    Shader: {
      noiseScale: get('Shader.noiseScale') as number,
      noiseSpeed: get('Shader.noiseSpeed') as number,
      baseDisplacement: get('Shader.baseDisplacement') as number,
      midRange: get('Shader.midRange') as number,
      bassScale: get('Shader.bassScale') as number,
      baseBrightness: get('Shader.baseBrightness') as number,
      fresnelPower: get('Shader.fresnelPower') as number,
      coldTint: get('Shader.coldTint') as string,
      wireColor: get('Shader.wireColor') as string,
    },
    Camera: {
      distance: get('Camera.distance') as number,
      orbitSpeed: get('Camera.orbitSpeed') as number,
      verticalAmp: get('Camera.verticalAmp') as number,
    },
    PostFX: {
      bloomIntensity: get('PostFX.bloomIntensity') as number,
      bloomThreshold: get('PostFX.bloomThreshold') as number,
      aberrationMax: get('PostFX.aberrationMax') as number,
      vignetteDark: get('PostFX.vignetteDark') as number,
      vignetteOffset: get('PostFX.vignetteOffset') as number,
    },
  }
}

const loadUserPresets = (): Preset[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Preset[]) : []
  } catch {
    return []
  }
}

const saveUserPresets = (presets: Preset[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

/**
 * プリセット管理フック
 *
 * ビルトイン + ユーザープリセットの一覧管理と、
 * levaStore 経由での適用・保存を提供する。
 */
export const usePresets = () => {
  const [userPresets, setUserPresets] = useState<Preset[]>(loadUserPresets)

  const allPresets = useMemo(
    () => [...BUILTIN_PRESETS, ...userPresets],
    [userPresets],
  )

  const applyPreset = useCallback((preset: Preset) => {
    levaStore.set(flattenPreset(preset.values), false)
  }, [])

  const applyByIndex = useCallback(
    (index: number) => {
      const preset = allPresets[index]
      if (preset) applyPreset(preset)
    },
    [allPresets, applyPreset],
  )

  const saveCurrent = useCallback(
    (name: string) => {
      const preset: Preset = { name, values: captureCurrentValues() }
      const next = [...userPresets, preset]
      setUserPresets(next)
      saveUserPresets(next)
    },
    [userPresets],
  )

  return { allPresets, applyPreset, applyByIndex, saveCurrent }
}
