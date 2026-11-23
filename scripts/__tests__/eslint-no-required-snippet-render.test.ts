import { RuleTester } from 'eslint'
import svelteParser from 'svelte-eslint-parser'
import tseslint from 'typescript-eslint'
import { describe, it } from 'vitest'

import rule from '../../eslint-rules/no-required-snippet-render.mjs'

/**
 * Unit tests for `molecule-local/no-required-snippet-render`: a Svelte port's render tag that calls
 * `x()` reports and is fixed to call `x?.()`, which matches React's rendering of a left-out node
 * prop; an optional call and a snippet the component declares stay silent.
 *
 * @module
 */

RuleTester.describe = describe
RuleTester.it = it

type RuleModule = Parameters<RuleTester['run']>[1]

const ruleTester = new RuleTester({
  languageOptions: { parser: svelteParser, parserOptions: { parser: tseslint.parser } },
})

const component = (markup: string): string =>
  `<script lang="ts">\n  let { children, footer, item } = $props()\n</script>\n\n${markup}\n`

ruleTester.run('no-required-snippet-render', rule as RuleModule, {
  valid: [
    { name: 'an optional render', code: component('<span>{@render children?.()}</span>') },
    {
      name: 'an optional render with arguments',
      code: component('{#each [1] as entry}{@render item?.(entry)}{/each}'),
    },
    { name: 'an optional member render', code: component('{@render $$props.footer?.()}') },
    {
      name: 'a snippet the component declares, rendered after its declaration',
      code: component('{#snippet row(entry)}<b>{entry}</b>{/snippet}{@render row(1)}'),
    },
    {
      name: 'a snippet the component declares, rendered before its declaration',
      code: component('{@render row(1)}{#snippet row(entry)}<b>{entry}</b>{/snippet}'),
    },
  ],
  invalid: [
    {
      name: 'a required render',
      code: component('<span>{@render children()}</span>'),
      output: component('<span>{@render children?.()}</span>'),
      errors: [{ messageId: 'required', data: { callee: 'children' } }],
    },
    {
      name: 'a required render inside an {#if} that tests it',
      code: component('{#if footer}<div>{@render footer()}</div>{/if}'),
      output: component('{#if footer}<div>{@render footer?.()}</div>{/if}'),
      errors: [{ messageId: 'required', data: { callee: 'footer' } }],
    },
    {
      name: 'a required render with arguments',
      code: component('{#each [1] as entry}{@render item(entry)}{/each}'),
      output: component('{#each [1] as entry}{@render item?.(entry)}{/each}'),
      errors: [{ messageId: 'required', data: { callee: 'item' } }],
    },
  ],
})
