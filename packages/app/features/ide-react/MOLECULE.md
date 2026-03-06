# @molecule/app-ide-react

`@molecule/app-ide-react` — React IDE components for molecule.dev workspace.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-ide-react
```

## API

### Interfaces

#### `ChatMessageItemProps`

Properties for the chat message item component.

```typescript
interface ChatMessageItemProps {
  message: ChatMessage
  className?: string
}
```

#### `ChatPanelProps`

Properties for chat panel.

```typescript
interface ChatPanelProps {
  projectId: string
  endpoint?: string
  /** If provided, auto-send this message once on mount (e.g., prompt from landing page). */
  initialMessage?: string
  /** Called when a filename in a tool call is clicked — should open the file as a preview tab. */
  onFileOpen?: (path: string) => void
  /** Called when a filename in a tool call is double-clicked — should pin the tab. */
  onFileDoubleClick?: (path: string) => void
  /** Called when a file in the uncommitted list is clicked for diff view. */
  onFileDiff?: (path: string) => void
  className?: string
}
```

#### `DeviceFrameSelectorProps`

Properties for device frame selector.

```typescript
interface DeviceFrameSelectorProps {
  current: DeviceFrame
  onChange: (device: DeviceFrame) => void
  className?: string
}
```

#### `EditorPanelProps`

Properties for the editor panel component.

```typescript
interface EditorPanelProps {
  className?: string
  /** Called whenever the active file changes (tab switch, file open, file close). */
  onActiveFileChange?: (path: string | null) => void
  /** Called once after the editor is fully mounted and ready to accept files. */
  onEditorReady?: () => void
  /** Called whenever the open tab list changes (file opened or closed). */
  onTabsChange?: (paths: string[]) => void
  /** Maps file path to git status for coloring tab filenames. */
  fileStatuses?: Record<string, string>
}
```

#### `FileExplorerProps`

Properties for file explorer.

```typescript
interface FileExplorerProps {
  files: FileNode[]
  onFileSelect: (path: string) => void
  onFileDoubleClick?: (path: string) => void
  onDirExpand?: (path: string) => void
  className?: string
  /** localStorage key for persisting expand/collapse state across reloads. */
  persistKey?: string
  /** Path of the currently active file — highlighted in the tree. */
  activeFile?: string | null
  /** Maps file path to git status — used to color directory names by highest-priority child status. */
  fileStatuses?: Record<string, string>
}
```

#### `FileNode`

File Node interface.

```typescript
interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  isDimmed?: boolean
  gitStatus?: 'modified' | 'added' | 'deleted' | 'untracked'
}
```

#### `PreviewPanelProps`

Properties for preview panel.

```typescript
interface PreviewPanelProps {
  className?: string
}
```

#### `ResizeHandleProps`

Properties for resize handle.

```typescript
interface ResizeHandleProps {
  onResize: (delta: number) => void
  direction?: 'horizontal' | 'vertical'
  className?: string
}
```

#### `TabBarProps`

Properties for tab bar.

```typescript
interface TabBarProps {
  tabs: EditorTab[]
  activeFile: string | null
  onSelect: (path: string) => void
  onClose: (path: string) => void
  onDoubleClick?: (path: string) => void
  /** Maps file path to git status for coloring tab filenames. */
  fileStatuses?: Record<string, string>
  className?: string
}
```

#### `ToolCallCardProps`

Properties for tool call card.

```typescript
interface ToolCallCardProps {
  id: string
  name: string
  input?: unknown
  output?: unknown
  status: 'pending' | 'running' | 'done' | 'error'
  /** Called when a filename in the card is clicked — should open the file as a preview tab. */
  onFileOpen?: (path: string) => void
  /** Called when a filename in the card is double-clicked — should pin the tab. */
  onFileDoubleClick?: (path: string) => void
  /** Called when a file-changing card is clicked — should open the file diff in the editor. */
  onFileDiff?: (path: string) => void
  className?: string
}
```

#### `WorkspaceLayoutProps`

Properties for workspace layout.

```typescript
interface WorkspaceLayoutProps {
  children: ReactNode
  className?: string
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-chat` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-code-editor` ^1.0.0
- `@molecule/app-ide` ^1.0.0
- `@molecule/app-live-preview` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
