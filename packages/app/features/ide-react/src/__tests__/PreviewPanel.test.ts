/**
 * Tests for PreviewPanel iframe security sandbox attribute.
 *
 * The PreviewPanel component renders untrusted user code in an iframe.
 * The sandbox attribute is the security boundary that prevents the iframe
 * from performing dangerous actions (navigating the parent, triggering
 * downloads, spawning modals, etc.).
 *
 * These tests verify the sandbox value as a contract — both the expected
 * permissions string and a source-file check to catch drift.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

// The sandbox attribute value that must be present on the preview iframe.
const EXPECTED_SANDBOX =
  'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin'

describe('PreviewPanel security', () => {
  describe('iframe sandbox attribute', () => {
    const permissions = EXPECTED_SANDBOX.split(' ')

    it('should include allow-scripts (needed for preview to work)', () => {
      expect(permissions).toContain('allow-scripts')
    })

    it('should include allow-forms (needed for form submissions)', () => {
      expect(permissions).toContain('allow-forms')
    })

    it('should include allow-popups (needed for OAuth and external links)', () => {
      expect(permissions).toContain('allow-popups')
    })

    it('should include allow-same-origin (needed for service workers and localStorage)', () => {
      expect(permissions).toContain('allow-same-origin')
    })

    it('should NOT include allow-top-navigation (prevents iframe from navigating parent)', () => {
      expect(permissions).not.toContain('allow-top-navigation')
    })

    it('should NOT include allow-top-navigation-by-user-activation', () => {
      expect(permissions).not.toContain('allow-top-navigation-by-user-activation')
    })

    it('should NOT include allow-downloads (prevents drive-by downloads)', () => {
      expect(permissions).not.toContain('allow-downloads')
    })

    it('should NOT include allow-modals (prevents alert/confirm/prompt spam)', () => {
      expect(permissions).not.toContain('allow-modals')
    })

    it('should include allow-popups-to-escape-sandbox (popups get full permissions)', () => {
      expect(permissions).toContain('allow-popups-to-escape-sandbox')
    })

    it('should have exactly 5 permissions (no extras)', () => {
      expect(permissions).toHaveLength(5)
    })
  })

  describe('sandbox attribute matches source code', () => {
    it('should match the attribute string in PreviewPanel.tsx', async () => {
      // Read the actual source file to verify the sandbox value has not drifted.
      const fs = await import('node:fs/promises')
      const source = await fs.readFile(
        new URL('../components/PreviewPanel.tsx', import.meta.url),
        'utf-8',
      )
      expect(source).toContain(`sandbox="${EXPECTED_SANDBOX}"`)
    })
  })
})

/**
 * Freeze watchdog: the scaffold posts `molecule:heartbeat` every ~3s; if its main
 * thread locks up (infinite loop / runaway render) the beats stop and we surface a
 * reload banner. This package is node-env (no DOM), so — like the sandbox test
 * above — these assert the wiring against source to catch regressions, notably the
 * original bug where the heartbeat was collected but never read (dead detection).
 */
describe('PreviewPanel freeze watchdog', () => {
  /** The scaffold's heartbeat cadence (index.html.tpl): `setInterval(post, 3000)`. */
  const SCAFFOLD_HEARTBEAT_MS = 3000

  async function readSource(): Promise<string> {
    const fs = await import('node:fs/promises')
    return fs.readFile(new URL('../components/PreviewPanel.tsx', import.meta.url), 'utf-8')
  }

  it('declares a freeze threshold longer than the scaffold heartbeat (no false positives)', async () => {
    const source = await readSource()
    const m = source.match(/FREEZE_THRESHOLD_MS\s*=\s*([\d_]+)/)
    expect(m).not.toBeNull()
    const threshold = Number(m![1].replace(/_/g, ''))
    // Must tolerate at least two missed beats so brief jank doesn't trip it.
    expect(threshold).toBeGreaterThan(SCAFFOLD_HEARTBEAT_MS * 2)
  })

  it('actually reads the heartbeat to detect a freeze (regression: it used to be write-only)', async () => {
    const source = await readSource()
    // The watchdog must consume lastHeartbeatRef, not just write it on message.
    expect(source).toMatch(
      /Date\.now\(\)\s*-\s*lastHeartbeatRef\.current\s*>\s*FREEZE_THRESHOLD_MS/,
    )
    expect(source).toContain('setPreviewFrozen(')
  })

  it('auto-clears the frozen state when the app is not loaded (transient jank recovers)', async () => {
    const source = await readSource()
    // Effect early-returns to setPreviewFrozen(false) when not ready/no url.
    expect(source).toMatch(
      /if \(!iframeReady \|\| fadingOut \|\| !state\.url\) \{\s*setPreviewFrozen\(false\)/,
    )
  })

  it('renders a reload banner with an i18n message and a reload action', async () => {
    const source = await readSource()
    expect(source).toContain('previewFrozen && iframeReady')
    expect(source).toContain("'ide.preview.frozen'")
    expect(source).toContain("'ide.preview.frozenReload'")
    expect(source).toContain('onClick={handleReloadFrozen}')
  })

  it('reloads a frozen preview by remounting the iframe', async () => {
    const source = await readSource()
    // handleReloadFrozen clears the flag, reseeds the heartbeat, and remounts.
    expect(source).toMatch(
      /handleReloadFrozen = useCallback\(\(\) => \{[\s\S]*?setPreviewFrozen\(false\)[\s\S]*?handleManualRetry\(\)/,
    )
  })
})

/**
 * URL bar (PV2): the preview reports its own client-side location via a
 * `molecule:navigate` postMessage; the panel forwards it to `recordNavigation`
 * (which updates the URL bar without reloading the iframe). The bar reflects the
 * preview's CURRENT location and stays editable, committing on Enter. This
 * package is node-env (no DOM), so these assert the wiring against source.
 */
describe('PreviewPanel URL bar (current location)', () => {
  async function readSource(): Promise<string> {
    const fs = await import('node:fs/promises')
    return fs.readFile(new URL('../components/PreviewPanel.tsx', import.meta.url), 'utf-8')
  }

  it('handles the molecule:navigate message and forwards it to recordNavigation', async () => {
    const source = await readSource()
    expect(source).toContain("event.data?.type === 'molecule:navigate'")
    expect(source).toMatch(
      /molecule:navigate'[\s\S]*?if \(typeof event\.data\.url === 'string'\) recordNavigation\(event\.data\.url\)/,
    )
  })

  it('subscribes recordNavigation as a dependency of the message listener', async () => {
    const source = await readSource()
    // The message effect must re-bind when recordNavigation changes.
    expect(source).toMatch(/\}, \[clearPoll, onPreviewError, recordNavigation\]\)/)
  })

  it('binds the URL bar to the live current location, not the raw load target', async () => {
    const source = await readSource()
    expect(source).toContain('const currentLocation = state.currentUrl || state.url')
    // The input is a controlled draft synced to the current location.
    expect(source).toContain('value={urlDraft}')
    expect(source).toMatch(/if \(!urlEditing\) setUrlDraft\(currentLocation\)/)
  })

  it('commits a typed URL on Enter (a real load), not on every keystroke', async () => {
    const source = await readSource()
    expect(source).toMatch(/if \(e\.key === 'Enter'\)[\s\S]*?if \(next\) setUrl\(next\)/)
    // No per-keystroke navigation.
    expect(source).not.toContain('onChange={(e) => setUrl(e.target.value)}')
  })
})

/**
 * Back/Forward (PV3): the panel drives the preview provider's own navigation
 * history. The buttons are wired to back()/forward() and disabled from the
 * canGoBack/canGoForward state flags. A loadNonce-keyed reload makes back/forward
 * (and refresh) reload even when the target URL string is unchanged. Node-env, so
 * assert against source.
 */
describe('PreviewPanel back/forward navigation', () => {
  async function readSource(): Promise<string> {
    const fs = await import('node:fs/promises')
    return fs.readFile(new URL('../components/PreviewPanel.tsx', import.meta.url), 'utf-8')
  }

  it('pulls back/forward off the preview hook', async () => {
    const source = await readSource()
    expect(source).toMatch(/recordNavigation, back, forward \} =\s*\n?\s*usePreview\(\)/)
  })

  it('wires the Back button to back() and disables it via canGoBack', async () => {
    const source = await readSource()
    expect(source).toMatch(
      /molId="preview-back"[\s\S]*?onClick=\{back\}[\s\S]*?disabled=\{!state\.canGoBack\}/,
    )
  })

  it('wires the Forward button to forward() and disables it via canGoForward', async () => {
    const source = await readSource()
    expect(source).toMatch(
      /molId="preview-forward"[\s\S]*?onClick=\{forward\}[\s\S]*?disabled=\{!state\.canGoForward\}/,
    )
  })

  it('does not leave the back/forward buttons as hardcoded-disabled placeholders', async () => {
    const source = await readSource()
    expect(source).not.toMatch(/molId="preview-back"\s*\n\s*disabled\s*\n/)
  })

  it('keys the iframe reload off loadNonce so back/forward/refresh reload at the same URL', async () => {
    const source = await readSource()
    expect(source).toMatch(
      /\}, \[state\.url, state\.loadNonce, startPolling, clearPoll, clearStuckTimer\]\)/,
    )
  })
})
