/**
 * Video meetings core types for molecule.dev.
 *
 * Defines the standard interfaces for scheduled video-meeting providers
 * (Zoom, Google Meet, Microsoft Teams, Webex, etc.).
 *
 * Distinct from `@molecule/api-video-rooms` — meetings are scheduled
 * events with a start time, duration, and a stable join URL that can be
 * shared in advance. Rooms are ephemeral collaboration spaces with no
 * scheduling semantics.
 *
 * @module
 */

/**
 * The scheduling type of a meeting, normalised across providers.
 *
 * - `instant` — created right now and started immediately.
 * - `scheduled` — created with an explicit `startTime` for a future
 *   single occurrence.
 * - `recurring` — created with a recurrence rule for repeating
 *   occurrences. Recurrence configuration is provider-specific and
 *   travels through `settings`.
 */
export type MeetingType = 'instant' | 'scheduled' | 'recurring'

/**
 * Provider-agnostic, normalised meeting settings.
 *
 * Providers may support a superset of these flags; unsupported flags
 * should be silently ignored rather than rejected so callers can target
 * multiple providers with the same payload.
 */
export interface MeetingSettings {
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

/**
 * Options for creating a new scheduled video meeting.
 */
export interface CreateMeetingOptions {
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

/**
 * Patch payload for updating an existing meeting. All fields are optional;
 * only those present are changed.
 */
export interface UpdateMeetingOptions {
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

/**
 * Options for listing meetings.
 */
export interface ListMeetingsOptions {
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

/**
 * A single page of meetings returned by {@link VideoMeetingsProvider.listMeetings}.
 */
export interface MeetingPage {
  /** Meetings in this page. */
  meetings: Meeting[]

  /**
   * Cursor for the next page, or `undefined` if there is none. Pass back
   * via {@link ListMeetingsOptions.pageToken}.
   */
  nextPageToken?: string
}

/**
 * A normalised description of an existing scheduled meeting as returned
 * by a provider.
 */
export interface Meeting {
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

/**
 * Video meetings provider interface.
 *
 * All video-meetings providers must implement this interface to provide
 * a normalised surface for scheduled-meeting lifecycle and listing.
 */
export interface VideoMeetingsProvider {
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
