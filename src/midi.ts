import type { MidiCCMapping } from './types/midi'

export const DEFAULT_CC_MAP: MidiCCMapping[] = [
  // Shader
  { cc: 1,  levaPath: 'Shader.noiseScale',       min: 0.5, max: 4.0,  label: 'noiseScale' },
  { cc: 2,  levaPath: 'Shader.noiseSpeed',        min: 0.0, max: 1.0,  label: 'noiseSpeed' },
  { cc: 3,  levaPath: 'Shader.baseDisplacement',  min: 0.0, max: 0.5,  label: 'baseDisplacement' },
  { cc: 4,  levaPath: 'Shader.midRange',          min: 0.0, max: 1.0,  label: 'midRange' },
  { cc: 5,  levaPath: 'Shader.bassScale',         min: 0.0, max: 2.0,  label: 'bassScale' },
  { cc: 6,  levaPath: 'Shader.baseBrightness',    min: 0.0, max: 0.2,  label: 'baseBrightness' },
  { cc: 7,  levaPath: 'Shader.fresnelPower',      min: 1.0, max: 6.0,  label: 'fresnelPower' },
  // Camera
  { cc: 8,  levaPath: 'Camera.distance',          min: 2.0, max: 8.0,  label: 'distance' },
  { cc: 9,  levaPath: 'Camera.orbitSpeed',         min: 0.0, max: 1.0,  label: 'orbitSpeed' },
  { cc: 10, levaPath: 'Camera.verticalAmp',        min: 0.0, max: 2.0,  label: 'verticalAmp' },
  // PostFX
  { cc: 11, levaPath: 'PostFX.bloomIntensity',     min: 0.0, max: 3.0,  label: 'bloomIntensity' },
  { cc: 12, levaPath: 'PostFX.bloomThreshold',     min: 0.0, max: 1.0,  label: 'bloomThreshold' },
  { cc: 13, levaPath: 'PostFX.aberrationMax',      min: 0.0, max: 0.03, label: 'aberrationMax' },
  { cc: 14, levaPath: 'PostFX.vignetteDark',       min: 0.0, max: 1.5,  label: 'vignetteDark' },
  { cc: 15, levaPath: 'PostFX.vignetteOffset',     min: 0.0, max: 1.0,  label: 'vignetteOffset' },
]
