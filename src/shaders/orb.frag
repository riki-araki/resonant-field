// ============================================
// フラグメントシェーダー: 無機質・冷たい質感
// ============================================
//
// モノクロ〜寒色のみ。ワイヤーフレームのエッジを浮かび上がらせ、
// フレネルで冷たい輪郭光を出す。

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uVolume;

// leva GUI から制御するパラメータ
uniform float uBaseBrightness;  // ベースの明度
uniform float uFresnelPower;    // フレネル効果のべき乗（高いほど輪郭が鋭い）
uniform vec3  uColdTint;        // 寒色ティントカラー
uniform vec3  uWireColor;       // ワイヤーフレームの基本色

varying vec3 vPosition;
varying vec3 vNormal;
varying float vDisplacement;
varying vec3 vBarycentric; // 重心座標（ワイヤーフレーム描画用）

// ワイヤーフレームのエッジ検出
// 重心座標の各成分が0に近い = 三角形の辺に近い
// fwidth: 隣接ピクセルとの微分値（線の太さを画面解像度に依存させない）
float edgeFactor() {
  vec3 d = fwidth(vBarycentric);
  // smoothstep で辺付近だけ 0→1 に遷移（線幅 ≈ 1.0px）
  vec3 a3 = smoothstep(vec3(0.0), d * 1.0, vBarycentric);
  return min(min(a3.x, a3.y), a3.z);
}

void main() {
  // === ベースカラー: 暗いグレー ===
  // 変位量で微妙に明暗をつける（凹凸の可視化）
  float brightness = uBaseBrightness + abs(vDisplacement) * 0.8;

  // 音量で全体の明るさを底上げ
  brightness += uVolume * 0.15;

  vec3 baseColor = vec3(brightness);

  // === 寒色のアクセント ===
  // 低音ヒットで青みを帯びる（冷たいフラッシュ）
  baseColor = mix(baseColor, baseColor * uColdTint, uBass * 0.6);

  // === フレネル: 輪郭に冷たい光 ===
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), uFresnelPower);

  // フレネルの色: 白〜青（音量で強度変化）
  vec3 fresnelColor = mix(vec3(0.3, 0.4, 0.6), vec3(0.6, 0.8, 1.0), uVolume);
  baseColor += fresnel * fresnelColor * (0.4 + uVolume * 0.6);

  // === ワイヤーフレーム ===
  // edgeFactor: 1.0 = 面の内側、0.0 = 辺の上
  float edge = edgeFactor();

  // ワイヤーの色: 暗めの青白（静寂時）→ 明るい白（音量時）
  vec3 wireColor = uWireColor + vec3(0.4) * uVolume;

  // 面の色とワイヤーの色を混合
  // edge が 0 に近いほどワイヤーの色が出る
  vec3 finalColor = mix(wireColor, baseColor, edge);

  // === 高音で微細なフリッカー ===
  // uTreble が高いとき、エッジ付近が一瞬光る
  float flicker = step(0.98, fract(uTime * 8.0 + vPosition.x * 3.0)) * uTreble;
  finalColor += flicker * vec3(0.3, 0.4, 0.5) * (1.0 - edge);

  gl_FragColor = vec4(finalColor, 1.0);
}
