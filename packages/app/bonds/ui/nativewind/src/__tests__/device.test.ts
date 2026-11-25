/**
 * `forDevice`: the rewrite that turns a web class string into classes
 * NativeWind applies on a device.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { descendantRule, forDevice, joinClass, splitVariants, stateRule } from '../device.js'

describe('forDevice', () => {
  it('turns sibling spacing into gap, keeping its variants', () => {
    expect(forDevice('flex flex-col space-y-1.5 p-6')).toBe('flex flex-col gap-y-1.5 p-6')
    expect(forDevice('sm:flex-row sm:space-x-2')).toBe('sm:flex-row sm:gap-x-2')
    expect(forDevice('space-y-reverse -space-x-2 p-1')).toBe('p-1')
  })

  it('drops what a device has no equivalent for', () => {
    expect(forDevice('group flex group-hover:opacity-100 peer peer-focus:text-primary')).toBe(
      'flex',
    )
    expect(forDevice('relative before:absolute after:content-[""] file:border-0')).toBe('relative')
    // A descendant with one tag stays: the native elements apply it (descendantRule).
    expect(forDevice('text-sm [&_p]:leading-relaxed [&>svg]:absolute')).toBe(
      'text-sm [&_p]:leading-relaxed',
    )
    expect(forDevice('p-2 [&_tr:last-child]:border-0 [&:has([role=checkbox])]:pr-0')).toBe(
      'p-2 [&_tr:last-child]:border-0',
    )
    expect(forDevice('m-0 divide-y divide-border')).toBe('m-0')
    expect(forDevice('leading-[1.25] font-inherit text-foreground')).toBe(
      'leading-[1.25] text-foreground',
    )
    expect(
      forDevice('animate-in fade-in-0 zoom-in-95 data-[state=closed]:slide-out-to-right-full'),
    ).toBe('animate-in')
  })

  it('keeps variants NativeWind supports', () => {
    const classes =
      'hover:bg-surface active:opacity-70 dark:bg-primary data-[state=open]:animate-in sm:p-4'
    expect(forDevice(classes)).toBe(classes)
  })

  it('gives a border with no colour the foreground colour (the web draws it in currentColor)', () => {
    expect(forDevice('rounded-md border bg-surface')).toBe(
      'rounded-md border bg-surface border-foreground',
    )
    expect(forDevice('border-b')).toBe('border-b border-foreground')
    expect(forDevice('border-2 border-dashed')).toBe('border-2 border-dashed border-foreground')
  })

  it('leaves a border that names its colour, or has no width', () => {
    expect(forDevice('border border-border')).toBe('border border-border')
    expect(forDevice('border border-transparent border-b-[rgba(170,170,170,0.33)]')).toBe(
      'border border-transparent border-b-[rgba(170,170,170,0.33)]',
    )
    expect(forDevice('border-0')).toBe('border-0')
    // A colour that applies only in one state does not colour the border at rest.
    expect(forDevice('border hover:border-primary')).toBe(
      'border hover:border-primary border-foreground',
    )
  })
})

describe('splitVariants', () => {
  it('reads the variants, the utility and the important marker, and joinClass rebuilds the class', () => {
    expect(splitVariants('md:hover:!bg-[a:b]')).toEqual({
      variants: ['md', 'hover'],
      utility: 'bg-[a:b]',
      important: true,
    })
    expect(splitVariants('p-0')).toEqual({ variants: [], utility: 'p-0', important: false })
    for (const cls of ['md:hover:!bg-[a:b]', 'p-0', '!p-0', 'dark:[&_p]:text-x'])
      expect(
        joinClass(
          splitVariants(cls).variants,
          splitVariants(cls).utility,
          splitVariants(cls).important,
        ),
      ).toBe(cls)
  })
})

describe('stateRule', () => {
  it('reads the data attributes a class requires and the class without them, marked important', () => {
    expect(stateRule('data-[state=checked]:bg-primary')).toEqual({
      attributes: [{ name: 'state', value: 'checked' }],
      cls: '!bg-primary',
    })
    expect(stateRule('dark:data-[disabled]:opacity-50')).toEqual({
      attributes: [{ name: 'disabled', value: null }],
      cls: 'dark:!opacity-50',
    })
  })

  it('is null for a class that requires no data attribute', () => {
    expect(stateRule('bg-primary')).toBeNull()
    expect(stateRule('aria-selected:bg-primary')).toBeNull()
  })
})

describe('descendantRule', () => {
  it('reads the tag a class styles and the class its descendants apply', () => {
    expect(descendantRule('[&_p]:leading-relaxed')).toEqual({ tag: 'p', cls: 'leading-relaxed' })
    expect(descendantRule('dark:[&_li]:text-primary')).toEqual({
      tag: 'li',
      cls: 'dark:text-primary',
    })
  })

  it('keeps first and last row selectors and preserves their precedence', () => {
    expect(descendantRule('[&_tr:last-child]:border-0')).toEqual({
      tag: 'tr:last-child',
      cls: '!border-0',
    })
    expect(descendantRule('dark:[&_tr:first-child]:bg-surface')).toEqual({
      tag: 'tr:first-child',
      cls: 'dark:!bg-surface',
    })
    expect(forDevice('[&_tr:last-child]:border-0')).toBe('[&_tr:last-child]:border-0')
  })

  it('is null for a class that styles the element itself or any other selector', () => {
    expect(descendantRule('leading-relaxed')).toBeNull()
    expect(descendantRule('[&>svg]:absolute')).toBeNull()
    expect(descendantRule('[&_tr:nth-child(2)]:border-0')).toBeNull()
  })
})
