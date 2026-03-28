# @molecule/api-resource-comment

comment resource for molecule.dev.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-comment
```

## API

### Interfaces

#### `Comment`

```typescript
interface Comment {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}
```

### Types

#### `CreateCommentInput`

```typescript
type CreateCommentInput = Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>
```

#### `UpdateCommentInput`

```typescript
type UpdateCommentInput = Partial<CreateCommentInput>
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
const routes: readonly [{ readonly method: "post"; readonly path: "/comments"; readonly handler: "create"; }, { readonly method: "get"; readonly path: "/comments"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/comments/:id"; readonly handler: "read"; }, { readonly method: "patch"; readonly path: "/comments/:id"; readonly handler: "update"; }, { readonly method: "delete"; readonly path: "/comments/:id"; readonly handler: "del"; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-resource` ^1.0.0
