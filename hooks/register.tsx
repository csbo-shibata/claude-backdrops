import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { aquarium_colors, aquarium_scene, BUBBLES_PER_LEVEL } from './scenes/aquarium'
import { matrix_colors, matrix_scene, total_columns } from './scenes/matrix'

// 選べる背景
type Choice = 'fish' | 'matrix' | 'off'
const DEFAULT_CHOICE: Choice = 'matrix'
const STORE_KEY = 'choice'

// 背景ごとのテーマ（配色＋動く背景）
const LOOKS: Record<Exclude<Choice, 'off'>, ThemeSetArgs> = {
  fish: {
    colors: aquarium_colors.theme,
    overrideColorScheme: 'dark',
    backdrop: { scene: 'fish', glass: { blur: 14, tint: '#06182a', opacity: 0.55 } },
  },
  matrix: {
    colors: matrix_colors.theme,
    overrideColorScheme: 'dark',
    backdrop: { scene: 'matrix', glass: { blur: 10, tint: '#020803', opacity: 0.7 } },
  },
}

// /backdrop の引数として受け付ける言い方
const ALIASES: Record<string, Choice> = {
  fish: 'fish',
  aquarium: 'fish',
  '魚': 'fish',
  'さかな': 'fish',
  matrix: 'matrix',
  'マトリックス': 'matrix',
  off: 'off',
  none: 'off',
  'なし': 'off',
}

const MAX_LEVEL = 10
let choice: Choice = DEFAULT_CHOICE
let level = 0

// 使用率(%)から段階（0〜10）を求める
function level_from_percent(percent: number | undefined): number {
  if (percent === undefined || Number.isNaN(percent)) {
    return 0
  }
  return Math.max(0, Math.min(MAX_LEVEL, Math.round(percent / 10)))
}

// 保存された選択を読む（壊れた値なら既定に戻す）
async function load_choice($: EngineInterface): Promise<Choice> {
  try {
    const saved = await $.store.get(STORE_KEY)
    if (saved === 'fish' || saved === 'matrix' || saved === 'off') {
      return saved
    }
  } catch (error) {
    $.ui.log(`backdrops: 保存した背景を読めませんでした: ${String(error)}`)
  }
  return DEFAULT_CHOICE
}

// 選んだ背景をテーマとして設定する。設定できたらtrue
async function apply_look($: EngineInterface, c: Exclude<Choice, 'off'>): Promise<boolean> {
  try {
    const set = await $.theme.set(LOOKS[c])
    if (!set.isDrawn) {
      $.ui.log(`backdrops: 背景は描かれていません: ${set.reason}`)
    }
    return true
  } catch (error) {
    $.ui.log(`backdrops: テーマを設定できませんでした: ${String(error)}`)
    return false
  }
}

// 段階ごと・背景ごとにSVGを作り置きする
const scene_cache = new Map<string, string>()
function scene_for(c: Exclude<Choice, 'off'>, lv: number): string {
  const key = `${c}:${lv}`
  let s = scene_cache.get(key)
  if (s === undefined) {
    s = c === 'fish' ? aquarium_scene(lv) : matrix_scene(lv)
    scene_cache.set(key, s)
  }
  return s
}

const LABELS: Record<Choice, string> = {
  fish: 'fish（魚の水槽。使用率で泡が増える）',
  matrix: 'matrix（0と1の雨。使用率で列が増え、緑→赤）',
  off: 'off（背景なし）',
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // 開発中の確認：Desktopが塗らない配色なら知らせる
    for (const p of [...aquarium_colors.problems, ...matrix_colors.problems]) {
      if (p.startsWith("Desktop won't paint")) {
        $.ui.toast(p)
      }
    }

    try {
      await $.command.register({
        name: 'backdrop',
        description: '背景を切り替える（fish / matrix / off）',
        argumentHint: '[fish|matrix|off]',
      })
    } catch (error) {
      $.ui.log(`backdrops: /backdrop を登録できませんでした: ${String(error)}`)
    }

    // 今の使用率から段階を決める
    try {
      const usage = await $.session.usage()
      level = level_from_percent(usage.context.percent)
    } catch (error) {
      $.ui.log(`backdrops: 使用率を読めませんでした: ${String(error)}`)
    }

    // 前回選んだ背景を出す（offなら何もしない）
    choice = await load_choice($)
    if (choice !== 'off') {
      await apply_look($, choice)
    }

    return next(e)
  })

  // /backdrop コマンド
  on('command.run', { command: 'backdrop' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    // 引数なし：今の背景と選べる一覧を出す
    if (arg === '') {
      const lines = (['fish', 'matrix', 'off'] as const).map(
        c => `${c === choice ? '▶' : '　'} /backdrop ${LABELS[c]}`,
      )
      return { text: `今の背景: ${choice}\n${lines.join('\n')}`, isTextDisplayOnly: true }
    }

    const next_choice = ALIASES[arg]
    if (next_choice === undefined) {
      return { text: `「${arg}」という背景はありません。fish / matrix / off から選んでください。`, isTextDisplayOnly: true }
    }

    // 切り替えて、次のセッションでも使えるよう保存する
    if (next_choice === 'off') {
      try {
        await $.theme.clear()
      } catch (error) {
        return { text: `背景を消せませんでした: ${String(error)}`, isTextDisplayOnly: true }
      }
    } else if (!(await apply_look($, next_choice))) {
      return { text: `背景を「${next_choice}」にできませんでした。`, isTextDisplayOnly: true }
    }
    choice = next_choice
    try {
      await $.store.set(STORE_KEY, choice)
    } catch (error) {
      return { text: `背景は ${choice} にしましたが、保存に失敗しました: ${String(error)}`, isTextDisplayOnly: true }
    }
    return { text: `背景を ${LABELS[choice]} にしました。`, isTextDisplayOnly: true }
  })

  // ターンごとの計測で使用率が動いたら描き直す
  on('session.measure', ($, e, next) => {
    try {
      const lv = level_from_percent(e.context.percent)
      if (lv !== level) {
        level = lv
        $.ui.invalidate('ui.render')
      }
    } catch (error) {
      $.ui.log(`backdrops: 計測の処理に失敗: ${String(error)}`)
    }
    return next(e)
  })

  // 背景を描く
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const scene = e.props.scene
    if (scene !== 'fish' && scene !== 'matrix') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const alt =
      scene === 'fish'
        ? `魚が泳ぐ海の中。泡は${level * BUBBLES_PER_LEVEL}個`
        : `0と1が降る黒い画面。${total_columns(level)}列、色は使用率に応じて緑から赤へ`
    return <Svg source={scene_for(scene, level)} alt={alt} isInteractive />
  })
}
