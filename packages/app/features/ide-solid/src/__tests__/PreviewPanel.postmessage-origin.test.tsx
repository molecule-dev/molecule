// @vitest-environment jsdom

/**
 * PreviewPanel outbound postMessage targetOrigin.
 *
 * The panel's bridge posts (ui-command, viewport-result, nav-command, reload
 * re-posts) used wildcard `'*'` targets — commands that can DRIVE the page were
 * deliverable to whatever page ever ended up in the frame. They now target the
 * iframe's current src origin ({@link previewTargetOrigin}), falling back to
 * `'*'` only when no src can be parsed (never break the bridge).
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.postmessage-origin.test.tsx`
 * with the same test names and the same assertions: the targetOrigin helper is
 * the SAME shared function (`@molecule/app-ide-panel-logic/panels`), so the
 * Solid panel re-exports it and reads a real iframe element the same way.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { previewTargetOrigin } from '../components/PreviewPanel.jsx'

/**
 * Cases a real iframe element, optionally with a `src` attribute.
 *
 * @param src - The `src` attribute, or null for none.
 * @returns The iframe element.
 */
function mountIframe(src: string | null): HTMLIFrameElement {
  const frame = document.createElement('iframe')
  if (src !== null) frame.setAttribute('src', src)
  document.body.appendChild(frame)
  return frame
}

describe('previewTargetOrigin', () => {
  it('targets the parsed origin of the iframe src (with cache-buster query intact)', () => {
    const frame = mountIframe('https://abc123.mlcl.dev/?molcache=1727412000')
    expect(previewTargetOrigin(frame)).toBe('https://abc123.mlcl.dev')
  })

  it('targets a localhost dev-server origin too', () => {
    const frame = mountIframe('http://127.0.0.1:45117/')
    expect(previewTargetOrigin(frame)).toBe('http://127.0.0.1:45117')
  })

  it('falls back to * when there is no src attribute', () => {
    const frame = mountIframe(null)
    expect(previewTargetOrigin(frame)).toBe('*')
  })

  it('falls back to * when the src is not a parseable URL (never break the bridge)', () => {
    const frame = mountIframe('not a url at all')
    expect(previewTargetOrigin(frame)).toBe('*')
    expect(previewTargetOrigin(null)).toBe('*')
  })
})
