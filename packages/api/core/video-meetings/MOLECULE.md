# @molecule/api-video-meetings

Video meetings core interface for molecule.dev.

Defines the standard interface for scheduled video-meeting providers
(Zoom, Google Meet, Microsoft Teams, Webex, etc.). Used by apps such
as meeting schedulers, calendar integrations, AI meeting notetakers,
and tele-counselling.

Distinct from `@molecule/api-video-rooms` — meetings are scheduled
events with a start time, duration, and a stable join URL. Rooms are
ephemeral collaboration spaces with no scheduling semantics.

## Quick Start

```typescript
import {
  setProvider,
  createMeeting,
  listMeetings,
} from '@molecule/api-video-meetings'
import { createProvider } from '@molecule/api-video-meetings-zoom'

// Bond a provider at startup (reads ZOOM_* env vars when config is omitted)
setProvider(createProvider())

// Schedule a meeting
const meeting = await createMeeting({
  topic: 'Quarterly review',
  startTime: new Date('2027-01-15T17:00:00Z'),
  durationMinutes: 60,
  settings: { waitingRoom: true, autoRecording: 'cloud' },
})

// List the current user's upcoming meetings
const page = await listMeetings('me', { type: 'scheduled' })
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-video-meetings @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `CreateMeetingOptions`

Options for creating a new scheduled video meeting.

```typescript
interface CreateMeetingOptions {
  /** Human-readable meeting topic / title. */
  topic: string

  /**
   * When the meeting should start. Required for `scheduled` and
   * `recurring` meetings; omit for an `instant` meeting that starts now.
   */
  startTime?: Date

  /** Meeting duration in minutes. Provider may apply a maximum cap. */
  durationMinutes?: number

  /** Optional longer-form agenda / description shown to participants. */
  agenda?: string

  /** Optional join password. Some providers will auto-generate one if omitted. */
  password?: string

  /** Provider-agnostic meeting settings. */
  settings?: MeetingSettings

  /** Meeting type. Defaults to `scheduled` when `startTime` is given, else `instant`. */
  type?: MeetingType

  /**
   * IANA timezone for the start time, e.g. `America/Los_Angeles`. Used
   * for recurrence and host display; the absolute instant of `startTime`
   * is always honoured.
   */
  timezone?: string
}
```

#### `ListMeetingsOptions`

Options for listing meetings.

```typescript
interface ListMeetingsOptions {
  /**
   * Filter by meeting type. Defaults to `'scheduled'`. Pass `'live'` to
   * list currently-running meetings or `'upcoming'` to list scheduled +
   * recurring future meetings; provider-specific values are ignored.
   */
  type?: MeetingType | 'live' | 'upcoming'

  /** Maximum number of results to return per page. */
  pageSize?: number

  /** Opaque pagination cursor returned by a previous call. */
  pageToken?: string
}
```

#### `Meeting`

A normalised description of an existing scheduled meeting as returned
by a provider.

```typescript
interface Meeting {
  /** Provider-stable meeting identifier. */
  id: string

  /** Meeting topic / title. */
  topic: string

  /** Joinable URL distributed to participants. */
  joinUrl: string

  /** Host start URL — must NOT be shared with participants. */
  startUrl?: string

  /** Numeric or string meeting code shown in clients (e.g. Zoom meeting number). */
  meetingCode?: string

  /** Join password, if one is set. */
  password?: string

  /** Scheduled start time (the absolute instant). */
  startTime?: Date

  /** Scheduled duration in minutes. */
  durationMinutes?: number

  /** Longer-form agenda / description. */
  agenda?: string

  /** Meeting type. */
  type?: MeetingType

  /** IANA timezone the meeting was scheduled in. */
  timezone?: string

  /** Settings reported by the provider. */
  settings?: MeetingSettings
}
```

#### `MeetingPage`

A single page of meetings returned by {@link VideoMeetingsProvider.listMeetings}.

```typescript
interface MeetingPage {
  /** Meetings in this page. */
  meetings: Meeting[]

  /**
   * Cursor for the next page, or `undefined` if there is none. Pass back
   * via {@link ListMeetingsOptions.pageToken}.
   */
  nextPageToken?: string
}
```

#### `MeetingSettings`

Provider-agnostic, normalised meeting settings.

Providers may support a superset of these flags; unsupported flags
should be silently ignored rather than rejected so callers can target
multiple providers with the same payload.

```typescript
interface MeetingSettings {
  /** Whether the host's video starts on by default. */
  hostVideo?: boolean

  /** Whether participants' video starts on by default. */
  participantVideo?: boolean

  /** Whether participants can join before the host arrives. */
  joinBeforeHost?: boolean

  /** Whether participants are muted on entry. */
  muteUponEntry?: boolean

  /** Whether a waiting room is enabled. */
  waitingRoom?: boolean

  /** Whether the meeting is automatically recorded (and where). */
  autoRecording?: 'none' | 'local' | 'cloud'

  /**
   * Provider-specific extensions. Anything not covered by the normalised
   * fields above can be passed here and is forwarded verbatim to the
   * provider. Use sparingly — each entry is a coupling point.
   */
  extra?: Record<string, unknown>
}
```

#### `UpdateMeetingOptions`

Patch payload for updating an existing meeting. All fields are optional;
only those present are changed.

```typescript
interface UpdateMeetingOptions {
  /** New topic. */
  topic?: string

  /** New start time. */
  startTime?: Date

  /** New duration in minutes. */
  durationMinutes?: number

  /** New agenda / description. */
  agenda?: string

  /** New join password. */
  password?: string

  /** Settings to merge onto the existing meeting. */
  settings?: MeetingSettings

  /** New timezone. */
  timezone?: string
}
```

#### `VideoMeetingsProvider`

Video meetings provider interface.

All video-meetings providers must implement this interface to provide
a normalised surface for scheduled-meeting lifecycle and listing.

```typescript
interface VideoMeetingsProvider {
  /**
   * Creates a new scheduled meeting on behalf of the given user (or the
   * caller if no `userId` is supplied; many providers accept the literal
   * `'me'` for the authenticated user).
   *
   * @param options - Meeting creation options.
   * @param userId - Optional user identifier or alias (default: `'me'`).
   * @returns The created meeting, including its join URL.
   */
  createMeeting(options: CreateMeetingOptions, userId?: string): Promise<Meeting>

  /**
   * Retrieves an existing meeting by id.
   *
   * @param meetingId - The provider meeting identifier.
   * @returns The meeting if it exists, otherwise `null`.
   */
  getMeeting(meetingId: string): Promise<Meeting | null>

  /**
   * Updates an existing meeting in place.
   *
   * @param meetingId - The provider meeting identifier.
   * @param patch - Partial update payload.
   * @returns The updated meeting after the change is applied.
   */
  updateMeeting(meetingId: string, patch: UpdateMeetingOptions): Promise<Meeting>

  /**
   * Deletes an existing meeting by id. Idempotent: deleting a non-existent
   * meeting must not throw.
   *
   * @param meetingId - The provider meeting identifier.
   */
  deleteMeeting(meetingId: string): Promise<void>

  /**
   * Lists meetings owned by the given user.
   *
   * @param userId - The user identifier or alias (e.g. `'me'`).
   * @param options - Filtering and pagination options.
   * @returns A page of meetings.
   */
  listMeetings(userId: string, options?: ListMeetingsOptions): Promise<MeetingPage>
}
```

### Types

#### `MeetingType`

The scheduling type of a meeting, normalised across providers.

- `instant` — created right now and started immediately.
- `scheduled` — created with an explicit `startTime` for a future
  single occurrence.
- `recurring` — created with a recurrence rule for repeating
  occurrences. Recurrence configuration is provider-specific and
  travels through `settings`.

```typescript
type MeetingType = 'instant' | 'scheduled' | 'recurring'
```

### Functions

#### `createMeeting(options, userId)`

Creates a new scheduled meeting using the bonded provider.

```typescript
function createMeeting(options: CreateMeetingOptions, userId?: string): Promise<Meeting>
```

- `options` — Meeting creation options.
- `userId` — Optional user identifier or alias (default: `'me'`).

**Returns:** The created meeting, including its join URL.

#### `deleteMeeting(meetingId)`

Deletes an existing meeting by id using the bonded provider. Idempotent.

```typescript
function deleteMeeting(meetingId: string): Promise<void>
```

- `meetingId` — The provider meeting identifier.

#### `getMeeting(meetingId)`

Retrieves an existing meeting by id using the bonded provider.

```typescript
function getMeeting(meetingId: string): Promise<Meeting | null>
```

- `meetingId` — The provider meeting identifier.

**Returns:** The meeting if it exists, otherwise `null`.

#### `getProvider()`

Retrieves the bonded video meetings provider, throwing if none is
configured.

```typescript
function getProvider(): VideoMeetingsProvider
```

**Returns:** The bonded video meetings provider.

#### `hasProvider()`

Checks whether a video meetings provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a video meetings provider is bonded.

#### `listMeetings(userId, options)`

Lists meetings owned by the given user using the bonded provider.

```typescript
function listMeetings(userId: string, options?: ListMeetingsOptions): Promise<MeetingPage>
```

- `userId` — The user identifier or alias (e.g. `'me'`).
- `options` — Filtering and pagination options.

**Returns:** A page of meetings.

#### `setProvider(provider)`

Registers a video meetings provider as the active singleton. Called by
bond packages during application startup.

```typescript
function setProvider(provider: VideoMeetingsProvider): void
```

- `provider` — The video meetings provider implementation to bond.

#### `updateMeeting(meetingId, patch)`

Updates an existing meeting in place using the bonded provider.

```typescript
function updateMeeting(meetingId: string, patch: UpdateMeetingOptions): Promise<Meeting>
```

- `meetingId` — The provider meeting identifier.
- `patch` — Partial update payload.

**Returns:** The updated meeting after the change is applied.

## Available Providers

| Provider | Package |
|----------|---------|
| Video Meetings | `@molecule/api-video-meetings-zoom` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

- **Server-side only.** Provider credentials (for the bundled Zoom bond:
  `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`) live in the API's env and
  must never reach the browser. Create/update/list meetings in YOUR API; hand the client
  only what it needs — usually the meeting's `joinUrl`.
- **Unsupported {@link MeetingSettings} flags are silently IGNORED, not rejected** — a
  2xx response does not prove `waitingRoom`/`autoRecording` took effect on every
  provider. Don't advertise a setting in the UI unless the bonded provider supports it.
- Recurrence configuration is provider-specific and travels through `settings.extra`;
  only `type: 'recurring'` is normalized.
- `listMeetings` defaults to `type: 'scheduled'` and paginates via
  `MeetingPage.nextPageToken` → `options.pageToken` — a single call is not "all meetings".
- Scheduled meetings ≠ ad-hoc rooms: for ephemeral join-now collaboration spaces use
  `@molecule/api-video-rooms` instead.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Scheduling a meeting from the UI (topic, start time, duration) calls
  `createMeeting` and persists it: the returned `joinUrl` (plus
  `meetingCode`/`password` if shown) is saved with the meeting and the new
  meeting appears in the user's own list (`listMeetings`) at the right time.
- [ ] The join URL/token is per-meeting and scoped: each meeting has its own
  `joinUrl` (+ password if set), not one static guessable link that lets
  anyone in; opening it reaches THAT meeting only. The host-only `startUrl`
  is NEVER handed to a participant view.
- [ ] Editing the meeting (new time, topic, or settings) calls
  `updateMeeting` and the change shows in the list and detail; if the app
  models invitees/attendees, adding or removing one updates the meeting's
  own record while the `joinUrl` still resolves to the same meeting.
- [ ] Cancelling a meeting calls `deleteMeeting`, drops it from the user's
  list, and is idempotent (deleting an already-gone meeting shows a clean
  state, not a crash). If the app exposes a recording (`autoRecording:
  'cloud'`), the artifact is retrievable through the app's OWN
  storage/endpoint — never a raw provider URL.
- [ ] A returning host re-opening "their meeting" reuses the SAME persisted
  meeting (same `id`/`joinUrl`), not a fresh duplicate on every visit.
Caveat: real audio/video and the third-party meeting client can't be driven
in the sandbox — you cannot join the live call. Verify the meeting LIFECYCLE
and the token/URL generation you own (create → list → update → delete, and
the `joinUrl`/`startUrl` split) against the app's own persisted meeting
record, not the in-call experience. Never mock the flow or edit production
code to fake it.
- [ ] SECURITY — provider API keys/secrets (`ZOOM_ACCOUNT_ID`,
  `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, and any bonded provider's keys)
  stay server-side: they never appear in a client response or the app
  bundle, and the host-only `startUrl` never reaches an invitee. Only
  authorized users (host or invited participants) can fetch a meeting's join
  token/details — a different user id-guessing another meeting's id gets a
  403/404, not its `joinUrl`.
