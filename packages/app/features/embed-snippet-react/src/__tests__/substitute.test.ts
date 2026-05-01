import { describe, expect, it } from 'vitest'

import { coerceDimension, substituteTemplate } from '../substitute.js'

describe('coerceDimension', () => {
  it('returns empty string for nullish/empty values', () => {
    expect(coerceDimension(undefined)).toBe('')
    expect(coerceDimension(null)).toBe('')
    expect(coerceDimension('')).toBe('')
  })

  it('appends px to bare numbers', () => {
    expect(coerceDimension(640)).toBe('640px')
  })

  it('passes string values through', () => {
    expect(coerceDimension('100%')).toBe('100%')
    expect(coerceDimension('480px')).toBe('480px')
    expect(coerceDimension('60vh')).toBe('60vh')
  })
})

describe('substituteTemplate', () => {
  it('substitutes width/height/theme placeholders', () => {
    const tpl = '<iframe width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'
    const out = substituteTemplate(tpl, { width: 640, height: '480px', theme: 'dark' })
    expect(out).toBe('<iframe width="640px" height="480px" data-theme="dark" />')
  })

  it('tolerates internal whitespace inside placeholders', () => {
    const out = substituteTemplate('w={{ width }} h={{height }}', { width: 100, height: 50 })
    expect(out).toBe('w=100px h=50px')
  })

  it('replaces missing values with empty strings', () => {
    const out = substituteTemplate('w="{{width}}" h="{{height}}" t="{{theme}}"', {})
    expect(out).toBe('w="" h="" t=""')
  })

  it('leaves unknown placeholders untouched', () => {
    const out = substituteTemplate('id={{id}} w={{width}}', { width: 100 })
    expect(out).toBe('id={{id}} w=100px')
  })

  it('replaces every occurrence of a placeholder', () => {
    const out = substituteTemplate('{{theme}}/{{theme}}', { theme: 'dark' })
    expect(out).toBe('dark/dark')
  })
})
