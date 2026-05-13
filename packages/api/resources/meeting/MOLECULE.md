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

```typescript
type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
```

### Functions

#### `createActionItem(meetingId, ownerId, data)`

```typescript
function createActionItem(meetingId: string, ownerId: string, data: { description: string; assignee?: string | null; due_date?: string | null; source_excerpt?: string | null; }): Promise<ActionItemRow | null>
```

#### `createMeetingForOwner(ownerId, data)`

```typescript
function createMeetingForOwner(ownerId: string, data: { title: string; description?: string | null; scheduled_at?: string | null; attendees?: Array<{ name: string; email?: string; }>; }): Promise<MeetingRow>
```

#### `createMeetingRouter()`

```typescript
function createMeetingRouter(): Router
```

#### `deleteActionItem(itemId, meetingId, ownerId)`

```typescript
function deleteActionItem(itemId: string, meetingId: string, ownerId: string): Promise<boolean>
```

#### `deleteMeetingForOwner(meetingId, ownerId)`

```typescript
function deleteMeetingForOwner(meetingId: string, ownerId: string): Promise<boolean>
```

#### `getMeetingForOwner(meetingId, ownerId)`

```typescript
function getMeetingForOwner(meetingId: string, ownerId: string): Promise<MeetingRow | null>
```

#### `listActionItems(meetingId, ownerId)`

```typescript
function listActionItems(meetingId: string, ownerId: string): Promise<ActionItemRow[] | null>
```

#### `listMeetingsForOwner(ownerId, opts?)`

```typescript
function listMeetingsForOwner(ownerId: string, opts?: { status?: MeetingStatus; page?: number; limit?: number; }): Promise<{ data: MeetingRow[]; total: number; }>
```

#### `updateActionItem(itemId, meetingId, ownerId, patch)`

```typescript
function updateActionItem(itemId: string, meetingId: string, ownerId: string, patch: Partial<ActionItemRow>): Promise<ActionItemRow | null>
```

#### `updateMeetingForOwner(meetingId, ownerId, patch)`

```typescript
function updateMeetingForOwner(meetingId: string, ownerId: string, patch: Partial<MeetingRow>): Promise<MeetingRow | null>
```

### Constants

#### `actionItemCreateSchema`

```typescript
const actionItemCreateSchema: z.ZodObject<{ description: z.ZodString; assignee: z.ZodOptional<z.ZodNullable<z.ZodString>>; due_date: z.ZodOptional<z.ZodNullable<z.ZodString>>; source_excerpt: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, "strip", z.ZodTypeAny, { description: string; assignee?: string | null | undefined; due_date?: string | null | undefined; source_excerpt?: string | null | undefined; }, { description: string; assignee?: string | null | undefined; due_date?: string | null | undefined; source_excerpt?: string | null | undefined; }>
```

#### `actionItemUpdateSchema`

```typescript
const actionItemUpdateSchema: z.ZodObject<{ description: z.ZodOptional<z.ZodString>; assignee: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; due_date: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; source_excerpt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; } & { is_completed: z.ZodOptional<z.ZodBoolean>; }, "strip", z.ZodTypeAny, { description?: string | undefined; assignee?: string | null | undefined; due_date?: string | null | undefined; source_excerpt?: string | null | undefined; is_completed?: boolean | undefined; }, { description?: string | undefined; assignee?: string | null | undefined; due_date?: string | null | undefined; source_excerpt?: string | null | undefined; is_completed?: boolean | undefined; }>
```

#### `MEETING_STATUSES`

```typescript
const MEETING_STATUSES: readonly ["scheduled", "in_progress", "completed", "cancelled"]
```

#### `meetingCreateSchema`

```typescript
const meetingCreateSchema: z.ZodObject<{ title: z.ZodString; description: z.ZodOptional<z.ZodNullable<z.ZodString>>; scheduled_at: z.ZodOptional<z.ZodNullable<z.ZodString>>; attendees: z.ZodOptional<z.ZodArray<z.ZodObject<{ name: z.ZodString; email: z.ZodOptional<z.ZodString>; }, "strip", z.ZodTypeAny, { name: string; email?: string | undefined; }, { name: string; email?: string | undefined; }>, "many">>; }, "strip", z.ZodTypeAny, { title: string; description?: string | null | undefined; scheduled_at?: string | null | undefined; attendees?: { name: string; email?: string | undefined; }[] | undefined; }, { title: string; description?: string | null | undefined; scheduled_at?: string | null | undefined; attendees?: { name: string; email?: string | undefined; }[] | undefined; }>
```

#### `meetingUpdateSchema`

```typescript
const meetingUpdateSchema: z.ZodObject<{ title: z.ZodOptional<z.ZodString>; description: z.ZodOptional<z.ZodNullable<z.ZodString>>; status: z.ZodOptional<z.ZodEnum<["scheduled", "in_progress", "completed", "cancelled"]>>; scheduled_at: z.ZodOptional<z.ZodNullable<z.ZodString>>; started_at: z.ZodOptional<z.ZodNullable<z.ZodString>>; ended_at: z.ZodOptional<z.ZodNullable<z.ZodString>>; recording_url: z.ZodOptional<z.ZodNullable<z.ZodString>>; transcript: z.ZodOptional<z.ZodNullable<z.ZodString>>; summary: z.ZodOptional<z.ZodNullable<z.ZodString>>; attendees: z.ZodOptional<z.ZodArray<z.ZodObject<{ name: z.ZodString; email: z.ZodOptional<z.ZodString>; }, "strip", z.ZodTypeAny, { name: string; email?: string | undefined; }, { name: string; email?: string | undefined; }>, "many">>; }, "strip", z.ZodTypeAny, { title?: string | undefined; description?: string | null | undefined; scheduled_at?: string | null | undefined; status?: "scheduled" | "in_progress" | "completed" | "cancelled" | undefined; attendees?: { name: string; email?: string | undefined; }[] | undefined; started_at?: string | null | undefined; ended_at?: string | null | undefined; recording_url?: string | null | undefined; transcript?: string | null | undefined; summary?: string | null | undefined; }, { title?: string | undefined; description?: string | null | undefined; scheduled_at?: string | null | undefined; status?: "scheduled" | "in_progress" | "completed" | "cancelled" | undefined; attendees?: { name: string; email?: string | undefined; }[] | undefined; started_at?: string | null | undefined; ended_at?: string | null | undefined; recording_url?: string | null | undefined; transcript?: string | null | undefined; summary?: string | null | undefined; }>
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
