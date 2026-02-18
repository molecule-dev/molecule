# @molecule/api-utilities-validation

Validation utilities for molecule.dev.

## Type
`utility`

## Installation
```bash
npm install @molecule/api-utilities-validation
```

## API

### Interfaces

#### `ZodError`

An Error-like class used to store Zod validation issues.

```typescript
interface ZodError<T = unknown> extends $ZodError<T> {
    /** @deprecated Use the `z.treeifyError(err)` function instead. */
    format(): core.$ZodFormattedError<T>;
    format<U>(mapper: (issue: core.$ZodIssue) => U): core.$ZodFormattedError<T, U>;
    /** @deprecated Use the `z.treeifyError(err)` function instead. */
    flatten(): core.$ZodFlattenedError<T>;
    flatten<U>(mapper: (issue: core.$ZodIssue) => U): core.$ZodFlattenedError<T, U>;
    /** @deprecated Push directly to `.issues` instead. */
    addIssue(issue: core.$ZodIssue): void;
    /** @deprecated Push directly to `.issues` instead. */
    addIssues(issues: core.$ZodIssue[]): void;
    /** @deprecated Check `err.issues.length === 0` instead. */
    isEmpty: boolean;
}
```

#### `ZodSchema`

```typescript
interface ZodType<out Output = unknown, out Input = unknown, out Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<Output, Input>> extends core.$ZodType<Output, Input, Internals> {
    def: Internals["def"];
    type: Internals["def"]["type"];
    /** @deprecated Use `.def` instead. */
    _def: Internals["def"];
    /** @deprecated Use `z.output<typeof schema>` instead. */
    _output: Internals["output"];
    /** @deprecated Use `z.input<typeof schema>` instead. */
    _input: Internals["input"];
    "~standard": ZodStandardSchemaWithJSON<this>;
    /** Converts this schema to a JSON Schema representation. */
    toJSONSchema(params?: core.ToJSONSchemaParams): core.ZodStandardJSONSchemaPayload<this>;
    check(...checks: (core.CheckFn<core.output<this>> | core.$ZodCheck<core.output<this>>)[]): this;
    with(...checks: (core.CheckFn<core.output<this>> | core.$ZodCheck<core.output<this>>)[]): this;
    clone(def?: Internals["def"], params?: {
        parent: boolean;
    }): this;
    register<R extends core.$ZodRegistry>(registry: R, ...meta: this extends R["_schema"] ? undefined extends R["_meta"] ? [core.$replace<R["_meta"], this>?] : [core.$replace<R["_meta"], this>] : ["Incompatible schema"]): this;
    brand<T extends PropertyKey = PropertyKey, Dir extends "in" | "out" | "inout" = "out">(value?: T): PropertyKey extends T ? this : core.$ZodBranded<this, T, Dir>;
    parse(data: unknown, params?: core.ParseContext<core.$ZodIssue>): core.output<this>;
    safeParse(data: unknown, params?: core.ParseContext<core.$ZodIssue>): parse.ZodSafeParseResult<core.output<this>>;
    parseAsync(data: unknown, params?: core.ParseContext<core.$ZodIssue>): Promise<core.output<this>>;
    safeParseAsync(data: unknown, params?: core.ParseContext<core.$ZodIssue>): Promise<parse.ZodSafeParseResult<core.output<this>>>;
    spa: (data: unknown, params?: core.ParseContext<core.$ZodIssue>) => Promise<parse.ZodSafeParseResult<core.output<this>>>;
    encode(data: core.output<this>, params?: core.ParseContext<core.$ZodIssue>): core.input<this>;
    decode(data: core.input<this>, params?: core.ParseContext<core.$ZodIssue>): core.output<this>;
    encodeAsync(data: core.output<this>, params?: core.ParseContext<core.$ZodIssue>): Promise<core.input<this>>;
    decodeAsync(data: core.input<this>, params?: core.ParseContext<core.$ZodIssue>): Promise<core.output<this>>;
    safeEncode(data: core.output<this>, params?: core.ParseContext<core.$ZodIssue>): parse.ZodSafeParseResult<core.input<this>>;
    safeDecode(data: core.input<this>, params?: core.ParseContext<core.$ZodIssue>): parse.ZodSafeParseResult<core.output<this>>;
    safeEncodeAsync(data: core.output<this>, params?: core.ParseContext<core.$ZodIssue>): Promise<parse.ZodSafeParseResult<core.input<this>>>;
    safeDecodeAsync(data: core.input<this>, params?: core.ParseContext<core.$ZodIssue>): Promise<parse.ZodSafeParseResult<core.output<this>>>;
    refine<Ch extends (arg: core.output<this>) => unknown | Promise<unknown>>(check: Ch, params?: string | core.$ZodCustomParams): Ch extends (arg: any) => arg is infer R ? this & ZodType<R, core.input<this>> : this;
    superRefine(refinement: (arg: core.output<this>, ctx: core.$RefinementCtx<core.output<this>>) => void | Promise<void>): this;
    overwrite(fn: (x: core.output<this>) => core.output<this>): this;
    optional(): ZodOptional<this>;
    exactOptional(): ZodExactOptional<this>;
    nonoptional(params?: string | core.$ZodNonOptionalParams): ZodNonOptional<this>;
    nullable(): ZodNullable<this>;
    nullish(): ZodOptional<ZodNullable<this>>;
    default(def: util.NoUndefined<core.output<this>>): ZodDefault<this>;
    default(def: () => util.NoUndefined<core.output<this>>): ZodDefault<this>;
    prefault(def: () => core.input<this>): ZodPrefault<this>;
    prefault(def: core.input<this>): ZodPrefault<this>;
    array(): ZodArray<this>;
    or<T extends core.SomeType>(option: T): ZodUnion<[this, T]>;
    and<T extends core.SomeType>(incoming: T): ZodIntersection<this, T>;
    transform<NewOut>(transform: (arg: core.output<this>, ctx: core.$RefinementCtx<core.output<this>>) => NewOut | Promise<NewOut>): ZodPipe<this, ZodTransform<Awaited<NewOut>, core.output<this>>>;
    catch(def: core.output<this>): ZodCatch<this>;
    catch(def: (ctx: core.$ZodCatchCtx) => core.output<this>): ZodCatch<this>;
    pipe<T extends core.$ZodType<any, core.output<this>>>(target: T | core.$ZodType<any, core.output<this>>): ZodPipe<this, T>;
    readonly(): ZodReadonly<this>;
    /** Returns a new instance that has been registered in `z.globalRegistry` with the specified description */
    describe(description: string): this;
    description?: string;
    /** Returns the metadata associated with this instance in `z.globalRegistry` */
    meta(): core.$replace<core.GlobalMeta, this> | undefined;
    /** Returns a new instance that has been registered in `z.globalRegistry` with the specified metadata */
    meta(data: core.$replace<core.GlobalMeta, this>): this;
    /** @deprecated Try safe-parsing `undefined` (this is what `isOptional` does internally):
     *
     * ```ts
     * const schema = z.string().optional();
     * const isOptional = schema.safeParse(undefined).success; // true
     * ```
     */
    isOptional(): boolean;
    /**
     * @deprecated Try safe-parsing `null` (this is what `isNullable` does internally):
     *
     * ```ts
     * const schema = z.string().nullable();
     * const isNullable = schema.safeParse(null).success; // true
     * ```
     */
    isNullable(): boolean;
    apply<T>(fn: (schema: this) => T): T;
}
```

### Functions

#### `getValidProps(options, options, options, options)`

Validates resource props against a Zod schema, returning typed valid props or throwing
a descriptive error with field-level messages prefixed by the resource name.

```typescript
function getValidProps({
  name,
  schema,
  props,
}: { name: string; schema: ZodSchema<Props>; props: unknown; }): Props
```

- `options` — Validation options.
- `options` — .name - The resource name (used in error messages, e.g., `"User.email: Required"`).
- `options` — .schema - The Zod schema to validate against.
- `options` — .props - The raw props to validate.

**Returns:** The validated and typed props.

#### `isEmail(string, strict)`

Basic regex for determining whether or not a string is an email address.

```typescript
function isEmail(string: string, strict?: boolean): boolean
```

- `string` — The string.
- `strict` — Whether strict.

**Returns:** Whether email.

#### `isUuid(uuid)`

Basic regex for determining whether or not a string is a UUID.

```typescript
function isUuid(uuid: string): boolean
```

- `uuid` — The uuid.

**Returns:** Whether uuid.

#### `safeParse(schema, data)`

Validates data against a Zod schema without throwing, returning a discriminated union.

```typescript
function safeParse(schema: ZodSchema<T, unknown, $ZodTypeInternals<T, unknown>>, data: unknown): { success: true; data: T; } | { success: false; error: ZodError; }
```

- `schema` — The Zod schema to validate against.
- `data` — The raw data to validate.

**Returns:** `{ success: true, data }` on success, or `{ success: false, error }` with a ZodError.

#### `validate(schema, data)`

Validates data against a Zod schema, throwing a ZodError on failure.

```typescript
function validate(schema: ZodSchema<T, unknown, $ZodTypeInternals<T, unknown>>, data: unknown): T
```

- `schema` — The Zod schema to validate against.
- `data` — The raw data to validate.

**Returns:** The validated and typed data.
