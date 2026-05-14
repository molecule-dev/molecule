import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-ui-react', () => ({
  Avatar: ({ src, name }: { src?: string; name?: string }) =>
    createElement('img', { 'data-avatar': src ?? '', 'data-avatar-name': name ?? '' }),
}))

const { LeaderboardRow } = await import('../LeaderboardRow.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('LeaderboardRow', () => {
  it('renders the name, score, and avatar', () => {
    const markup = html(createElement(LeaderboardRow, { rank: 5, name: 'Zoe', score: '1,200' }))
    expect(markup).toContain('Zoe')
    expect(markup).toContain('1,200')
    expect(markup).toContain('data-avatar-name="Zoe"')
  })

  it('renders a medal for the top three ranks and #N for the rest', () => {
    expect(html(createElement(LeaderboardRow, { rank: 1, name: 'A', score: '1' }))).toContain('🥇')
    expect(html(createElement(LeaderboardRow, { rank: 2, name: 'A', score: '1' }))).toContain('🥈')
    expect(html(createElement(LeaderboardRow, { rank: 3, name: 'A', score: '1' }))).toContain('🥉')
    expect(html(createElement(LeaderboardRow, { rank: 8, name: 'A', score: '1' }))).toContain('#8')
  })

  it('renders an up/down arrow for a non-zero rankDelta', () => {
    const up = html(createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', rankDelta: 2 }))
    expect(up).toContain('▲')
    expect(up).toContain('#22c55e')
    const down = html(
      createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', rankDelta: -3 }),
    )
    expect(down).toContain('▼')
    expect(down).toContain('#ef4444')
  })

  it('renders no delta indicator when rankDelta is 0 or absent', () => {
    expect(
      html(createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', rankDelta: 0 })),
    ).not.toContain('▲')
    expect(html(createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1' }))).not.toContain(
      '▼',
    )
  })

  it('renders the subtitle when present', () => {
    const markup = html(
      createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', subtitle: 'Team Red' }),
    )
    expect(markup).toContain('Team Red')
  })

  it('applies the highlight background when isMe is set', () => {
    const me = html(createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', isMe: true }))
    expect(me).toContain('rgba(96,165,250,0.1)')
    const other = html(createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1' }))
    expect(other).not.toContain('rgba(96,165,250,0.1)')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = html(
      createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', onClick: () => {} }),
    )
    expect(clickable).toContain('cursorPointer')
    const plain = html(
      createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', className: 'lr-cls' }),
    )
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('lr-cls')
  })
})
