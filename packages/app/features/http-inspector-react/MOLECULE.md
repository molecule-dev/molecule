# @molecule/app-http-inspector-react

HTTP request builder + response inspector.

Exports `<HttpInspector>`, `HttpMethod`, `HttpHeader`, `HttpResponse` types.

## Quick Start

```tsx
import { useState } from 'react'
import { HttpInspector } from '@molecule/app-http-inspector-react'
import type { HttpMethod, HttpHeader, HttpResponse } from '@molecule/app-http-inspector-react'

const [method, setMethod] = useState<HttpMethod>('GET')
const [url, setUrl] = useState('https://api.example.com/v1/users')
const [headers, setHeaders] = useState<HttpHeader[]>([])
const [body, setBody] = useState('')
const [sending, setSending] = useState(false)
const [response, setResponse] = useState<HttpResponse | null>(null)

<HttpInspector
  method={method} onMethodChange={setMethod}
  url={url} onUrlChange={setUrl}
  headers={headers} onHeadersChange={setHeaders}
  body={body} onBodyChange={setBody}
  onSend={handleSend} sending={sending} response={response}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-http-inspector-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `HttpHeader`

A single HTTP request or response header key/value pair.

```typescript
interface HttpHeader {
  key: string
  value: string
}
```

#### `HttpInspectorProps`

```typescript
interface HttpInspectorProps {
  method: HttpMethod
  onMethodChange: (m: HttpMethod) => void
  url: string
  onUrlChange: (u: string) => void
  headers: HttpHeader[]
  onHeadersChange: (h: HttpHeader[]) => void
  body: string
  onBodyChange: (b: string) => void
  onSend: () => void | Promise<void>
  sending?: boolean
  response?: HttpResponse | null
  className?: string
}
```

#### `HttpResponse`

Parsed HTTP response returned after a request completes.

```typescript
interface HttpResponse {
  statusCode: number
  statusText?: string
  durationMs?: number
  body: string
  headers?: HttpHeader[]
}
```

### Types

#### `HttpMethod`

HTTP method verb for a request.

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
```

### Functions

#### `HttpInspector(props)`

Controlled HTTP request builder + response panel. App owns request
state + the actual `fetch`; this component renders the UI.

Shape: method + URL row, headers key/value editor, body textarea,
Send button, then a response panel showing status + timing + body.

```typescript
function HttpInspector({
  method,
  onMethodChange,
  url,
  onUrlChange,
  headers,
  onHeadersChange,
  body,
  onBodyChange,
  onSend,
  sending,
  response,
  className,
}: HttpInspectorProps): JSX.Element
```

- `props` — Component props (see {@link HttpInspectorProps}).

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

- Fully controlled and transport-agnostic: the component renders the
  builder UI only — YOUR `onSend` performs the fetch and sets `response`
  (`HttpResponse` with statusCode/durationMs/body). `sending` disables the
  Send button.
- Requires `@molecule/app-react`'s `I18nProvider` (`useTranslation()`
  THROWS without it) and a bonded ClassMap; button/tab labels come from the
  `@molecule/app-locales-http-inspector` companion bond.
- The body editor renders only for methods with bodies (hidden for GET and
  HEAD).
- The response status chip uses fixed severity colors (green/blue/
  yellow/red) rendered inline — they do not follow the app theme.

## Translations

Translation strings are provided by `@molecule/app-locales-http-inspector`.
