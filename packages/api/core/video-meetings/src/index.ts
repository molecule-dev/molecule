/**
 * Video meetings core interface for molecule.dev.
 *
 * Defines the standard interface for scheduled video-meeting providers
 * (Zoom, Google Meet, Microsoft Teams, Webex, etc.). Used by apps such
 * as meeting schedulers, calendar integrations, AI meeting notetakers,
 * and tele-counselling.
 *
 * Distinct from `@molecule/api-video-rooms` — meetings are scheduled
 * events with a start time, duration, and a stable join URL. Rooms are
 * ephemeral collaboration spaces with no scheduling semantics.
 *
 * @module
 * @example
 * ```typescript
 * import {
 *   setProvider,
 *   createMeeting,
 *   listMeetings,
 * } from '@molecule/api-video-meetings'
 *
 * // Bond a provider at startup (e.g. Zoom)
 * setProvider(createProvider({
 *   accountId: process.env.ZOOM_ACCOUNT_ID,
 *   clientId: process.env.ZOOM_CLIENT_ID,
 *   clientSecret: process.env.ZOOM_CLIENT_SECRET,
 * }))
 *
 * // Schedule a meeting
 * const meeting = await createMeeting({
 *   topic: 'Quarterly review',
 *   startTime: new Date('2027-01-15T17:00:00Z'),
 *   durationMinutes: 60,
 *   settings: { waitingRoom: true, autoRecording: 'cloud' },
 * })
 *
 * // List the current user's upcoming meetings
 * const page = await listMeetings('me', { type: 'scheduled' })
 * ```
 */

export * from './provider.js'
export * from './types.js'
export * from './video-meetings.js'
