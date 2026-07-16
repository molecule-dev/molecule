# @molecule/app-video-call-controls-react

Video-call participant tile + controls bar.

Exports:
- `<VideoCallControls>` — bottom controls bar (mute/video/screen-share/leave).
- `<ParticipantTile>` — single participant card with name, mute, hand-raised, speaking ring.

Pure UI — the app owns the WebRTC/SDK plumbing (pair with an
`@molecule/api-video-rooms-*` bond server-side) and passes state +
callbacks down.

## Quick Start

```tsx
import { useState } from 'react'

import { ParticipantTile, VideoCallControls } from '@molecule/app-video-call-controls-react'

function CallBar() {
  const [audioOn, setAudioOn] = useState(true)
  const [videoOn, setVideoOn] = useState(true)
  return (
    <div>
      <ParticipantTile name="Alice" audioEnabled={audioOn} speaking />
      <VideoCallControls
        audioEnabled={audioOn}
        onToggleAudio={() => setAudioOn((v) => !v)}
        videoEnabled={videoOn}
        onToggleVideo={() => setVideoOn((v) => !v)}
        onLeave={() => console.log('leave call')}
      />
    </div>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-video-call-controls-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `ParticipantTileProps`

Props for the {@link ParticipantTile} component.

```typescript
interface ParticipantTileProps {
  /** Participant display name. */
  name: ReactNode
  /** Optional video stream slot — `<video>` element supplied by the app. */
  videoSlot?: ReactNode
  /** Optional avatar shown when video is off. */
  avatarSlot?: ReactNode
  /** Audio enabled (renders muted indicator when false). */
  audioEnabled?: boolean
  /** Hand-raised indicator. */
  handRaised?: boolean
  /** Whether this participant is currently speaking. */
  speaking?: boolean
  /** Whether this is the local user. */
  isLocal?: boolean
  /** Extra classes on the tile wrapper. */
  className?: string
}
```

#### `VideoCallControlsProps`

Props for the {@link VideoCallControls} component.

```typescript
interface VideoCallControlsProps {
  audioEnabled: boolean
  onToggleAudio: () => void
  videoEnabled: boolean
  onToggleVideo: () => void
  screenSharing?: boolean
  onToggleScreenShare?: () => void
  onLeave: () => void
  /** Additional buttons to render before the leave button (chat, participants, etc.). */
  extraControls?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `ParticipantTile(props)`

Single participant tile for a video grid. Apps supply the video
element via `videoSlot`; this component renders the surrounding
chrome (name badge, mute indicator, hand-raised, speaking ring).

```typescript
function ParticipantTile({
  name,
  videoSlot,
  avatarSlot,
  audioEnabled = true,
  handRaised,
  speaking,
  isLocal,
  className,
}: ParticipantTileProps): JSX.Element
```

- `props` — Component props (see {@link ParticipantTileProps}).

#### `VideoCallControls(props)`

Bottom controls bar for a video meeting — mute, camera, screen-share,
leave. Pure UI — apps own the WebRTC plumbing.

```typescript
function VideoCallControls({
  audioEnabled,
  onToggleAudio,
  videoEnabled,
  onToggleVideo,
  screenSharing,
  onToggleScreenShare,
  onLeave,
  extraControls,
  className,
}: VideoCallControlsProps): JSX.Element
```

- `props` — Component props (see {@link VideoCallControlsProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

Control-button glyphs are EMOJI delivered as i18n defaultValues
(`t('call.muteOn')` → 🎙 etc.) with no separate aria-labels — the emoji
doubles as the accessible name. Translations live in
`@molecule/app-locales-video-call-controls` (on disk, not yet registered
in mlcl's registry — register it or supply the `call.*` keys in app
translations). In `<ParticipantTile>` the ' (you)' suffix and the
'Muted' / 'Hand raised' indicator labels are hardcoded English. Tiles
are fixed 16:9 dark surfaces (#111, white text, green speaking ring)
regardless of theme; supply your `<video>` element via `videoSlot` and a
fallback via `avatarSlot`. The screen-share button renders only when
`onToggleScreenShare` is provided; `extraControls` slots more buttons
before Leave. Props (documented on the exported `VideoCallControlsProps`
and `ParticipantTileProps` interfaces) — VideoCallControls:
audioEnabled, onToggleAudio, videoEnabled, onToggleVideo, screenSharing,
onToggleScreenShare, onLeave, extraControls, className; ParticipantTile:
name, videoSlot, avatarSlot, audioEnabled, handRaised, speaking, isLocal,
className.

## Translations

Translation strings are provided by `@molecule/app-locales-video-call-controls`.
