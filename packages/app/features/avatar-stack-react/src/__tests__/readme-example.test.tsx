/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, with the real Tailwind ClassMap.
 *
 * @module
 */
import type { JSX } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AvatarStack, UserChip } from '../index.js'

setClassMap(classMap)

const assignees = [
  { name: 'Alice Kim', src: '/avatars/alice.jpg' },
  { name: 'Bob Lee' },
  { name: 'Carol Díaz', src: '/avatars/carol.jpg' },
  { name: 'Dan Wu' },
  { name: 'Eve Ortiz' },
]

/**
 * The README example, verbatim.
 *
 * @returns The assignee stack plus a user chip.
 */
function TaskAssignees(): JSX.Element {
  return (
    <div>
      <AvatarStack people={assignees} max={3} size="sm" />
      <UserChip name="Alice Kim" src="/avatars/alice.jpg" subtitle="Admin" />
    </div>
  )
}

describe('README @example', () => {
  it('renders three avatars, a +2 overflow chip, and the user chip', () => {
    const html = renderToStaticMarkup(<TaskAssignees />)
    expect(html).toContain('src="/avatars/alice.jpg"')
    expect(html).toContain('src="/avatars/carol.jpg"')
    expect(html).toContain('aria-label="+2 more"')
    expect(html).toContain('aria-label="+2 more">+2</span>')
    // Bob has no image, so the Avatar falls back to initials.
    expect(html).toContain('>BL</span>')
    expect(html.match(/<img /g)).toHaveLength(3)
    expect(html).not.toContain('Dan Wu')
    expect(html).toContain('Admin')
  })
})
