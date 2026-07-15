# @molecule/app-video-call-controls-react

Video-call participant tile + controls bar.

Exports:
- `<VideoCallControls>` — bottom controls bar (mute/video/screen-share/leave).
- `<ParticipantTile>` — single participant card with name, mute, hand-raised, speaking ring.

## Quick Start

```tsx
import { ParticipantTile, VideoCallControls } from '@molecule/app-video-call-controls-react'

<ParticipantTile
  name="Alice"
  videoSlot={<video ref={videoRef} autoPlay />}
  audioEnabled={audioOn}
  speaking={isSpeaking}
/>

<VideoCallControls
  audioEnabled={audioOn}
  onToggleAudio={() => setAudioOn(v => !v)}
  videoEnabled={videoOn}
  onToggleVideo={() => setVideoOn(v => !v)}
  onLeave={handleLeave}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-video-call-controls-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `ParticipantTile(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .name
- `root0` — .videoSlot
- `root0` — .avatarSlot
- `root0` — .audioEnabled
- `root0` — .handRaised
- `root0` — .speaking
- `root0` — .isLocal
- `root0` — .className

#### `VideoCallControls(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .audioEnabled
- `root0` — .onToggleAudio
- `root0` — .videoEnabled
- `root0` — .onToggleVideo
- `root0` — .screenSharing
- `root0` — .onToggleScreenShare
- `root0` — .onLeave
- `root0` — .extraControls
- `root0` — .className

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
