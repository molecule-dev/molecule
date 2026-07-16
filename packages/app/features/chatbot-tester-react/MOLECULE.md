# @molecule/app-chatbot-tester-react

`@molecule/app-chatbot-tester-react` — sandbox UI shell for live-testing
conversational AI: optional bot picker, message transcript, input row,
error display.

Stateless about transport. The consumer owns the message array, send
handler, and bot list; the package handles the layout and composition.

Extracted from the ai-chatbot-builder TestChat page; usable for any
"preview your bot live" UI.

## Quick Start

```tsx
import { ChatbotTester, type TesterMessage } from '@molecule/app-chatbot-tester-react'

const [messages, setMessages] = useState<TesterMessage[]>([])
const handleSend = async (text: string) => {
  setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: text }])
  const reply = await http.post(`/api/conversations/${conversationId}/messages`, { content: text })
  setMessages((prev) => [...prev, { id: reply.id, role: 'assistant', content: reply.content }])
}

<ChatbotTester
  messages={messages}
  onSend={handleSend}
  loading={sending}
  bots={bots}
  botId={botId}
  onBotChange={setBotId}
  error={error}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-chatbot-tester-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `ChatbotTesterInputProps`

```typescript
interface ChatbotTesterInputProps {
  value: string
  onChange: (next: string) => void
  onSend: () => void
  loading?: boolean
  placeholder?: string
  sendLabel?: string
}
```

#### `ChatbotTesterMessagesProps`

```typescript
interface ChatbotTesterMessagesProps {
  messages: TesterMessage[]
  loading?: boolean
  emptyState?: React.ReactNode
}
```

#### `ChatbotTesterProps`

```typescript
interface ChatbotTesterProps {
  messages: TesterMessage[]
  loading?: boolean
  /** When provided, send invokes this with the composer text. */
  onSend: (text: string) => void | Promise<void>
  /** Optional bot list — when length >= 2, a picker is rendered. */
  bots?: TesterBotOption[]
  botId?: string
  onBotChange?: (id: string) => void
  /** Last error message — rendered in a `role="alert"` paragraph. */
  error?: ReactNode
  /** Empty-state slot when there are no messages yet. */
  emptyState?: ReactNode
  botPickerLabel?: ReactNode
  inputPlaceholder?: string
  sendLabel?: string
  className?: string
}
```

#### `TesterBotOption`

A selectable bot/agent option shown in the chatbot tester sandbox UI.

```typescript
interface TesterBotOption {
  id: string
  name?: string
}
```

#### `TesterMessage`

A single chat message displayed in the chatbot tester sandbox UI.

```typescript
interface TesterMessage {
  id: string | number
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}
```

### Functions

#### `ChatbotTester({
  messages,
  loading,
  onSend,
  bots,
  botId,
  onBotChange,
  error,
  emptyState,
  botPickerLabel = 'Test bot',
  inputPlaceholder,
  sendLabel,
  className,
})`

Full chatbot tester sandbox.

```typescript
function ChatbotTester({
  messages,
  loading,
  onSend,
  bots,
  botId,
  onBotChange,
  error,
  emptyState,
  botPickerLabel = 'Test bot',
  inputPlaceholder,
  sendLabel,
  className,
}: ChatbotTesterProps): JSX.Element
```

#### `ChatbotTesterInput({
  value,
  onChange,
  onSend,
  loading,
  placeholder = 'Type a message…',
  sendLabel = 'Send',
})`

Message composer + send button.

```typescript
function ChatbotTesterInput({
  value,
  onChange,
  onSend,
  loading,
  placeholder = 'Type a message…',
  sendLabel = 'Send',
}: ChatbotTesterInputProps): JSX.Element
```

#### `ChatbotTesterMessages({
  messages,
  loading,
  emptyState,
})`

Scrollable transcript pane.

```typescript
function ChatbotTesterMessages({
  messages,
  loading,
  emptyState,
}: ChatbotTesterMessagesProps): JSX.Element
```

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

Built-in labels (`botPickerLabel` default "Test bot", `inputPlaceholder`
default "Type a message…", `sendLabel` default "Send") are hardcoded
English — there is no companion locale bond. For localized apps, pass all
three props with `t('key', {}, { defaultValue: '…' })` values.
Enter sends; Shift+Enter inserts a newline. The bot picker renders only
when `bots` has 2+ entries. Styling includes Tailwind classes with
Material-3 tokens (`bg-surface-container-high`, `border-outline-variant`,
`text-on-primary`, …) — the app's Tailwind theme must define those tokens
(the default molecule Tailwind ClassMap bond does); with a non-Tailwind
ClassMap the bubbles/borders lose their styling.
