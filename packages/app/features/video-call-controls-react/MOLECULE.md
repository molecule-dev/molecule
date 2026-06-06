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
npm install @molecule/app-video-call-controls-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
