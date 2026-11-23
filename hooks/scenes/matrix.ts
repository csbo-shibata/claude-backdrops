
import { makeColors } from '../make-colors.js'

// 黒と緑の配色（ダーク専用）
export const matrix_colors = makeColors({
  label: 'Matrix rain',
  only: 'dark',
  roles: { accent: '#3ddc84', danger: '#ef6f6c', success: '#5fe08a', warning: '#e8c547', pro: '#7fd6c2' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#050a06',
        'surface-1': '#08110a',
        'surface-2': '#0b170e',
        'surface-3': '#0e1c11',
        'text-primary': '#d8f5dd',
        'text-secondary': '#a9d8b2',
        'text-muted': '#7fb08a',
      },
    },
  },
})


// 遠近感のための3つの層（奥ほど小さく・暗く・遅い）
type Layer = {
  name: 'back' | 'mid' | 'front'
  size: number // 文字の大きさ
  step: number // 文字の縦の間隔
  min_cols: number // 使用率0%の列数
  max_cols: number // 使用率100%の列数
  min_dur: number // 落ちる時間（秒）の下限
  max_dur: number // 落ちる時間（秒）の上限
  min_len: number // 列の文字数の下限
  max_len: number // 列の文字数の上限
}

const LAYERS: Layer[] = [
  { name: 'back', size: 14, step: 16, min_cols: 45, max_cols: 75, min_dur: 15, max_dur: 21, min_len: 14, max_len: 30 },
  { name: 'mid', size: 20, step: 23, min_cols: 28, max_cols: 48, min_dur: 9, max_dur: 14, min_len: 12, max_len: 24 },
  { name: 'front', size: 30, step: 34, min_cols: 12, max_cols: 22, min_dur: 6, max_dur: 9, min_len: 8, max_len: 16 },
]

// 段階（0〜10）。コンテキスト使用率10%ごとに1段上がる
const MAX_LEVEL = 10


// 段階からその層の列数を求める
function columns_for(layer: Layer, level: number): number {
  return Math.round(layer.min_cols + ((layer.max_cols - layer.min_cols) * level) / MAX_LEVEL)
}

// 全層あわせた列数
export function total_columns(level: number): number {
  return LAYERS.reduce((n, l) => n + columns_for(l, level), 0)
}

// 毎回同じ並びになる簡易乱数（描き直しで列が飛ばないように）
function make_random(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

// HSLを16進の色に変換する
function hsl_hex(h: number, s: number, l: number): string {
  const sat = s / 100
  const lig = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n: number) => {
    const v = lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(v * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// 段階ごとの色：0で緑（色相140）、黄色を通って、10で赤（色相0）
function palette_for(level: number) {
  const h = 140 - (140 * level) / MAX_LEVEL
  return {
    back_tail_top: hsl_hex(h, 70, 14),
    back_tail: hsl_hex(h, 60, 30),
    mid_tail_top: hsl_hex(h, 70, 20),
    mid_tail: hsl_hex(h, 60, 46),
    front_tail_top: hsl_hex(h, 75, 30),
    front_tail: hsl_hex(h, 100, 65),
    back_head: hsl_hex(h, 35, 48),
    mid_head: hsl_hex(h, 75, 84),
    front_head: hsl_hex(h, 100, 96),
    glow: hsl_hex(h, 80, 7),
  }
}

// 1列ぶんのSVG：尾は1つのテキストにまとめて色のグラデーションで暗くし、先頭だけ白く光らせる
function column_svg(layer: Layer, rand: () => number): string {
  const x = Math.round(rand() * 1580)
  const len = layer.min_len + Math.floor(rand() * (layer.max_len - layer.min_len + 1))
  const dur = (layer.min_dur + rand() * (layer.max_dur - layer.min_dur)).toFixed(1)
  const delay = (-rand() * layer.max_dur).toFixed(1)
  const rest_y = Math.round(rand() * 650) // 動きを止めたときの位置

  let bits = ''
  const xs: string[] = []
  const ys: string[] = []
  for (let i = 0; i < len - 1; i++) {
    bits += rand() < 0.5 ? '0' : '1'
    xs.push('0')
    ys.push(String(i * layer.step))
  }
  const head = rand() < 0.5 ? '0' : '1'
  const head_y = (len - 1) * layer.step

  return `<g class="drop ${layer.name}" style="animation-duration:${dur}s;animation-delay:${delay}s"><g transform="translate(${x} ${rest_y})"><text class="tail" x="${xs.join(' ')}" y="${ys.join(' ')}">${bits}</text><text class="head" y="${head_y}">${head}</text></g></g>`
}

// 段階に応じた背景SVGを組み立てる
export function matrix_scene(level: number): string {
  const c = palette_for(level)
  const groups = LAYERS.map((layer, li) => {
    const count = columns_for(layer, level)
    const cols: string[] = []
    for (let i = 0; i < layer.max_cols; i++) {
      // 列ごとに種を固定し、段階が上がっても既存の列は同じ場所に残す
      const svg = column_svg(layer, make_random(1000 * (li + 1) + i))
      if (i < count) {
        cols.push(svg)
      }
    }
    return `<g class="layer-${layer.name}">\n${cols.join('\n')}\n</g>`
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<style>
  /* 文字の見た目 */
  text { font-family: monospace; }
  .layer-back text { font-size: 14px; }
  .layer-mid text { font-size: 20px; }
  .layer-front text { font-size: 30px; font-weight: bold; }
  .layer-back .tail { fill: url(#tail-back); }
  .layer-mid .tail { fill: url(#tail-mid); }
  .layer-front .tail { fill: url(#tail-front); }
  .layer-back .head { fill: ${c.back_head}; }
  .layer-mid .head { fill: ${c.mid_head}; }
  .layer-front .head { fill: ${c.front_head}; }
  /* 上から下へ落ちる（速さは列ごと） */
  .drop { animation: fall linear infinite; }
  @keyframes fall { from { transform: translateY(-1250px); } to { transform: translateY(1100px); } }
</style>
<defs>
  <!-- 尾のグラデーション：上ほど消え、下の先頭に近いほど明るい -->
  <linearGradient id="tail-back" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${c.back_tail_top}" stop-opacity="0"/>
    <stop offset="1" stop-color="${c.back_tail}" stop-opacity="0.8"/>
  </linearGradient>
  <linearGradient id="tail-mid" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${c.mid_tail_top}" stop-opacity="0"/>
    <stop offset="1" stop-color="${c.mid_tail}" stop-opacity="0.95"/>
  </linearGradient>
  <linearGradient id="tail-front" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${c.front_tail_top}" stop-opacity="0"/>
    <stop offset="1" stop-color="${c.front_tail}"/>
  </linearGradient>
  <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.8">
    <stop offset="0" stop-color="${c.glow}"/>
    <stop offset="1" stop-color="#000000"/>
  </radialGradient>
</defs>
<!-- 地の黒 -->
<rect width="1600" height="1000" fill="url(#vignette)"/>
${groups.join('\n')}
</svg>`
}

