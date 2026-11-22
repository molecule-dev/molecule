import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Linter } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

import { lintProject } from './project.js'

const RULE = 'molecule-local/buttons-have-an-action'
const project = await lintProject(null)
afterAll(() => project.remove())
const { root, engine } = project

async function findings(source: string): Promise<Linter.LintMessage[]> {
  const report = await engine.lintText(source, { filePath: 'src/Control.tsx' })
  expect(report.flatMap((file) => file.messages.filter((row) => row.fatal))).toEqual([])
  return report.flatMap((file) => file.messages.filter((row) => row.ruleId === RULE))
}

/** A share control drawn for the layout; the component that copies the link was never wired. */
const invoice = (button: string): string => `export function InvoiceRow({ invoice, onOpen }) {
  return (
    <li>
      <a href={'/invoices/' + invoice.id}>{invoice.number}</a>
      ${button}
    </li>
  )
}`

describe('a button that cannot do anything', () => {
  it('reports the placeholder favorite button P312 l2359 deployed', async () => {
    const source = await readFile(
      new URL('./fixtures/p312-article-preview-before.tsx.txt', import.meta.url),
      'utf8',
    )
    const [file] = await engine.lintText(source, { filePath: 'src/Control.tsx' })
    expect(file.filePath).toBe(join(root, 'src/Control.tsx'))
    const rows = file.messages.filter((row) => row.ruleId === RULE)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ line: 28, severity: 1 })
    expect(rows[0]?.message).toMatch(/^No action or external binding hook/)
  })

  it('reports a non-benchmark invoice row whose copy-link button has no handler', async () => {
    const rows = await findings(
      invoice('<button type="button" className="copy">Copy link</button>'),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ line: 5 })
  })

  it.each([
    ['a click handler', '<button type="button" onClick={() => onOpen(invoice)}>Open</button>'],
    ['another event handler', '<button type="button" onPointerDown={onOpen}>Open</button>'],
    ['spread props', '<button type="button" {...invoice.actionProps}>Open</button>'],
    ['a submit button', '<button type="submit">Save</button>'],
    ['a button with no type, which submits a parent form', '<button>Save</button>'],
    ['a computed type', '<button type={invoice.kind}>Save</button>'],
    ['a control that is switched off', '<button type="button" disabled>Soon</button>'],
    ['a ref a script can bind', '<button type="button" ref={invoice.ref}>Open</button>'],
    ['a native popover invoker', '<button type="button" popoverTarget="menu">Menu</button>'],
    ['a data hook a script can bind', '<button type="button" data-action="copy">Copy</button>'],
    [
      'a handler on an ancestor',
      '<div onClick={() => onOpen(invoice)}><button type="button">Open</button></div>',
    ],
    ['a label that forwards the click', '<label><button type="button">Pick</button></label>'],
    ['a component, not the element', '<Button type="button">Open</Button>'],
  ])('keeps %s quiet', async (_name, button) => {
    expect(await findings(invoice(button))).toEqual([])
  })
})
