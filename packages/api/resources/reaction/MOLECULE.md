# @molecule/api-resource-reaction

reaction resource for molecule.dev.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-reaction
```

## API

### Interfaces

#### `Reaction`

```typescript
interface Reaction {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}
```

### Types

#### `CreateReactionInput`

```typescript
type CreateReactionInput = Omit<Reaction, 'id' | 'createdAt' | 'updatedAt'>
```

#### `UpdateReactionInput`

```typescript
type UpdateReactionInput = Partial<CreateReactionInput>
```

### Functions

#### `create(req, res)`

```typescript
function create(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — *

#### `del(req, res)`

```typescript
function del(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — *

#### `list(req, res)`

```typescript
function list(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — *

#### `read(req, res)`

```typescript
function read(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — *

#### `update(req, res)`

```typescript
function update(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — *

### Constants

#### `requestHandlerMap`

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly read: typeof read; readonly update: typeof update; readonly del: typeof del; }
```

#### `routes`

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/reactions"; readonly handler: "create"; }, { readonly method: "get"; readonly path: "/reactions"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/reactions/:id"; readonly handler: "read"; }, { readonly method: "patch"; readonly path: "/reactions/:id"; readonly handler: "update"; }, { readonly method: "delete"; readonly path: "/reactions/:id"; readonly handler: "del"; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-resource` ^1.0.0
