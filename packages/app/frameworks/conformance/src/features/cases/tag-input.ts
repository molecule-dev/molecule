/**
 * `@molecule/app-tag-input-react` cases: the tag chip (`TagChip`), the
 * controlled tokenizer (`TagInput`), the read-only list of saved tags
 * (`TagList`) and the markup-free `useTagInput` hook.
 *
 * `TagChip` is a static label, a keyboard-operable body control, a remove
 * button, or a body control beside a remove button — the container must stop
 * being a control as soon as it holds two. `TagInput` commits a draft on Enter,
 * comma, Tab and blur, removes the last tag on Backspace in an empty field and
 * never lets Enter submit an enclosing form. The hook cases pin the same
 * semantics without markup: the draft, `inputProps`, `add`/`remove`, rejection
 * by `normalize`/`maxTags`, and one `args` step so a changed controlled value
 * and changed rules reach the same mount.
 *
 * @module
 */

import type { HookCases } from '../../bindings/spec.js'
import type { FeatureCases } from '../spec.js'

/** A keydown a `<input>` or a chip body receives, with a recorded `preventDefault`. */
const key = (name: string, composing = false): Record<string, unknown> => ({
  key: name,
  nativeEvent: { isComposing: composing },
  preventDefault: { $fn: 'prevent' },
})

/** A change event for a text input. */
const edited = (value: string): Record<string, unknown> => ({ target: { value } })

/** The recorded `onChange` a hook case notifies. */
const changed = { $fn: 'onChange' }

/** `useTagInput`: tag-entry behavior without markup. */
const useTagInputCases: HookCases = {
  hook: 'useTagInput',
  // The controlled value and the rules arrive on every render, and an app that
  // swaps its own tag list must be followed on the same mount.
  reactiveArgs: true,
  cases: [
    {
      name: 'a default add trims and appends',
      args: [{ value: [], onChange: changed }],
      steps: [{ type: 'call', method: 'add', args: ['  one  '] }],
    },
    {
      name: 'blank and duplicate additions are rejected',
      args: [{ value: ['one'], onChange: changed }],
      steps: [
        { type: 'call', method: 'add', args: ['   '] },
        { type: 'call', method: 'add', args: ['one'] },
        { type: 'call', method: 'add', args: ['two'] },
      ],
    },
    {
      name: 'maxTags blocks further additions',
      args: [{ value: ['one'], onChange: changed, maxTags: 1 }],
      steps: [{ type: 'call', method: 'add', args: ['two'] }],
    },
    {
      name: 'remove drops the tag at its index',
      args: [{ value: ['a', 'b', 'c'], onChange: changed }],
      steps: [{ type: 'call', method: 'remove', args: [1] }],
    },
    {
      name: 'a custom normalize decides what is added',
      args: [{ value: [], onChange: changed, normalize: { $fn: 'slug', returns: 'slug' } }],
      steps: [{ type: 'call', method: 'add', args: ['  Weird  '] }],
    },
    {
      name: 'setDraft replaces the draft the input shows',
      args: [{ value: [], onChange: changed }],
      steps: [
        { type: 'call', method: 'setDraft', args: ['one'] },
        { type: 'call', method: 'inputProps.onChange', args: [edited('two')] },
      ],
    },
    {
      name: 'Enter commits the draft and clears it',
      args: [{ value: [], onChange: changed }],
      steps: [
        { type: 'call', method: 'setDraft', args: ['one'] },
        { type: 'call', method: 'inputProps.onKeyDown', args: [key('Enter')] },
      ],
    },
    {
      name: 'Enter on a blank draft is canceled and adds nothing',
      args: [{ value: [], onChange: changed }],
      steps: [{ type: 'call', method: 'inputProps.onKeyDown', args: [key('Enter')] }],
    },
    {
      name: 'a composing Enter is left to the input method',
      args: [{ value: [], onChange: changed }],
      steps: [
        { type: 'call', method: 'setDraft', args: ['日本'] },
        { type: 'call', method: 'inputProps.onKeyDown', args: [key('Enter', true)] },
      ],
    },
    {
      name: 'comma and Tab commit a non-empty draft',
      args: [{ value: [], onChange: changed }],
      steps: [
        { type: 'call', method: 'setDraft', args: ['one'] },
        { type: 'call', method: 'inputProps.onKeyDown', args: [key(',')] },
        { type: 'call', method: 'setDraft', args: ['two'] },
        { type: 'call', method: 'inputProps.onKeyDown', args: [key('Tab')] },
      ],
    },
    {
      name: 'an empty Tab keeps browser focus traversal',
      args: [{ value: [], onChange: changed }],
      steps: [{ type: 'call', method: 'inputProps.onKeyDown', args: [key('Tab')] }],
    },
    {
      name: 'Backspace on an empty draft removes the last tag',
      args: [{ value: ['a', 'b'], onChange: changed }],
      steps: [{ type: 'call', method: 'inputProps.onKeyDown', args: [key('Backspace')] }],
    },
    {
      name: 'Backspace with a draft keeps the tags',
      args: [{ value: ['a'], onChange: changed }],
      steps: [
        { type: 'call', method: 'setDraft', args: ['b'] },
        { type: 'call', method: 'inputProps.onKeyDown', args: [key('Backspace')] },
      ],
    },
    {
      name: 'blur commits a non-empty draft',
      args: [{ value: [], onChange: changed }],
      steps: [
        { type: 'call', method: 'setDraft', args: ['one'] },
        { type: 'call', method: 'inputProps.onBlur' },
      ],
    },
    {
      name: 'blur after a committed Enter adds nothing more',
      args: [{ value: [], onChange: changed }],
      steps: [
        { type: 'call', method: 'setDraft', args: ['one'] },
        { type: 'call', method: 'inputProps.onKeyDown', args: [key('Enter')] },
        { type: 'call', method: 'inputProps.onBlur' },
      ],
    },
    {
      name: 'an add keeps the independent draft for a later blur',
      args: [{ value: [], onChange: changed }],
      steps: [
        { type: 'call', method: 'setDraft', args: ['typed'] },
        { type: 'call', method: 'add', args: ['suggested'] },
        { type: 'call', method: 'inputProps.onBlur' },
      ],
    },
    {
      // An app that replaces its controlled list and tightens its limits (the
      // retained `add`/`remove` must read the latest rules, never the mount's).
      name: 'changed arguments reach the retained actions',
      args: [{ value: ['old'], onChange: changed, maxTags: 2 }],
      steps: [
        {
          type: 'args',
          args: [{ value: ['new'], onChange: { $fn: 'after' }, maxTags: 1 }],
        },
        { type: 'call', method: 'add', args: ['blocked'] },
        { type: 'call', method: 'remove', args: [0] },
      ],
    },
  ],
}

/** `@molecule/app-tag-input-react`. */
export const tagInputFeature: FeatureCases = {
  package: '@molecule/app-tag-input-react',
  families: [
    {
      component: 'TagChip',
      cases: [
        { name: 'plain label', children: ['react'] },
        { name: 'extra classes', children: ['react'], props: { className: 'chip-cls' } },
        {
          name: 'clickable body',
          children: ['react'],
          props: { className: 'chip-click' },
          callbacks: ['onClick'],
          interactions: [
            { type: 'click', selector: 'span.chip-click' },
            { type: 'keydown', selector: 'span.chip-click', key: 'Enter' },
            { type: 'keydown', selector: 'span.chip-click', key: ' ' },
            { type: 'keydown', selector: 'span.chip-click', key: 'Escape' },
          ],
        },
        {
          name: 'remove button',
          children: ['js'],
          props: { className: 'chip-remove' },
          callbacks: ['onRemove'],
          interactions: [{ type: 'click', selector: 'button[aria-label="Remove"]' }],
        },
        {
          name: 'body action beside a remove button',
          children: ['react'],
          props: { className: 'chip-both' },
          callbacks: ['onClick', 'onRemove'],
          interactions: [
            { type: 'click', selector: 'button[type="button"]:not([aria-label])' },
            { type: 'click', selector: 'button[aria-label="Remove"]' },
          ],
        },
      ],
    },
    {
      component: 'TagList',
      cases: [
        { name: 'saved tags as chips', props: { value: ['react', 'vue', 'react'] } },
        { name: 'no tags', props: { value: [] } },
        {
          name: 'list and item classes',
          props: { value: ['a', 'b'], className: 'tags-cls', itemClassName: 'tag-item' },
        },
        {
          name: 'list attributes go on the list itself',
          props: {
            value: ['cold storage'],
            id: 'stock-conditions',
            'aria-label': 'Stock conditions',
            'data-mol-id': 'stock-conditions-list',
            className: 'stock-labels',
          },
        },
        {
          name: 'app-owned tag content',
          props: {
            value: ['react', 'vue'],
            renderTag: {
              $fn: 'renderTag',
              nodes: [{ tag: 'strong', attrs: { 'data-index': '{1}' }, children: ['#{0}'] }],
            },
          },
        },
        {
          name: 'a changed value replaces the list',
          props: { value: ['a'] },
          interactions: [{ type: 'props', props: { value: ['b', 'c'] } }],
        },
      ],
    },
    {
      component: 'TagInput',
      cases: [
        {
          name: 'empty',
          props: { value: [] },
          callbacks: ['onChange'],
        },
        {
          name: 'two tags',
          props: { value: ['react', 'vue'] },
          callbacks: ['onChange'],
          interactions: [
            { type: 'click', selector: 'span:nth-child(2) button[aria-label="Remove"]' },
            { type: 'click', selector: 'button[aria-label="Remove"]' },
          ],
        },
        {
          name: 'custom placeholder',
          props: { value: [], placeholder: 'Type a label' },
          callbacks: ['onChange'],
        },
        {
          name: 'extra classes',
          props: { value: [], className: 'ti-cls' },
          callbacks: ['onChange'],
        },
        {
          name: 'typing then Enter adds the trimmed tag',
          props: { value: [] },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'input', value: '  solid  ' },
            { type: 'keydown', selector: 'input', key: 'Enter' },
          ],
        },
        {
          name: 'comma commits the draft',
          props: { value: ['react'] },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'input', value: 'vue' },
            { type: 'keydown', selector: 'input', key: ',' },
          ],
        },
        {
          name: 'Tab commits a non-empty draft',
          props: { value: [] },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'input', value: 'svelte' },
            { type: 'keydown', selector: 'input', key: 'Tab' },
          ],
        },
        {
          name: 'an empty Tab keeps focus traversal',
          props: { value: [] },
          callbacks: ['onChange'],
          interactions: [{ type: 'keydown', selector: 'input', key: 'Tab' }],
        },
        {
          name: 'blur commits a non-empty draft',
          props: { value: [] },
          callbacks: ['onChange'],
          interactions: [
            { type: 'focus', selector: 'input' },
            { type: 'input', selector: 'input', value: 'angular' },
            { type: 'blur', selector: 'input' },
          ],
        },
        {
          name: 'a duplicate is rejected',
          props: { value: ['react'] },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'input', value: 'react' },
            { type: 'keydown', selector: 'input', key: 'Enter' },
          ],
        },
        {
          name: 'maxTags stops further additions',
          props: { value: ['a'], maxTags: 1 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'input', value: 'b' },
            { type: 'keydown', selector: 'input', key: 'Enter' },
          ],
        },
        {
          name: 'a custom normalize decides what is added',
          props: { value: [], normalize: { $fn: 'slug', returns: 'slug' } },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'input', value: '  Weird  ' },
            { type: 'keydown', selector: 'input', key: 'Enter' },
          ],
        },
        {
          name: 'Backspace on an empty field removes the last tag',
          props: { value: ['a', 'b'] },
          callbacks: ['onChange'],
          interactions: [{ type: 'keydown', selector: 'input', key: 'Backspace' }],
        },
        {
          name: 'Backspace with a draft keeps the tags',
          props: { value: ['a'] },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'input', value: 'b' },
            { type: 'keydown', selector: 'input', key: 'Backspace' },
          ],
        },
        {
          name: 'a changed controlled value replaces the tags',
          props: { value: ['a'] },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { value: ['b', 'c'] } }],
        },
      ],
    },
  ],
  hooks: [useTagInputCases],
}
