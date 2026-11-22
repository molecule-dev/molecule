import type { Linter } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

import { lintProject } from './project.js'

const RULE = 'molecule-local/unique-update-excludes-self'
// No manifest: an API source file in a workspace that declares nothing.
const project = await lintProject(null)
afterAll(() => project.remove())
const { engine: eslint } = project

async function feedback(source: string): Promise<Linter.LintMessage[]> {
  const [result] = await eslint.lintText(source, { filePath: 'api/src/update.ts' })
  expect(result.fatalErrorCount).toBe(0)
  return result.messages.filter((message) => message.ruleId === RULE)
}

const inventory = (
  queryExtra = '',
  returned = 'Boolean(found)',
  check = 'await codeTaken(code)',
): string => `
import { findOne, updateById } from '@molecule/api-database'
async function codeTaken(code: string, exceptId?: string) {
  const found = await findOne('inventory', [
    { field: 'code', operator: '=', value: code },
    ${queryExtra}
  ])
  return ${returned}
}
export async function save(id: string, code: string, res: Response, current: { id: string; code: string }, req: { params: { id: string } }, otherCode: string, mode: string) {
  if (${check}) {
    res.status(409).json({ error: 'Code has already been taken' })
    return
  }
  await updateById('inventory', id, { code })
}
`

describe('unique update checks in the shipped ESLint config', () => {
  it('rejects an unchanged inventory code checked by a local existence-only helper', async () => {
    const messages = await feedback(inventory())
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ line: 11, severity: 1 })
    expect(messages[0].message).toContain("field: 'id'")
    expect(messages[0].message).toContain('value: id')
  })

  it('only reports the field actually written by the update', async () => {
    const source = inventory().replace(
      "  await updateById('inventory', id, { code })",
      `  if (await codeTaken(otherCode)) {
    res.status(422).json({ error: 'Code already exists' })
    return
  }
  await updateById('inventory', id, { code })`,
    )
    expect(await feedback(source)).toHaveLength(1)
  })

  it('follows aliased datastore imports and a const arrow helper', async () => {
    const source = inventory()
      .replace('{ findOne, updateById }', '{ findOne as lookup, updateById as write }')
      .replace('await findOne(', 'await lookup(')
      .replace('await updateById(', 'await write(')
      .replace(
        'async function codeTaken(code: string, exceptId?: string)',
        'const codeTaken = async (code: string, exceptId?: string) =>',
      )
    expect(await feedback(source)).toHaveLength(1)
  })

  it('follows namespace imports and a direct row-existence check', async () => {
    const source = `
import * as store from '@molecule/api-database'
export async function save(id: string, alias: string, res: Response) {
  const found = await store.findOne('teams', [{ field: 'alias', operator: '=', value: alias }])
  if (found) {
    res.status(409).json({ error: 'Alias already used' })
    return
  }
  await store.updateById('teams', id, { alias })
}
`
    expect(await feedback(source)).toHaveLength(1)
  })

  it('recognizes double negation of an existing row', async () => {
    expect(await feedback(inventory('', '!!found'))).toHaveLength(1)
  })

  it('allows exclusion of the current row in the query', async () => {
    expect(
      await feedback(
        inventory(
          "{ field: 'id', operator: '!=', value: exceptId },",
          'Boolean(found)',
          'await codeTaken(code, id)',
        ),
      ),
    ).toEqual([])
  })

  it('does not accept an exclusion when the helper never receives the current id', async () => {
    expect(
      await feedback(inventory("{ field: 'id', operator: '!=', value: exceptId },")),
    ).toHaveLength(1)
  })

  it.each(['current.id', 'req.params.id', "current['id']"])(
    'allows the same %s member expression in the query and update',
    async (id) => {
      const source = inventory(
        "{ field: 'id', operator: '!=', value: exceptId },",
        'Boolean(found)',
        `await codeTaken(code, ${id})`,
      ).replace("updateById('inventory', id,", `updateById('inventory', ${id},`)
      expect(await feedback(source)).toEqual([])
    },
  )

  it('resolves a helper parameter before comparing member-expression ids', async () => {
    const source = inventory(
      "{ field: 'id', operator: '!=', value: exceptId.id },",
      'Boolean(found)',
      'await codeTaken(code, current)',
    )
      .replace("updateById('inventory', id,", "updateById('inventory', current.id,")
      .replace('exceptId?: string', 'exceptId?: { id: string }')
    expect(await feedback(source)).toEqual([])
  })

  it('allows exclusion by comparing the returned row id', async () => {
    expect(
      await feedback(
        inventory('', 'Boolean(found) && found?.id !== exceptId', 'await codeTaken(code, id)'),
      ),
    ).toEqual([])
  })

  it('allows an inline returned-row exclusion before the conflict response', async () => {
    const source = inventory().replace(
      'if (await codeTaken(code))',
      `const found = await findOne('inventory', [{ field: 'code', operator: '=', value: code }])
  if (found && found.id !== id)`,
    )
    expect(await feedback(source)).toEqual([])
  })

  it('allows a changed-value guard around the uniqueness check', async () => {
    const source = inventory().replace(
      'if (await codeTaken(code))',
      'if (code !== current.code && await codeTaken(code))',
    )
    expect(await feedback(source)).toEqual([])
  })

  it('allows a nested changed-value guard around the uniqueness check', async () => {
    const source = inventory()
      .replace(
        '  if (await codeTaken(code))',
        '  if (code !== current.code) {\n  if (await codeTaken(code))',
      )
      .replace(
        "  await updateById('inventory', id, { code })",
        "  }\n  await updateById('inventory', id, { code })",
      )
    expect(await feedback(source)).toEqual([])
  })

  it('allows a truthiness and changed-value guard around a scoped SKU lookup', async () => {
    const source = `
import { findOne, updateById } from '@molecule/api-database'
export async function save(req: Request, res: Response, id: string, existing: Record<string, unknown>, ownerId: string) {
  if (req.body.sku && req.body.sku !== existing.sku) {
    const conflict = await findOne('stock', [
      { field: 'sku', operator: '=', value: req.body.sku },
      { field: 'ownerId', operator: '=', value: ownerId },
    ])
    if (conflict) {
      res.status(409).json({ error: 'SKU already exists' })
      return
    }
  }
  await updateById('stock', id, req.body)
}
`
    expect(await feedback(source)).toEqual([])
  })

  it('allows an unchanged-value early return before the uniqueness check', async () => {
    const source = inventory().replace(
      '  if (await codeTaken(code))',
      "  if (code === current.code) return await updateById('inventory', id, { code })\n  if (await codeTaken(code))",
    )
    expect(await feedback(source)).toEqual([])
  })

  it('leaves create-only uniqueness checks intact', async () => {
    expect(await feedback(inventory().replace('updateById', 'create'))).toEqual([])
  })

  it('keeps create and edit branches of one handler separate', async () => {
    const source = inventory()
      .replace(
        '  if (await codeTaken(code))',
        "  if (mode === 'create') {\n  if (await codeTaken(code))",
      )
      .replace(
        "  await updateById('inventory', id, { code })",
        "  await create('inventory', { code })\n  } else {\n  await updateById('inventory', id, { code })\n  }",
      )
    expect(await feedback(source)).toEqual([])
  })

  it('does not associate a create branch that returns with a later update', async () => {
    const source = inventory()
      .replace(
        '  if (await codeTaken(code))',
        "  if (mode === 'create') {\n  if (await codeTaken(code))",
      )
      .replace(
        "  await updateById('inventory', id, { code })",
        "  return await create('inventory', { code })\n  }\n  await updateById('inventory', id, { code })",
      )
    expect(await feedback(source)).toEqual([])
  })

  it('keeps separate create and update switch cases separate', async () => {
    const source = inventory()
      .replace(
        '  if (await codeTaken(code))',
        "  switch (mode) {\n  case 'create':\n  if (await codeTaken(code))",
      )
      .replace(
        "  await updateById('inventory', id, { code })",
        "  return await create('inventory', { code })\n  case 'update':\n  return await updateById('inventory', id, { code })\n  }",
      )
    expect(await feedback(source)).toEqual([])
  })

  it('leaves read-only existence checks intact', async () => {
    expect(
      await feedback(inventory().replace("  await updateById('inventory', id, { code })", '')),
    ).toEqual([])
  })

  it('does not associate a lookup with an update of a different table', async () => {
    const source = inventory().replace("updateById('inventory'", "updateById('deliveries'")
    expect(await feedback(source)).toEqual([])
  })

  it('does not associate updates in a separate function', async () => {
    const source =
      inventory().replace("  await updateById('inventory', id, { code })", '') +
      "\nexport async function another(id: string) { await updateById('inventory', id, {}) }\n"
    expect(await feedback(source)).toEqual([])
  })

  it('does not infer datastore behavior from unrelated functions with the same names', async () => {
    expect(
      await feedback(inventory().replace('@molecule/api-database', './local-store.js')),
    ).toEqual([])
  })

  it('does not treat an eligibility check as a uniqueness constraint', async () => {
    expect(
      await feedback(inventory().replace('Code has already been taken', 'Account is suspended')),
    ).toEqual([])
  })

  it('allows successful duplicate-event acknowledgments with a duplicate log message', async () => {
    const source = inventory().replace(
      "    res.status(409).json({ error: 'Code has already been taken' })\n    return",
      "    console.debug('duplicate callback')\n    return res.status(200).json({ ok: true })",
    )
    expect(await feedback(source)).toEqual([])
  })

  it('recognizes returned 4xx duplicate-error envelopes', async () => {
    const source = inventory().replace(
      "    res.status(409).json({ error: 'Code has already been taken' })\n    return",
      "    return { statusCode: 409, body: { error: 'Code already used' } }",
    )
    expect(await feedback(source)).toHaveLength(1)
  })

  it('does not report a non-terminating branch that only logs a duplicate', async () => {
    expect(await feedback(inventory().replace('    return\n', ''))).toEqual([])
  })
})
