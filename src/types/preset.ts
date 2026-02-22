/**
 * プリセットの値セット
 *
 * levaの3フォルダ（Shader / Camera / PostFX）の全パラメータを含む。
 * levaStore.set() に渡すためのドット記法キーに変換して使う。
 */
export type PresetValues = {
  Shader: {
    geometry: string
    noiseScale: number
    noiseSpeed: number
    baseDisplacement: number
    midRange: number
    bassScale: number
    baseBrightness: number
    fresnelPower: number
    coldTint: string
    wireColor: string
  }
  Camera: {
    distance: number
    orbitSpeed: number
    verticalAmp: number
  }
  PostFX: {
    bloomIntensity: number
    bloomThreshold: number
    aberrationMax: number
    vignetteDark: number
    vignetteOffset: number
  }
}

export type Preset = {
  name: string
  values: PresetValues
}
