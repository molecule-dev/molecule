import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'

// The rule under test is a vendored copy of the workspace canonical
// (../../../scripts/eslint-rules/no-raw-class-names.mjs), kept byte-identical by
// `scripts/sync-eslint-rules.mjs --check`. This is the file eslint.config.js loads.
import { noRawClassNames } from '../../eslint-rules/no-raw-class-names.mjs'

/**
 * Unit tests for `molecule-local/no-raw-class-names` (molecule AGENTS.md Rule 5).
 *
 * Every branch is asserted in both directions: the class literal it exists for
 * reports, and the ClassMap form of the same code stays silent.
 *
 * @module
 */

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

const raw = (text: string): { messageId: string; data: { text: string } } => ({
  messageId: 'raw',
  data: { text },
})

ruleTester.run('no-raw-class-names', noRawClassNames, {
  valid: [
    {
      name: 'cm.cn of tokens and a passed-through className',
      code: `cm.cn(cm.flex1, cm.minW(0), className)`,
    },
    {
      name: 'a conditional choosing between tokens',
      code: `cm.cn(open ? cm.drawer : cm.overlay, cond && cm.drawerLeft)`,
    },
    { name: 'an empty string', code: `cm.cn(cm.flex1, '')` },
    {
      name: 'JSX className from the ClassMap',
      code: `const El = () => <div className={cm.cn(cm.flex1)} />`,
    },
    {
      name: 'Vue/Solid props passing a class variable',
      code: `h('div', { class: cls, className: props.className })`,
    },
    {
      name: 'a data attribute value that is not a class',
      code: `const El = () => <div data-state={open ? 'open' : 'closed'} />`,
    },
    { name: 'classList with a token', code: `el.classList.add(cm.overlay)` },
    { name: 'setAttribute of another attribute', code: `el.setAttribute('role', 'dialog')` },
    {
      name: 'an Angular class binding',
      code: 'const template = `<div [class]="classes()" class="{{ extra }}"></div>`',
    },
    {
      name: 'an allowed token',
      code: `cm.cn(cm.flex1, 'parity-token')`,
      options: [{ allow: ['parity-token'] }],
    },
    { name: 'toggle force argument', code: `root.classList.toggle(cm.dark, mode === 'dark')` },
  ],
  invalid: [
    {
      name: 'a cm.cn string argument',
      code: `cm.cn(cm.flex1, 'min-w-0')`,
      errors: [raw('min-w-0')],
    },
    {
      name: 'a bare cn string argument',
      code: `cn('block truncate', className)`,
      errors: [raw('block truncate')],
    },
    {
      name: 'strings inside conditionals, logicals and arrays',
      code: `cm.cn(a ? 'x-1' : cm.flex1, b && 'x-2', c || 'x-3', ['x-4'])`,
      errors: [raw('x-1'), raw('x-2'), raw('x-3'), raw('x-4')],
    },
    {
      name: 'a template literal argument',
      code: 'cm.cn(`p-${n} rounded`)',
      errors: [raw('p-'), raw('rounded')],
    },
    {
      name: 'a JSX className literal',
      code: `const El = () => <div className="flex items-center" />`,
      errors: [raw('flex items-center')],
    },
    {
      name: 'a JSX className expression with a string',
      code: `const El = () => <div className={open ? 'is-open' : cm.flex1} />`,
      errors: [raw('is-open')],
    },
    {
      name: 'a JSX class attribute (Solid)',
      code: `const El = () => <div class="shrink-0" />`,
      errors: [raw('shrink-0')],
    },
    {
      name: 'a class property in h() props',
      code: `h('div', { class: 'border-b' })`,
      errors: [raw('border-b')],
    },
    {
      name: 'a className property',
      code: `const props = { className: 'text-left' }`,
      errors: [raw('text-left')],
    },
    {
      name: 'a quoted class key',
      code: `const attrs = { 'class': 'w-full' }`,
      errors: [raw('w-full')],
    },
    {
      name: 'classList add/remove/toggle',
      code: `el.classList.add('a1'); el.classList.remove('b1', 'b2'); el.classList.toggle('c1', on)`,
      errors: [raw('a1'), raw('b1'), raw('b2'), raw('c1')],
    },
    {
      name: "setAttribute('class', …)",
      code: `el.setAttribute('class', 'hidden')`,
      errors: [raw('hidden')],
    },
    {
      name: 'a static class attribute in an Angular inline template',
      code: 'const template = `<span class="truncate">{{ name }}</span>`',
      errors: [raw('truncate')],
    },
    {
      name: 'a static class attribute in a string template',
      code: `const template = '<div class="mt-2"></div>'`,
      errors: [raw('mt-2')],
    },
    {
      name: 'a TS assertion around a string',
      code: `cm.cn('gap-2' as string)`,
      errors: [raw('gap-2')],
      languageOptions: { parser: await import('typescript-eslint').then((m) => m.parser) },
    },
  ],
})
