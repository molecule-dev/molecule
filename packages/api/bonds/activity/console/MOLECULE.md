# @molecule/api-activity-console

Console activity sink for molecule.dev.

Logs captured activity events via `@molecule/api-logger`. The default sink
for standalone scaffolded apps.

## Quick Start

```typescript
import { setSink } from '@molecule/api-activity'
import { provider } from '@molecule/api-activity-console'

setSink(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-activity-console @molecule/api-activity @molecule/api-logger
```

## API

### Functions

#### `createConsoleSink()`

Creates a console activity sink that logs each event via the bonded logger.

```typescript
function createConsoleSink(): ActivitySink
```

**Returns:** An {@link ActivitySink} that logs events and never throws.

### Constants

#### `provider`

Default console activity sink instance.

```typescript
const provider: ActivitySink
```

## Core Interface
Implements `@molecule/api-activity` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setSink } from '@molecule/api-activity'
import { provider } from '@molecule/api-activity-console'

export function setupActivityConsole(): void {
  setSink(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-activity` ^1.0.0
- `@molecule/api-logger` ^1.0.0

### Runtime Dependencies

- `@molecule/api-activity`
- `@molecule/api-logger`
