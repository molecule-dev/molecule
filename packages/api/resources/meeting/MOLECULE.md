# @molecule/api-resource-meeting

`@molecule/api-resource-meeting` — meeting CRUD + action items.

Tracks scheduled/in_progress/completed/cancelled meetings with
attendees, optional recording URL, transcript, and AI-friendly
summary slot. Action items nest under meetings and track
completion + assignee + due date + source excerpt.

Extracted from the ai-meeting-notes flagship.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-meeting
```

## API

### Interfaces

#### `ActionItemRow`

Raw database row shape for an action item linked to a meeting.

```typescript
interface ActionItemRow {
  id: string
  meeting_id: string
  description: string
  assignee: string | null
  due_date: string | Date | null
  is_completed: boolean
  source_excerpt: string | null
  created_at: string | Date
  updated_at: string | Date
}
```

#### `MeetingRow`

Raw database row shape for a meeting record.

```typescript
interface MeetingRow {
  id: string
  owner_id: string
  title: string
  description: string | null
  status: MeetingStatus
  scheduled_at: string | Date | null
  started_at: string | Date | null
  ended_at: string | Date | null
  duration_seconds: number
  recording_url: string | null
  transcript: string | null
  summary: string | null
  attendees: Array<{ name: string; email?: string }>
  created_at: string | Date
  updated_at: string | Date
}
```

### Types

#### `MeetingStatus`

Lifecycle states a meeting can occupy from creation through completion.

```typescript
type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
```

### Functions

#### `createActionItem(meetingId, ownerId, data)`

Creates a new action item under a meeting owned by the given owner; returns the inserted row or null if the meeting is not found/owned.

```typescript
function createActionItem(meetingId: string, ownerId: string, data: { description: string; assignee?: string | null; due_date?: string | null; source_excerpt?: string | null; }): Promise<ActionItemRow | null>
```

#### `createMeetingForOwner(ownerId, data)`

Creates a new meeting record owned by the given owner and returns the inserted row.

```typescript
function createMeetingForOwner(ownerId: string, data: { title: string; description?: string | null; scheduled_at?: string | null; attendees?: Array<{ name: string; email?: string; }>; }): Promise<MeetingRow>
```

#### `createMeetingRouter()`

Creates and returns an Express Router with all meeting and action-item CRUD routes.

```typescript
function createMeetingRouter(): Router
```

#### `deleteActionItem(itemId, meetingId, ownerId)`

Deletes an action item by ID if its parent meeting belongs to the given owner; returns true on success, false if not found or not owned.

```typescript
function deleteActionItem(itemId: string, meetingId: string, ownerId: string): Promise<boolean>
```

#### `deleteMeetingForOwner(meetingId, ownerId)`

Deletes a meeting by ID if it belongs to the given owner; returns true on success, false if not found or not owned.

```typescript
function deleteMeetingForOwner(meetingId: string, ownerId: string): Promise<boolean>
```

#### `getMeetingForOwner(meetingId, ownerId)`

Fetches a single meeting by ID, returning null if it does not exist or does not belong to the owner.

```typescript
function getMeetingForOwner(meetingId: string, ownerId: string): Promise<MeetingRow | null>
```

#### `listActionItems(meetingId, ownerId)`

Returns all action items for a meeting in creation order, or null if the meeting is not found/owned.

```typescript
function listActionItems(meetingId: string, ownerId: string): Promise<ActionItemRow[] | null>
```

#### `listMeetingsForOwner(ownerId, opts?)`

Returns a paginated list of meetings belonging to the given owner, optionally filtered by status.

```typescript
function listMeetingsForOwner(ownerId: string, opts?: { status?: MeetingStatus; page?: number; limit?: number; }): Promise<{ data: MeetingRow[]; total: number; }>
```

#### `updateActionItem(itemId, meetingId, ownerId, patch)`

Applies a partial patch to an action item; returns the updated row or null if the meeting or item is not found/owned.

```typescript
function updateActionItem(itemId: string, meetingId: string, ownerId: string, patch: Partial<ActionItemRow>): Promise<ActionItemRow | null>
```

#### `updateMeetingForOwner(meetingId, ownerId, patch)`

Applies a partial patch to a meeting, recomputing duration_seconds when both timestamps are present, and returns the updated row or null if not found/owned.

```typescript
function updateMeetingForOwner(meetingId: string, ownerId: string, patch: Partial<MeetingRow>): Promise<MeetingRow | null>
```

### Constants

#### `actionItemCreateSchema`

Zod schema for validating action item creation payloads.

```typescript
const actionItemCreateSchema: z.ZodObject<{ description: z.ZodString; assignee: z.ZodOptional<z.ZodNullable<z.ZodString>>; due_date: z.ZodOptional<z.ZodNullable<z.ZodString>>; source_excerpt: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, z.core.$strip>
```

#### `actionItemUpdateSchema`

Zod schema for validating action item update payloads.

```typescript
const actionItemUpdateSchema: z.ZodObject<{ description: z.ZodOptional<z.ZodString>; assignee: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; due_date: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; source_excerpt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; is_completed: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

#### `MEETING_STATUSES`

All valid status values a meeting can be in.

```typescript
const MEETING_STATUSES: readonly ["scheduled", "in_progress", "completed", "cancelled"]
```

#### `meetingCreateSchema`

Zod schema for validating meeting creation payloads.

```typescript
const meetingCreateSchema: z.ZodObject<{ title: z.ZodString; description: z.ZodOptional<z.ZodNullable<z.ZodString>>; scheduled_at: z.ZodOptional<z.ZodNullable<z.ZodString>>; attendees: z.ZodOptional<z.ZodArray<z.ZodObject<{ name: z.ZodString; email: z.ZodOptional<z.ZodString>; }, z.core.$strip>>>; }, z.core.$strip>
```

#### `meetingUpdateSchema`

Zod schema for validating meeting update payloads.

```typescript
const meetingUpdateSchema: z.ZodObject<{ title: z.ZodOptional<z.ZodString>; description: z.ZodOptional<z.ZodNullable<z.ZodString>>; status: z.ZodOptional<z.ZodEnum<{ scheduled: "scheduled"; in_progress: "in_progress"; completed: "completed"; cancelled: "cancelled"; }>>; scheduled_at: z.ZodOptional<z.ZodNullable<z.ZodString>>; started_at: z.ZodOptional<z.ZodNullable<z.ZodString>>; ended_at: z.ZodOptional<z.ZodNullable<z.ZodString>>; recording_url: z.ZodOptional<z.ZodNullable<z.ZodString>>; transcript: z.ZodOptional<z.ZodNullable<z.ZodString>>; summary: z.ZodOptional<z.ZodNullable<z.ZodString>>; attendees: z.ZodOptional<z.ZodArray<z.ZodObject<{ name: z.ZodString; email: z.ZodOptional<z.ZodString>; }, z.core.$strip>>>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0
