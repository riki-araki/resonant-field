// ============================================
// 頂点シェーダー: 球体の各頂点を「ノイズ + 音」で変形する
// ============================================
//
// 処理の流れ:
// 1. 3Dノイズで頂点ごとにランダムな変位量を計算
// 2. uBass（低音）でスケール（全体の大きさ）を変える
// 3. 変形後の位置をフラグメントシェーダーに渡す

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;

// leva GUI から制御するパラメータ
uniform float uNoiseScale;       // ノイズの空間スケール（大きいほど細かい凹凸）
uniform float uNoiseSpeed;       // ノイズの時間変化速度
uniform float uBaseDisplacement; // 音がなくても常にある揺れ量
uniform float uMidRange;         // 中音域による変位の最大追加量
uniform float uBassScale;        // 低音によるスケール倍率

varying vec3 vPosition;
varying vec3 vNormal;
varying float vDisplacement;
varying vec3 vBarycentric; // 重心座標（ワイヤーフレーム描画に使う）

// 重心座標用の頂点属性（ReactiveOrbから注入）
attribute vec3 aBarycentric;

// =====================
// Simplex-like 3Dノイズ
// =====================
// 頂点ごとにランダムっぽいが滑らかな値を返す関数。
// GPU上で手続き的に計算するので、テクスチャ不要。

// 擬似乱数ベクトルを返すハッシュ関数
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

// 3D Simplex Noise（Ashima Arts実装ベース）
// 入力: 3D座標 → 出力: -1.0 〜 1.0 の滑らかなノイズ値
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
  // === ノイズによる変形 ===
  // position: R3Fが渡す元の球体の頂点座標
  // uTime で時間変化させ、ゆっくりうねるようにする

  float noise = snoise(position * uNoiseScale + uTime * uNoiseSpeed);

  // uMid（中音域）でノイズの強さを変調
  float displacement = noise * (uBaseDisplacement + uMid * uMidRange);

  // uTreble（高音域）で細かい揺れを追加
  float detail = snoise(position * 4.0 + uTime * 0.8) * uTreble * 0.15;

  // 法線方向に沿って頂点を押し出す
  // normal: 球体表面の「外向き」ベクトル
  vec3 newPosition = position + normal * (displacement + detail);

  // === uBass でスケール ===
  // 低音が大きいほど球体全体が膨らむ
  float scale = 1.0 + uBass * uBassScale;
  newPosition *= scale;

  vPosition = newPosition;
  vNormal = normal;
  vDisplacement = displacement + detail;
  vBarycentric = aBarycentric;

  // 最終的な画面上の位置を計算
  // projectionMatrix × modelViewMatrix × 頂点位置 = クリップ座標
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
