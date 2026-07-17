# @molecule/app-live-preview-iframe

Iframe-based live preview provider for molecule.dev — manages preview STATE
(load-target `url`, URL-bar `currentUrl`, Back/Forward history, device
frame, loading/error, `loadNonce`). A companion renderer (e.g.
`@molecule/app-ide-react`'s preview panel) renders the actual `<iframe>`
and feeds `notifyLoaded` / `notifyError` / `recordNavigation` back in.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-live-preview'
import { provider } from '@molecule/app-live-preview-iframe'

setProvider(provider)   // once, at app startup (bonds.ts)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-live-preview-iframe @molecule/app-live-preview
```

## API

### Interfaces

#### `IframePreviewConfig`

Configuration for iframe preview.

```typescript
interface IframePreviewConfig {
  /** Initial preview URL. */
  defaultUrl?: string
  /** Default device frame. */
  defaultDevice?: DeviceFrame
}
```

### Classes

#### `IframePreviewProvider`

Iframe-based implementation of `PreviewProvider`. Manages preview URL, device frame selection,
loading state, and connection status. The actual iframe rendering is handled by a companion React component.

### Functions

#### `createProvider(config)`

Creates an `IframePreviewProvider` with optional default URL and device frame.

```typescript
function createProvider(config?: IframePreviewConfig): IframePreviewProvider
```

- `config` — Iframe preview configuration (default URL, default device frame).

**Returns:** An `IframePreviewProvider` that manages live preview state.

### Constants

#### `provider`

Pre-instantiated provider singleton.

```typescript
const provider: IframePreviewProvider
```

## Core Interface
Implements `@molecule/app-live-preview` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-live-preview'
import { provider } from '@molecule/app-live-preview-iframe'

export function setupLivePreviewIframe(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-live-preview` ^1.0.0

### Runtime Dependencies

- `@molecule/app-live-preview`

- `setUrl(sameUrl)` is a deliberate no-op — renderers key reloads off
  `loadNonce`. See `@molecule/app-live-preview`'s remarks for the full
  renderer contract (`molecule:navigate` reporting, nav-command Back/Forward,
  `?_r` cache-buster stripping) — this bond implements all of it.

## E2E Tests

Integration checklist — drive the real preview panel this app renders (use
navigate_preview, read_preview_ui, and interact_preview; no mocks), adapt each
item to this app's actual preview UI + routes, and check every box off one by
one. A box you can't check is an integration bug to fix — not a skip:
- [ ] The preview panel renders the target app at its current location: the URL
  bar shows the app's route (`currentUrl`, not the raw load target) and
  read_preview_ui returns the previewed screen's visible elements + pageText, not
  a blank frame.
- [ ] Selecting a device frame/preset resizes the preview to that device: a
  `mobile` frame narrows the viewport, `tablet` is mid-width, `desktop` is wide,
  and `none` shows it unframed/full-width. Switch between two presets and confirm
  the framed width ACTUALLY changes — not merely that a button looks selected.
- [ ] Auto-refresh works: change a source file and the preview reloads on its own
  to show the latest, with no manual reload — read_preview_ui reflects the new
  content. The reload is a `loadNonce` bump (a repeated `setUrl` with the same url
  is a no-op), so verify the CONTENT updated, not just that a reload fired.
- [ ] Navigating inside the preview updates the shown route: click an in-app link
  (or navigate_preview to a new path) and the URL bar's `currentUrl` follows the
  client-side route change the app reports via the `molecule:navigate` message —
  the frame does not stay stuck on the old route.
- [ ] Back/Forward move through the preview's own history: after two in-app
  navigations, Back returns to the previous route and Forward re-advances, and
  each button is disabled exactly when `canGoBack`/`canGoForward` say there is
  nowhere to go (Back disabled at the first entry).
- [ ] A failed or blank load surfaces state, never a silently dead frame: point
  the preview at an unreachable/erroring route and the panel shows a visible
  error or empty state (`error` set; an alert/status message in read_preview_ui),
  not a frozen blank iframe.
