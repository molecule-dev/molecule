import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

import { UserChip } from '../UserChip.js'

// The styling provider is the only substituted bond. The real UserChip and Avatar render.
const token = (..._args: unknown[]): string => ''
const classes = new Proxy(
  { cn: (...args: unknown[]) => args.filter(Boolean).join(' ') },
  {
    get(target, key) {
      return key === 'cn' ? target.cn : token
    },
  },
) as unknown as UIClassMap

const render = (props: Parameters<typeof UserChip>[0]): string => {
  setClassMap(classes)
  return renderToStaticMarkup(createElement(UserChip, props))
}

describe('linked user identities', () => {
  it('renders one canonical name link per byline, with the avatar outside it', () => {
    const html = render({
      name: 'Maintenance lead',
      src: '/crew.png',
      href: '/crew/lead',
      nameLinkProps: { className: 'person-name' },
    })
    expect(html.match(/<a\b/g)).toHaveLength(1)
    expect(html.match(/class="[^"]*person-name[^"]*"/g)).toHaveLength(1)
    expect(html).toContain('href="/crew/lead"')
    expect(html).toMatch(/<a\b[^>]*>Maintenance lead<\/a>/)
    expect(html).not.toMatch(/<a\b[^>]*>[^]*?<img/)
  })

  it('keeps an action and subtitle outside the identity link', () => {
    const html = render({
      name: 'Lead',
      href: '/crew/lead',
      subtitle: 'Night shift',
      trailing: createElement('button', { type: 'button' }, 'Assign'),
    })
    expect(html).toContain('Night shift')
    expect(html).toMatch(/<\/a>[^]*?<button type="button">Assign<\/button>/)
    expect(html).not.toMatch(/<a\b[^>]*>[^]*?<button[^]*?<\/a>/)
  })

  it('supports independent copies in a header and footer without suppressing either', () => {
    setClassMap(classes)
    const html = renderToStaticMarkup(
      createElement(
        'main',
        null,
        createElement(
          'header',
          null,
          createElement(UserChip, { name: 'Lead', href: '/crew/lead' }),
        ),
        createElement(
          'footer',
          null,
          createElement(UserChip, { name: 'Lead', href: '/crew/lead' }),
        ),
      ),
    )
    expect(html.match(/<a\b/g)).toHaveLength(2)
    expect(html).toMatch(/<header>[^]*?<a\b[^]*?<\/header>/)
    expect(html).toMatch(/<footer>[^]*?<a\b[^]*?<\/footer>/)
  })

  it('preserves an unlinked identity, forwarded attributes and escaped display names', () => {
    const html = render({ name: '<Lead & crew>', title: 'Assignment', id: 'crew-row' })
    expect(html).not.toContain('<a ')
    expect(html).toContain('&lt;Lead &amp; crew&gt;')
    expect(html).toContain('title="Assignment"')
    expect(html).toContain('id="crew-row"')
  })

  it('forwards router and link attributes to the canonical name link', () => {
    const onClick = vi.fn()
    const element = UserChip({
      name: 'Lead',
      href: '/crew/lead',
      nameLinkProps: { onClick, target: '_blank', rel: 'noreferrer' },
    })
    const content = element.props.children[1]
    const link = content.props.children[0]
    expect(link.props.onClick).toBe(onClick)
    expect(link.props.target).toBe('_blank')
    expect(link.props.rel).toBe('noreferrer')
    expect(link.props.href).toBe('/crew/lead')
  })
})
