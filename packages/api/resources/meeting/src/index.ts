/**
 * `@molecule/api-resource-meeting` — meeting CRUD + action items.
 *
 * Tracks scheduled/in_progress/completed/cancelled meetings with
 * attendees, optional recording URL, transcript, and AI-friendly
 * summary slot. Action items nest under meetings and track
 * completion + assignee + due date + source excerpt.
 *
 * Extracted from the ai-meeting-notes flagship.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
