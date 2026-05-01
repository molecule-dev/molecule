import { describe, expect, it } from 'vitest'

import { sanitizeHtml } from '../sanitize.js'

describe('sanitizeHtml', () => {
  it('strips <script> blocks', () => {
    const input = '<iframe src="x"></iframe><script>alert(1)</script>'
    const output = sanitizeHtml(input)
    expect(output).not.toMatch(/<script/i)
    expect(output).not.toMatch(/alert/)
    expect(output).toContain('<iframe src="x"></iframe>')
  })

  it('strips multi-line <script> blocks', () => {
    const input = `<div>ok</div><script type="text/javascript">
      var x = 1;
      doBad();
    </script>`
    const output = sanitizeHtml(input)
    expect(output).not.toMatch(/<script/i)
    expect(output).not.toMatch(/doBad/)
    expect(output).toContain('<div>ok</div>')
  })

  it('strips self-closing <script /> tags', () => {
    const input = '<script src="https://evil.example/x.js"/><p>ok</p>'
    const output = sanitizeHtml(input)
    expect(output).not.toMatch(/<script/i)
    expect(output).toContain('<p>ok</p>')
  })

  it('strips on*= event handlers (double-quoted, single-quoted, bare)', () => {
    const a = sanitizeHtml('<div onclick="bad()">ok</div>')
    const b = sanitizeHtml("<div onload='bad()'>ok</div>")
    const c = sanitizeHtml('<div onmouseover=bad()>ok</div>')
    expect(a).toBe('<div>ok</div>')
    expect(b).toBe('<div>ok</div>')
    expect(c).toBe('<div>ok</div>')
  })

  it('neutralizes javascript: URLs in href and src', () => {
    const a = sanitizeHtml('<a href="javascript:alert(1)">x</a>')
    const b = sanitizeHtml("<img src='javascript:alert(2)'>")
    const c = sanitizeHtml('<a href=javascript:alert(3)>x</a>')
    expect(a).not.toMatch(/javascript:/i)
    expect(a).toContain('about:blank')
    expect(b).not.toMatch(/javascript:/i)
    expect(c).not.toMatch(/javascript:/i)
  })

  it('preserves benign iframe markup', () => {
    const input =
      '<iframe width="560" height="315" src="https://www.youtube.com/embed/abc" allowfullscreen></iframe>'
    expect(sanitizeHtml(input)).toBe(input)
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('')
  })
})
