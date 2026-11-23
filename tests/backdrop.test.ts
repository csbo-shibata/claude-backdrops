import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

// エンジン側の受け答えをまとめて用意する。theme.set で渡された背景名を記録する
function engine(on: On, scenes: string[]) {
  mock.store(on)
  on('command.register', () => ({ value: { command: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000, percent: 30 }, rateLimits: [] } }))
  on('ui.log', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('theme.set', (_, e) => {
    const b = (e as { backdrop?: { scene?: string } }).backdrop
    scenes.push(b?.scene ?? '')
    return { value: { isDrawn: true } }
  })
  on('theme.clear', () => ({ value: { isDrawn: false, reason: 'cleared' } }))
  on('command.run', () => ({ text: 'engine' }))
}

test('最初は matrix、/backdrop fish で魚になり、次のセッションでも魚のまま', async ($, on) => {
  const scenes: string[] = []
  engine(on, scenes)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(scenes.at(-1)).toBe('matrix')

  const r = await $.command.run({ command: 'backdrop', args: 'fish' })
  expect(r.text ?? '').toContain('fish')
  expect(scenes.at(-1)).toBe('fish')

  // 新しいセッションの開始を再現：保存した選択が読まれる
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(scenes.at(-1)).toBe('fish')
})

test('/backdrop off のあとはセッション開始でテーマを出さない', async ($, on) => {
  const scenes: string[] = []
  engine(on, scenes)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'backdrop', args: 'off' })
  const count = scenes.length
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(scenes.length).toBe(count)
})

test('知らない名前ならテーマを変えない', async ($, on) => {
  const scenes: string[] = []
  engine(on, scenes)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const count = scenes.length
  const r = await $.command.run({ command: 'backdrop', args: 'unicorn' })
  expect(r.text ?? '').toContain('ありません')
  expect(scenes.length).toBe(count)
})
