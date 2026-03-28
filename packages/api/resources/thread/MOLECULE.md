# @molecule/api-resource-thread

thread resource for molecule.dev.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-thread
```

## API

### Interfaces

#### `Thread`

```typescript
interface Thread {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}
```

### Types

#### `CreateThreadInput`

```typescript
type CreateThreadInput = Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>
```

#### `UpdateThreadInput`

```typescript
type UpdateThreadInput = Partial<CreateThreadInput>
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
const routes: readonly [{ readonly method: "post"; readonly path: "/threads"; readonly handler: "create"; }, { readonly method: "get"; readonly path: "/threads"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/threads/:id"; readonly handler: "read"; }, { readonly method: "patch"; readonly path: "/threads/:id"; readonly handler: "update"; }, { readonly method: "delete"; readonly path: "/threads/:id"; readonly handler: "del"; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-resource` ^1.0.0
