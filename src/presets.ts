import type { Preset } from './types/preset'

export const BUILTIN_PRESETS: Preset[] = [
  {
    name: 'Cold',
    values: {
      Shader: {
        geometry: 'sphere',
        noiseScale: 1.5,
        noiseSpeed: 0.3,
        baseDisplacement: 0.1,
        midRange: 0.4,
        bassScale: 0.8,
        baseBrightness: 0.03,
        fresnelPower: 3.0,
        coldTint: '#6699FF',
        wireColor: '#263349',
      },
      Camera: {
        distance: 4.0,
        orbitSpeed: 0.3,
        verticalAmp: 0.8,
      },
      PostFX: {
        bloomIntensity: 0.8,
        bloomThreshold: 0.4,
        aberrationMax: 0.009,
        vignetteDark: 0.7,
        vignetteOffset: 0.3,
      },
    },
  },
  {
    name: 'Aggressive',
    values: {
      Shader: {
        geometry: 'icosahedron',
        noiseScale: 3.2,
        noiseSpeed: 0.7,
        baseDisplacement: 0.35,
        midRange: 0.9,
        bassScale: 1.8,
        baseBrightness: 0.08,
        fresnelPower: 2.0,
        coldTint: '#FF4466',
        wireColor: '#552233',
      },
      Camera: {
        distance: 3.0,
        orbitSpeed: 0.6,
        verticalAmp: 1.4,
      },
      PostFX: {
        bloomIntensity: 2.0,
        bloomThreshold: 0.2,
        aberrationMax: 0.025,
        vignetteDark: 0.9,
        vignetteOffset: 0.2,
      },
    },
  },
  {
    name: 'Minimal',
    values: {
      Shader: {
        geometry: 'plane',
        noiseScale: 0.8,
        noiseSpeed: 0.1,
        baseDisplacement: 0.02,
        midRange: 0.15,
        bassScale: 0.3,
        baseBrightness: 0.015,
        fresnelPower: 5.0,
        coldTint: '#AABBCC',
        wireColor: '#1A1A2E',
      },
      Camera: {
        distance: 5.5,
        orbitSpeed: 0.15,
        verticalAmp: 0.3,
      },
      PostFX: {
        bloomIntensity: 0.3,
        bloomThreshold: 0.6,
        aberrationMax: 0.003,
        vignetteDark: 0.5,
        vignetteOffset: 0.5,
      },
    },
  },
  {
    name: 'Ethereal',
    values: {
      Shader: {
        geometry: 'torusKnot',
        noiseScale: 2.0,
        noiseSpeed: 0.15,
        baseDisplacement: 0.2,
        midRange: 0.6,
        bassScale: 0.5,
        baseBrightness: 0.06,
        fresnelPower: 4.0,
        coldTint: '#88CCFF',
        wireColor: '#1A2A4A',
      },
      Camera: {
        distance: 4.5,
        orbitSpeed: 0.2,
        verticalAmp: 1.0,
      },
      PostFX: {
        bloomIntensity: 1.5,
        bloomThreshold: 0.3,
        aberrationMax: 0.005,
        vignetteDark: 0.6,
        vignetteOffset: 0.4,
      },
    },
  },
]
