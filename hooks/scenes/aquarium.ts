
import { makeColors } from '../make-colors.js'

// 深海の配色（ダーク専用）
export const aquarium_colors = makeColors({
  label: 'Aquarium',
  only: 'dark',
  roles: { accent: '#4fc3f7', danger: '#ef6f6c', success: '#5fd3a5', warning: '#f2b84b', pro: '#a98bf0' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#081826',
        'surface-1': '#0c1f30',
        'surface-2': '#10263a',
        'surface-3': '#132b41',
        'text-primary': '#e8f4fb',
        'text-secondary': '#bcd6e6',
        'text-muted': '#93b4c8',
      },
    },
  },
})


// 泡の段階（0〜10）。コンテキスト使用率10%ごとに1段上がる
const MAX_LEVEL = 10
export const BUBBLES_PER_LEVEL = 4


// 毎回同じ並びになる簡易乱数（描き直しで泡が飛ばないように）
function make_random(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

// 魚1匹ぶんのSVG（右向きで描き、左向きは反転）
function fish_svg(o: {
  x: number
  y: number
  scale: number
  color: string
  fin: string
  dur: number
  delay: number
  to_left: boolean
}): string {
  const flip = o.to_left ? -1 : 1
  const swim = o.to_left ? 'swim-left' : 'swim-right'
  return `<g class="${swim}" style="animation-duration:${o.dur}s;animation-delay:${o.delay}s">
  <g transform="translate(${o.x} ${o.y}) scale(${o.scale * flip} ${o.scale})">
    <g class="bob" style="animation-delay:${o.delay / 3}s">
      <path class="tail" d="M-38 0 L-70 -22 L-62 0 L-70 22 Z" fill="${o.fin}"/>
      <path d="M-42 0 C-30 -30 30 -30 46 0 C30 30 -30 30 -42 0 Z" fill="${o.color}"/>
      <path d="M-6 -22 C2 -38 18 -36 22 -20 Z" fill="${o.fin}"/>
      <path d="M8 2 C14 10 22 10 26 4" stroke="${o.fin}" stroke-width="3" fill="none" opacity="0.6"/>
      <circle cx="28" cy="-6" r="5" fill="#ffffff"/>
      <circle cx="29.5" cy="-6" r="2.6" fill="#0b1b2a"/>
    </g>
  </g>
</g>`
}

// 泡の段階に応じた背景SVGを組み立てる
export function aquarium_scene(level: number): string {
  const rand = make_random(7)

  // 泡（最初から40個ぶんの位置を決め、段階に応じて先頭から使う）
  const bubbles: string[] = []
  const total = level * BUBBLES_PER_LEVEL
  for (let i = 0; i < MAX_LEVEL * BUBBLES_PER_LEVEL; i++) {
    const x = Math.round(40 + rand() * 1520)
    const y = Math.round(200 + rand() * 760)
    const r = (3 + rand() * 9).toFixed(1)
    const dur = (9 + rand() * 10).toFixed(1)
    const delay = (-rand() * 18).toFixed(1)
    if (i < total) {
      bubbles.push(
        `<circle class="bubble" cx="${x}" cy="${y}" r="${r}" style="animation-duration:${dur}s;animation-delay:${delay}s"/>`,
      )
    }
  }

  // 水草
  const weeds: string[] = []
  const weed_x = [60, 130, 210, 1380, 1460, 1540]
  weed_x.forEach((x, i) => {
    const h = 160 + (i % 3) * 50
    weeds.push(
      `<path class="weed" style="animation-delay:${-i * 1.3}s" d="M${x} 1000 C${x - 30} ${1000 - h * 0.35} ${x + 30} ${1000 - h * 0.65} ${x} ${1000 - h}" stroke="${i % 2 ? '#1f7a5c' : '#2b9470'}" stroke-width="12" stroke-linecap="round" fill="none"/>`,
    )
  })

  // 魚（上の帯と下寄りの帯を泳ぐ。中央と入力欄付近は避ける）
  const fishes = [
    fish_svg({ x: 300, y: 140, scale: 1.0, color: '#ff9f43', fin: '#e8702a', dur: 46, delay: -5, to_left: false }),
    fish_svg({ x: 1200, y: 230, scale: 0.7, color: '#5ee0d0', fin: '#2bb3a3', dur: 58, delay: -30, to_left: true }),
    fish_svg({ x: 800, y: 110, scale: 0.55, color: '#ffd166', fin: '#e0a92e', dur: 64, delay: -18, to_left: false }),
    fish_svg({ x: 1400, y: 320, scale: 0.85, color: '#f78fb3', fin: '#d9658d', dur: 52, delay: -40, to_left: true }),
    fish_svg({ x: 150, y: 640, scale: 0.6, color: '#8fd3ff', fin: '#4fa8e0', dur: 70, delay: -12, to_left: false }),
    fish_svg({ x: 1450, y: 700, scale: 0.5, color: '#c3a6ff', fin: '#9a7ae6', dur: 66, delay: -50, to_left: true }),
  ]

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<style>
  /* 動き */
  .swim-right { animation: swimr linear infinite; }
  .swim-left { animation: swiml linear infinite; }
  @keyframes swimr { from { transform: translateX(-700px); } to { transform: translateX(1700px); } }
  @keyframes swiml { from { transform: translateX(700px); } to { transform: translateX(-1700px); } }
  .bob { animation: bob 3.4s ease-in-out infinite; }
  @keyframes bob { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
  .tail { transform-box: fill-box; transform-origin: 100% 50%; animation: tail 1.2s ease-in-out infinite; }
  @keyframes tail { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.75); } }
  .bubble { fill: #cfefff; fill-opacity: 0.18; stroke: #e6f8ff; stroke-opacity: 0.55; stroke-width: 1.5; animation: rise linear infinite; }
  @keyframes rise { 0% { transform: translateY(300px); opacity: 0; } 10% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(-1100px); opacity: 0; } }
  .weed { transform-box: fill-box; transform-origin: 50% 100%; animation: sway 7s ease-in-out infinite; }
  @keyframes sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
  .ray { animation: ray 14s ease-in-out infinite; }
  @keyframes ray { 0%, 100% { opacity: 0.05; } 50% { opacity: 0.13; } }
</style>
<defs>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0d3b5c"/>
    <stop offset="0.55" stop-color="#082a45"/>
    <stop offset="1" stop-color="#041726"/>
  </linearGradient>
</defs>
<!-- 海 -->
<rect width="1600" height="1000" fill="url(#sea)"/>
<!-- 光の筋 -->
<polygon class="ray" points="250,0 380,0 620,1000 360,1000" fill="#bfe9ff" opacity="0.08"/>
<polygon class="ray" style="animation-delay:-5s" points="700,0 780,0 960,1000 790,1000" fill="#bfe9ff" opacity="0.08"/>
<polygon class="ray" style="animation-delay:-9s" points="1150,0 1260,0 1400,1000 1180,1000" fill="#bfe9ff" opacity="0.08"/>
<!-- 海底 -->
<path d="M0 960 C300 930 600 975 900 950 C1200 925 1400 965 1600 945 L1600 1000 L0 1000 Z" fill="#0b2a3a"/>
${weeds.join('\n')}
${fishes.join('\n')}
${bubbles.join('\n')}
</svg>`
}

