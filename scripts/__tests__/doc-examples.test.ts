import { describe, expect, it } from 'vitest'

import { exampleProblem, jsdocExamples } from '../lib/doc-examples.mjs'

/**
 * A source file whose module JSDoc holds one fenced example.
 *
 * @param lang - The fence's language.
 * @param code - The example.
 * @returns The file's text.
 */
const fileWith = (lang: string, code: string): string =>
  [
    '/**',
    ' * The module.',
    ' *',
    ' * @example',
    ` * \`\`\`${lang}`,
    ...code.split('\n').map((l) => (l ? ` * ${l}` : ' *')),
    ' * ```',
    ' */',
    'export const x = 1',
    '',
  ].join('\n')

/**
 * The problem the check reports for an example.
 *
 * @param lang - The fence's language.
 * @param code - The example.
 * @param file - The file it sits in.
 * @returns The compiler's message, or null.
 */
const problem = (
  lang: string,
  code: string,
  file = 'packages/app/features/x/src/index.ts',
): string | null => {
  const [example] = jsdocExamples(fileWith(lang, code), file)
  expect(example).toBeDefined()
  return exampleProblem(example!)
}

describe('jsdocExamples', () => {
  it('reads each fence as a reader sees it, with its opening line', () => {
    const text = fileWith('svelte', '<script lang="ts">\n  let a = 1\n</script>\n\n<p>{a}</p>')
    expect(jsdocExamples(text, 'x.ts')).toEqual([
      {
        lang: 'svelte',
        line: 5,
        code: '<script lang="ts">\n  let a = 1\n</script>\n\n<p>{a}</p>',
        file: 'x.ts',
      },
    ])
  })

  it('finds the examples after a template literal with a substitution (a bare scanner loses them)', () => {
    const text = ['const a = `x${1}y`', '', fileWith('vue', '<template><p>hi</p></template>')].join(
      '\n',
    )
    expect(jsdocExamples(text, 'x.ts').map((e) => e.lang)).toEqual(['vue'])
  })

  it('reads *\\/ as the comment closer JSDoc writes it for, and skips plain block comments', () => {
    const text = [
      '/* ```svelte',
      ' * <p>not JSDoc</p>',
      ' * ``` */',
      fileWith('svelte', '<script lang="ts">\n  const f = () => { /* note *\\/ }\n</script>'),
    ].join('\n')
    const examples = jsdocExamples(text, 'x.ts')
    expect(examples).toHaveLength(1)
    expect(examples[0]!.code).toContain('/* note */')
    expect(exampleProblem(examples[0]!)).toBeNull()
  })

  it('removes the indentation an indented fence adds', () => {
    const text = [
      '/**',
      ' *   ```vue',
      ' *   <template><p>hi</p></template>',
      ' *   ```',
      ' */',
      '',
    ].join('\n')
    expect(jsdocExamples(text, 'x.ts')[0]!.code).toBe('<template><p>hi</p></template>')
  })
})

describe('svelte examples', () => {
  // Each known-bad case is one of the 2026-11-22 shapes.
  it('refuses a snippet written inside <script>', () => {
    expect(
      problem(
        'svelte',
        '<script lang="ts">\n  let a = 1\n  {#snippet row(p: string)}\n    <b>{p}</b>\n  {/snippet}\n</script>',
      ),
    ).toMatch(/Unexpected token/)
  })

  it('refuses an element left open, and <tr> straight in <table>', () => {
    expect(
      problem(
        'svelte',
        '<script lang="ts">\n  let on = true\n</script>\n\n<button onclick={() => (on = !on)}>',
      ),
    ).toMatch(/left open/)
    expect(problem('svelte', '<table>\n  <tr><td>1</td></tr>\n</table>')).toMatch(
      /cannot be a child of `<table>`/,
    )
  })

  it('refuses a {...} placeholder and a comment that never closes', () => {
    expect(problem('svelte', '<div data-state={...}></div>')).not.toBeNull()
    expect(
      problem('svelte', '<script lang="ts">\n  const f = () => { /* save it * }\n</script>'),
    ).toMatch(/Unterminated comment/)
  })

  it("refuses Svelte 4's export let and $:, which runes mode does not allow", () => {
    expect(
      problem('svelte', '<script>\n  export let size = "md"\n</script>\n\n<p>{size}</p>'),
    ).toMatch(/export let/)
    expect(
      problem('svelte', '<script>\n  let a = 1\n  $: b = a * 2\n</script>\n\n<p>{b}</p>'),
    ).toMatch(/\$:/)
  })

  it('refuses two components in one fence', () => {
    expect(
      problem(
        'svelte',
        '<script lang="ts">\n  let a = 1\n</script>\n<p>{a}</p>\n<script lang="ts">\n  let b = 2\n</script>',
      ),
    ).toMatch(/single top-level `<script>`/)
  })

  it('counterexample: compiles markup with no <script> as TypeScript, and names the example does not define', () => {
    expect(
      problem(
        'svelte',
        '<TagList value={labels}>\n  {#snippet renderTag(tag: string, index: number)}\n    <b data-index={index}>{tag}</b>\n  {/snippet}\n</TagList>',
      ),
    ).toBeNull()
    expect(
      problem(
        'svelte',
        '<script lang="ts">\n  let { items = [], children } = $props()\n  const count = $derived(items.length)\n</script>\n\n<p>{count} {thread.title}</p>\n{@render children?.()}',
      ),
    ).toBeNull()
  })
})

describe('vue examples', () => {
  it('refuses markup with no <template>, TypeScript without lang="ts", and await outside an async function', () => {
    expect(
      problem('vue', '<UserMenu :guest-name="name">\n  <MenuTrigger />\n</UserMenu>'),
    ).not.toBeNull()
    expect(
      problem('vue', '<script setup>\nconst props = defineProps<{ id: string }>()\n</script>'),
    ).not.toBeNull()
    expect(
      problem(
        'vue',
        '<script setup lang="ts">\nconst load = (id: string) => {\n  const r = await fetch(id)\n  return r\n}\n</script>',
      ),
    ).not.toBeNull()
  })

  it('counterexample: compiles a script setup component with its template', () => {
    expect(
      problem(
        'vue',
        '<script setup lang="ts">\nimport { ref } from \'vue\'\nconst draft = ref(\'\')\n</script>\n\n<template>\n  <input v-model="draft" />\n  <p v-if="draft">{{ draft }}</p>\n</template>',
      ),
    ).toBeNull()
  })
})

describe('angular examples', () => {
  /**
   * An Angular `ts` example with one component.
   *
   * @param template - The component's template.
   * @param body - The class body.
   * @param heritage - An `extends` clause.
   * @returns The example.
   */
  const component = (template: string, body = '', heritage = ''): string =>
    [
      "import { Component, signal } from '@angular/core'",
      '',
      '@Component({',
      "  selector: 'app-x',",
      '  standalone: true,',
      `  template: \`${template}\`,`,
      '})',
      `export class X${heritage} {${body}}`,
    ].join('\n')

  it('refuses a self-closed native element, also with an attribute-selector component on it', () => {
    expect(problem('ts', component('<div mol-row [entry]="entry"/>', ' entry = {} '))).toMatch(
      /self closed "div"/,
    )
  })

  it('refuses a template that reads names its class does not declare', () => {
    expect(problem('ts', component('<button (click)="open(item)">{{ item.name }}</button>'))).toBe(
      'the template reads open, item, which class X does not declare',
    )
    // A name read inside a template whose context is another name.
    expect(
      problem(
        'ts',
        component('<ng-template #link let-p><a [href]="p.href">{{ hit.title }}</a></ng-template>'),
      ),
    ).toBe('the template reads hit, which class X does not declare')
  })

  it('counterexample: members, constructor properties, template names and Angular globals pass', () => {
    const template = [
      '<input #box (input)="query.set(box.value)" />',
      '@let total = items().length;',
      '@for (item of items(); track item.id; let i = $index) {',
      '  <p (click)="pick(item, i, $event)">{{ $any(item).name }} of {{ total }}</p>',
      '}',
      '<ng-template #row let-row><b>{{ row.title }} {{ label }}</b></ng-template>',
      '<mol-chip [delta]="12" />',
    ].join('\n')
    const body = [
      '',
      '  readonly query = signal("")',
      '  readonly items = signal([{ id: "a", name: "A" }])',
      '  pick(item: unknown, index: number, event: Event) {}',
      '  constructor(readonly label: string) {}',
      '',
    ].join('\n')
    expect(problem('ts', component(template, body))).toBeNull()
  })

  it('counterexample: a class that extends another, a ts example with no @Component, and html outside Angular', () => {
    expect(problem('ts', component('<p>{{ inherited }}</p>', '', ' extends Base'))).toBeNull()
    expect(problem('ts', "import { x } from 'y'\nx()")).toBeNull()
    expect(problem('html', '<div/>', 'packages/app/features/x-react/src/index.ts')).toBeNull()
    expect(problem('html', '<div/>', 'packages/app/features/x-angular/src/index.ts')).toMatch(
      /self closed/,
    )
  })
})
