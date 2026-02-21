# @molecule/app-ui-nativewind

NativeWind UIClassMap bond for React Native.

Extends the Tailwind classmap with overrides for classes that are
unsupported or behave differently in NativeWind / React Native.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ui-nativewind
```

## API

### Constants

#### `classMap`

NativeWind UIClassMap — Tailwind classmap with RN-compatible overrides.

Wire at app startup:
```typescript
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-nativewind'
setClassMap(classMap)
```

```typescript
const classMap: UIClassMap
```

## Core Interface
Implements `@molecule/app-ui` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-styling` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-tailwind` ^1.0.0
