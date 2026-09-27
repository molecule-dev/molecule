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
 * @module
 */

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { previewTargetOrigin } from '../components/PreviewPanel.js'

afterEach(cleanup)

/** Renders a real iframe and returns its element. */
function mountIframe(src: string | null): HTMLIFrameElement {
  const { baseElement } = render(
    src === null ? <iframe data-testid="frame" /> : <iframe data-testid="frame" src={src} />,
  )
  return baseElement.querySelector('[data-testid="frame"]') as HTMLIFrameElement
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
