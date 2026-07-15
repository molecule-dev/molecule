# @molecule/api-middleware-analytics

Analytics middleware for molecule.dev.

## Type
`middleware`

## Installation
```bash
npm install @molecule/api-middleware-analytics @molecule/api-bond
```

## API

### Interfaces

#### `AnalyticsMiddlewareOptions`

Options for the analytics middleware.

```typescript
interface AnalyticsMiddlewareOptions {
  /**
   * Paths to exclude from tracking.
   * @default ['/health']
   */
  excludePaths?: string[]
}
```

### Functions

#### `createAnalyticsMiddleware(options)`

Creates an analytics middleware that tracks every API request.

```typescript
function createAnalyticsMiddleware(options?: AnalyticsMiddlewareOptions): (req: unknown, res: unknown, next: (err?: unknown) => void) => void
```

- `options` — Configuration options including paths to exclude from tracking.

**Returns:** Express-compatible middleware that tracks requests on the `finish` event.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
