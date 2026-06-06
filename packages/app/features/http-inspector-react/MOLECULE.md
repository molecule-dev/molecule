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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
