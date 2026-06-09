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
npm install @molecule/app-http-inspector-react
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

#### `HttpInspector(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .method
- `root0` — .onMethodChange
- `root0` — .url
- `root0` — .onUrlChange
- `root0` — .headers
- `root0` — .onHeadersChange
- `root0` — .body
- `root0` — .onBodyChange
- `root0` — .onSend
- `root0` — .sending
- `root0` — .response
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
