import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, expect, it } from 'vitest'

import rule, { vueListenerKey } from '../../eslint-rules/no-camel-case-native-events-in-vue-h.mjs'
import { restAttrs } from '../../packages/app/frameworks/vue-ui/src/utilities/attrs.js'

/**
 * Unit tests for `molecule-local/no-camel-case-native-events-in-vue-h`: a React-style listener key
 * (`onMouseEnter`) on a native element in a Vue `h()` call reports and is fixed to Vue's key
 * (`onMouseenter`), directly or through a local object spread into the props; a component's
 * callback prop, a single-word event, a modifier and Vue's vnode hooks stay silent. Its fix is the
 * key `@molecule/app-ui-vue` rewrites a caller's React-style key to.
 *
 * @module
 */

RuleTester.describe = describe
RuleTester.it = it

type RuleModule = Parameters<RuleTester['run']>[1]

const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' },
})

ruleTester.run('no-camel-case-native-events-in-vue-h', rule as RuleModule, {
  valid: [
    {
      name: "Vue's lower-case keys on a native element",
      code: "h('button', { onMouseenter: tint, onMouseleave: clear, onKeydown: key, onDblclick: open })",
    },
    {
      name: 'a single-word event, with or without a modifier',
      code: "h('div', { onClick: go, onScroll: track, onClickOnce: first, onScrollPassive: track })",
    },
    {
      name: "a component's callback props",
      code: 'h(Select, { onValueChange: pick }); h(Card, { onKeyDown: key, onDoubleClick: open })',
    },
    {
      name: "Vue's vnode lifecycle hooks",
      code: "h('div', { onVnodeMounted: measure, onVnodeUpdated: measure, onVnodeBeforeUnmount: stop })",
    },
    {
      name: 'an update listener with a colon',
      code: "h('input', { 'onUpdate:modelValue': set })",
    },
  ],
  invalid: [
    {
      name: 'a hover pair on a button',
      code: "h('button', { type: 'button', onMouseEnter: tint, onMouseLeave: clear })",
      output: "h('button', { type: 'button', onMouseenter: tint, onMouseleave: clear })",
      errors: [{ messageId: 'camel' }, { messageId: 'camel' }],
    },
    {
      name: 'a key and a double click on a div',
      code: "h('div', { onKeyDown: key, onDoubleClick: open })",
      output: "h('div', { onKeydown: key, onDblclick: open })",
      errors: [{ messageId: 'camel' }, { messageId: 'camel' }],
    },
    {
      name: 'a local object spread into the props',
      code: "const hover = { onPointerDown: press }\nh('li', { ...hover, key: 1 })",
      output: "const hover = { onPointerdown: press }\nh('li', { ...hover, key: 1 })",
      errors: [{ messageId: 'camel' }],
    },
    {
      name: 'a modifier is kept',
      code: "h('div', { onKeyDownCapture: key })",
      output: "h('div', { onKeydownCapture: key })",
      errors: [{ messageId: 'camel' }],
    },
    {
      name: 'a quoted key is reported without a fix',
      code: "h('span', { 'onMouseEnter': tint })",
      output: null,
      errors: [{ messageId: 'camel' }],
    },
  ],
})

describe('the fix', () => {
  it("is the key @molecule/app-ui-vue's restAttrs rewrites a React-style key to", () => {
    const names = [
      'onMouseEnter',
      'onMouseLeave',
      'onMouseDown',
      'onKeyDown',
      'onKeyUp',
      'onPointerDown',
      'onPointerMove',
      'onTouchEnd',
      'onContextMenu',
      'onDoubleClick',
      'onDragStart',
      'onKeyDownCapture',
    ]
    for (const name of names)
      expect(vueListenerKey(name)).toBe(Object.keys(restAttrs({ [name]: () => {} }))[0])
  })
})
