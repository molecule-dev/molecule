/**
 * Types of `@molecule/app-share-link-card-angular` — the Angular counterpart
 * of `@molecule/app-share-link-card-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by `ShareLinkCard` — the same props
 * `@molecule/app-share-link-card-react` accepts. Node props (`title`,
 * `description`, `qr`) are projected content in Angular (an input cannot carry
 * a node), so pass them in the host template: `<span slot="title">…</span>`,
 * `<span slot="description">…</span>`, `<span slot="qr">…</span>`.
 */
export interface ShareLinkCardProps {
  /** Card title, projected as `[slot=title]` content. */
  title?: unknown
  /** Supporting copy, projected as `[slot=description]` content. */
  description?: unknown
  /** The URL users can copy/share. */
  url: string
  /** Optional QR rendering node, projected as `[slot=qr]` content. */
  qr?: unknown
  /** Whether the QR is visible. Defaults to false. */
  showQR?: boolean
  /** Password-protect toggle — pass to render the toggle row. */
  passwordProtect?: {
    /** Whether the toggle is on. */
    enabled: boolean
    /** Called with the toggle's new boolean state (React's `onChange`). */
    onChange: (enabled: boolean) => void
    /** Row label: a string, or node content projected through a `TemplateRef`. */
    label?: unknown
  }
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
