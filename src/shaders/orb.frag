// ============================================
// フラグメントシェーダー: 各ピクセルの色を決定する
// ============================================
//
// HSL色空間を使い、周波数データで色相を動的に変化させる。
// 変位量が大きい部分ほど明るくなるフレネル風の効果も加える。

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uVolume;

varying vec3 vPosition;
varying vec3 vNormal;
varying float vDisplacement;

// HSL → RGB 変換
// H: 色相 (0-1), S: 彩度 (0-1), L: 明度 (0-1)
vec3 hsl2rgb(float h, float s, float l) {
  vec3 rgb = clamp(
    abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
    0.0, 1.0
  );
  return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

void main() {
  // === 色相を周波数で変化させる ===
  // ベース色相: 時間でゆっくり回転 (0.0-1.0 がぐるっと一周)
  float hue = fract(uTime * 0.05);

  // uBass で色相をシフト（低音で暖色系に寄る）
  hue = fract(hue + uBass * 0.3);

  // uTreble で色相をさらにシフト（高音で寒色系に寄る）
  hue = fract(hue + uTreble * 0.15);

  // 彩度: 音量が大きいほど鮮やか (0.5 〜 0.9)
  float saturation = 0.5 + uVolume * 0.4;

  // 明度: 変位量が大きい部分を明るくする
  float lightness = 0.4 + abs(vDisplacement) * 2.0;

  vec3 color = hsl2rgb(hue, saturation, lightness);

  // === フレネル効果 ===
  // 球体の端（視線と法線が直交する部分）を明るくして立体感を出す
  // カメラは原点からZ方向を向いているので、視線ベクトル ≈ (0,0,1)
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);
  color += fresnel * 0.3 * (0.5 + uVolume * 0.5);

  gl_FragColor = vec4(color, 1.0);
}
