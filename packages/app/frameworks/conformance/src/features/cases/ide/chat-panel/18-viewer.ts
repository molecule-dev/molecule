/**
 * `ChatPanel` cases: the read-only viewer, the transcript-only viewer and the team side
 * channel. Every case name starts with `viewer: `.
 *
 * What the view-only branch renders and sends: the composer that becomes the team-chat box
 * (gold border, "Message your team" placeholder, no plan/execute toggle), the transcript-only
 * viewer whose hidden composer cannot send at all, the view-only note a typed message or a
 * write command earns instead of a silent 403, the viewer-safe command that still runs, the
 * team-messaging-off gate on a typed side-channel command, and the side channel itself — the
 * team note a viewer sends (by command or by alias), the `/teamsay` refill the composer gets
 * after each one, the note the server answers with, the refused send, and a note sent while
 * a teammate's streamed turn keeps playing.
 *
 * @module
 */

import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import type { BaseExtra } from './fixtures.js'
import {
  adv,
  base,
  click,
  CONV_HTTP,
  key,
  MARKDOWN_THROTTLE_MS,
  SEND,
  serverStreaming,
  sideEmit,
  sideFinish,
  START,
  TEAM_COMMAND,
  TEXT,
  type,
} from './fixtures.js'

/**
 * The conversation a pushed-frame case mounts with: the push handler only applies frames
 * for the conversation the panel has open.
 */
const CONV = 'c1'

/**
 * Makes the oldest open side-channel send's promise reject with `Error(message)` (the
 * `chat.sideFail` control; the fixtures only carry the main stream's `fail`).
 *
 * @param message - The error message.
 * @returns The step.
 */
const sideFail = (message: string): Interaction => ({
  type: 'control',
  name: 'chat.sideFail',
  args: [message],
})

/**
 * Delivers one broadcast stream event as the host holding the panel's registered push
 * handler would: the handler's first argument names the conversation the frame belongs to.
 *
 * @param event - The broadcast stream event.
 * @returns The step.
 */
const push = (event: unknown): Interaction => ({
  type: 'invoke',
  callback: 'onRegisterPushHandler',
  path: [0],
  args: [CONV, event],
})

/**
 * The `message` event the server answers a sent team note with: ONE complete message —
 * role `system` + `teamOnly` (the model never sees it), carrying the author and the bare
 * text (no `/teamsay` prefix) — and that message IS the visible transcript row.
 *
 * @param text - The note's text.
 * @returns The event.
 */
const teamNote = (text: string): Record<string, unknown> => ({
  type: 'message',
  message: {
    id: 'n1',
    role: 'system',
    content: text,
    teamOnly: true,
    author: { id: 'u2', name: 'Mara' },
    hiddenFromAi: true,
    timestamp: 0,
  },
})

/**
 * What a side-channel send case adds: the read-only viewer, the host's team command, and a
 * chat provider with the side-channel request path.
 */
const SIDE_VIEWER: BaseExtra = {
  props: { canEdit: false, extraCommands: [TEAM_COMMAND] },
  context: { areas: { chat: { sideChannel: true } } },
}

/**
 * What the mid-turn side-channel case adds: the same viewer over a RESUMED conversation,
 * the push handler registration, the conversation's scripted answers, and the side channel.
 */
const SIDE_VIEWER_WATCHING: BaseExtra = {
  props: {
    conversationId: CONV,
    onRegisterPushHandler: { $callback: 'onRegisterPushHandler' },
    canEdit: false,
    extraCommands: [TEAM_COMMAND],
  },
  context: { areas: { chat: { sideChannel: true } }, http: CONV_HTTP(CONV) },
}

/** Viewer, transcript-only and the team side channel. */
export const viewerCases: FeatureCase[] = [
  // ── The team-chat composer ──────────────────────────────────────────────────
  base('viewer: the composer renders as the team-chat box', [], { props: { canEdit: false } }),

  // ── The transcript-only viewer ──────────────────────────────────────────────
  base(
    'viewer: a transcript-only viewer typing into the hidden composer sends nothing',
    [type('/t private team note'), click(SEND), key('Enter')],
    {
      props: { canEdit: false, canSendTeamMessages: false, extraCommands: [TEAM_COMMAND] },
    },
  ),

  // ── The view-only note ──────────────────────────────────────────────────────
  base(
    'viewer: a typed message earns the view-only note instead of a send',
    [type('Looks good to me'), click(SEND)],
    { props: { canEdit: false } },
  ),
  base(
    'viewer: a write command typed in the composer earns the same view-only note',
    [type('/commit now'), key('Enter')],
    { props: { canEdit: false } },
  ),
  base(
    'viewer: a viewer-safe command typed in the composer still runs',
    [type('/version'), key('Enter')],
    { props: { canEdit: false, version: '2.7.9' } },
  ),

  // ── Team messaging off ──────────────────────────────────────────────────────
  base(
    'viewer: team messaging off answers a typed team note with the unavailable card',
    [type('/t Do not send this team note'), click(SEND)],
    { props: { canSendTeamMessages: false, extraCommands: [TEAM_COMMAND] } },
  ),

  // ── The side channel ────────────────────────────────────────────────────────
  base(
    'viewer: a team note goes out on the side channel and the composer refills /teamsay',
    [type('/teamsay checking in'), click(SEND)],
    SIDE_VIEWER,
  ),
  base(
    'viewer: the team note the side channel answers with lands in the transcript',
    [type('/teamsay checking in'), click(SEND), sideEmit(teamNote('checking in')), sideFinish],
    SIDE_VIEWER,
  ),
  base(
    'viewer: a refused team note shows the send error',
    [type('/teamsay checking in'), click(SEND), sideFail('The team channel refused the note')],
    SIDE_VIEWER,
  ),
  base(
    'viewer: the /t alias reaches the side channel too',
    [type('/t hello team'), click(SEND)],
    SIDE_VIEWER,
  ),
  base(
    'viewer: a team note goes out mid-turn and the teammate reply keeps streaming',
    [
      serverStreaming(true),
      push(START('tm1')),
      type('/teamsay nice catch'),
      click(SEND),
      sideFinish,
      push(TEXT('Fixing the header now.')),
      adv(50),
      push(TEXT(' Then the footer.')),
      adv(50),
      // The streaming message re-parses its markdown at most every 120 ms.
      adv(MARKDOWN_THROTTLE_MS),
    ],
    SIDE_VIEWER_WATCHING,
  ),
]
