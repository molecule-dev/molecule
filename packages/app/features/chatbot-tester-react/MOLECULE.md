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
npm install @molecule/app-chatbot-tester-react
```

## API

### Interfaces

#### `TesterBotOption`

```typescript
interface TesterBotOption {
  id: string
  name?: string
}
```

#### `TesterMessage`

Types for the chatbot-tester sandbox UI.

```typescript
interface TesterMessage {
  id: string | number
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
