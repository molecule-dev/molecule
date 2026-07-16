# @molecule/app-ai-image-generator-default

Default HTTP image generator provider for molecule.dev — generates images
through YOUR backend endpoint (JSON or SSE), with history load/delete.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-ai-image-generator'
import { provider } from '@molecule/app-ai-image-generator-default'

setProvider(provider) // custom baseUrl/headers: setProvider(createProvider({...}))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ai-image-generator-default @molecule/app-ai-image-generator @molecule/app-i18n
```

## API

### Interfaces

#### `HttpImageGeneratorConfig`

Configuration for the default HTTP image generator provider.

```typescript
interface HttpImageGeneratorConfig {
  /** Base URL for API requests. Defaults to `''` (same origin). */
  baseUrl?: string
  /** Custom headers to include in requests. */
  headers?: Record<string, string>
}
```

### Classes

#### `HttpImageGeneratorProvider`

HTTP-based implementation of `AIImageGeneratorProvider`.

Sends generation requests via POST, reads progress via SSE or JSON responses,
and supports history loading and image deletion.

### Functions

#### `createProvider(config)`

Creates an `HttpImageGeneratorProvider` instance.

```typescript
function createProvider(config?: HttpImageGeneratorConfig): HttpImageGeneratorProvider
```

- `config` — HTTP-specific configuration (base URL, headers).

**Returns:** A configured `HttpImageGeneratorProvider`.

### Constants

#### `provider`

Pre-instantiated provider singleton.

```typescript
const provider: HttpImageGeneratorProvider
```

## Core Interface
Implements `@molecule/app-ai-image-generator` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-ai-image-generator'
import { provider } from '@molecule/app-ai-image-generator-default'

export function setupAiImageGeneratorDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-image-generator` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/app-ai-image-generator`
- `@molecule/app-i18n`

Talks to YOUR backend at `config.endpoint` — no vendor key in the browser.
Server contract: POST `{ prompt, negativePrompt?, size?, count?, format?,
quality?, style?, model? }`; reply EITHER as plain JSON
`{ images: [{ id, url, prompt, width?, height?, createdAt? }] }` OR as an
SSE stream (`Content-Type: text/event-stream`) of
`data: <ImageGenerationEvent JSON>` lines (`started` / `progress` /
`image` / `done` / `error`) — the bond auto-detects by content type. GET
the same endpoint → `{ images }` for history (fails open to `[]`); DELETE
`${endpoint}/${id}` removes one image. `generate()` NEVER rejects: on any
failure it emits an `error` event and resolves `[]` — drive error UI from
the event callback, not try/catch.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Entering a prompt and generating renders the resulting
  `GeneratedImage`(s) as real pixels on screen: the `image` / `done` events
  deliver objects whose `url` loads to a visible picture, not a broken or
  placeholder tile.
- [ ] A generating indicator shows while the request is in flight — driven
  by the `started` / `progress` (`progress.percent`) events — and clears
  when `done` fires and `generate()` resolves; it never spins forever.
- [ ] A generation failure surfaces visibly: the `error` event's `message`
  (provider failure, or a moderation-rejected prompt) renders as a message
  in the UI, never a silent no-op or a stuck spinner.
- [ ] When the request sets `count` > 1 (bounded 1–10), ALL requested images
  render — the `done` event's `images` array length matches what was asked,
  not just the first one.
- [ ] The request's `size` preset (e.g. `'1024x1024'` vs `'1792x1024'`) is
  honored in the output: the rendered image's `width` / `height` match the
  requested dimensions rather than a default square.
- [ ] The generated image is usable downstream as the app wires it
  (insert / download / select), carrying the real `GeneratedImage` data
  (`id`, `url`); because `url` may be temporary, an image kept in a gallery
  still loads after a full reload — proving the app persisted the bytes, not
  a dead upstream link.
- [ ] Generations are scoped to the requesting user: `loadHistory` / the
  gallery returns only that user's own images, and a moderation-rejected
  prompt shows the rejection rather than a blank tile.
