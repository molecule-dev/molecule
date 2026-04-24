# @molecule/api-permissions

Provider-agnostic permissions interface for molecule.dev.

Defines the `PermissionsProvider` interface for role-based and
attribute-based access control (RBAC/ABAC). Bond packages (Casbin,
custom, etc.) implement this interface. Application code uses the
convenience functions (`can`, `assign`, `revoke`, `getRoles`) which
delegate to the bonded provider.

## Quick Start

```typescript
import { setProvider, can, assign } from '@molecule/api-permissions'
import { provider as casbin } from '@molecule/api-permissions-casbin'

setProvider(casbin)

await assign('user:123', 'editor')
const allowed = await can('user:123', 'write', 'project')
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-permissions
```

## API

### Interfaces

#### `CreateRole`

Input for creating a new role.

```typescript
interface CreateRole {
  /** Human-readable name of the role. */
  name: string

  /** Optional description of the role's purpose. */
  description?: string

  /** Permissions to assign to the role. */
  permissions: Permission[]
}
```

#### `Permission`

A permission granting an action on a resource, optionally with conditions.

```typescript
interface Permission {
  /** Unique identifier for this permission. */
  id: string

  /** The action this permission grants (e.g. `read`, `write`, `delete`). */
  action: string

  /** The resource this permission applies to (e.g. `project`, `user`, `*`). */
  resource: string

  /** Optional ABAC conditions that must be met for this permission to apply. */
  conditions?: Record<string, unknown>
}
```

#### `PermissionsProvider`

Permissions provider interface.

All permissions providers must implement this interface to provide
authorization checking, role management, and permission assignment.

```typescript
interface PermissionsProvider {
  /**
   * Checks whether a subject is allowed to perform an action on a resource.
   *
   * @param subject - The entity requesting access (e.g. user ID).
   * @param action - The action being requested (e.g. `read`, `write`).
   * @param resource - The resource being accessed (e.g. `project`).
   * @param context - Optional ABAC context attributes for condition evaluation.
   * @returns `true` if the subject is authorized.
   */
  can(
    subject: string,
    action: string,
    resource: string,
    context?: Record<string, unknown>,
  ): Promise<boolean>

  /**
   * Assigns a role to a subject, optionally within a scope.
   *
   * @param subject - The entity to assign the role to.
   * @param role - The role name to assign.
   * @param scope - Optional scope for the assignment (e.g. `org:123`).
   */
  assign(subject: string, role: string, scope?: string): Promise<void>

  /**
   * Revokes a role from a subject, optionally within a scope.
   *
   * @param subject - The entity to revoke the role from.
   * @param role - The role name to revoke.
   * @param scope - Optional scope for the revocation.
   */
  revoke(subject: string, role: string, scope?: string): Promise<void>

  /**
   * Retrieves all roles assigned to a subject.
   *
   * @param subject - The entity to look up roles for.
   * @returns The roles assigned to the subject.
   */
  getRoles(subject: string): Promise<Role[]>

  /**
   * Creates a new role definition.
   *
   * @param role - The role definition to create.
   * @returns The created role with an assigned `id`.
   */
  createRole(role: CreateRole): Promise<Role>

  /**
   * Deletes a role definition by ID.
   *
   * @param roleId - The ID of the role to delete.
   */
  deleteRole(roleId: string): Promise<void>

  /**
   * Retrieves all permissions granted by a role.
   *
   * @param role - The role name to look up permissions for.
   * @returns The permissions granted by the role.
   */
  getPermissions(role: string): Promise<Permission[]>

  /**
   * Adds a permission to an existing role.
   *
   * @param role - The role name to add the permission to.
   * @param permission - The permission to add.
   */
  addPermission(role: string, permission: Permission): Promise<void>

  /**
   * Removes a permission from a role.
   *
   * @param role - The role name to remove the permission from.
   * @param permissionId - The ID of the permission to remove.
   */
  removePermission(role: string, permissionId: string): Promise<void>
}
```

#### `Role`

A role grouping one or more permissions, optionally scoped.

```typescript
interface Role {
  /** Unique identifier for this role. */
  id: string

  /** Human-readable name of the role (e.g. `admin`, `editor`). */
  name: string

  /** Optional description of the role's purpose. */
  description?: string

  /** Permissions granted by this role. */
  permissions: Permission[]

  /** Optional scope restricting where this role applies (e.g. `org:123`). */
  scope?: string
}
```

### Functions

#### `addPermission(role, permission)`

Adds a permission to an existing role.

```typescript
function addPermission(role: string, permission: Permission): Promise<void>
```

- `role` — The role name to add the permission to.
- `permission` — The permission to add.

**Returns:** Resolves when the permission is attached to the role.

#### `assign(subject, role, scope)`

Assigns a role to a subject, optionally within a scope.

```typescript
function assign(subject: string, role: string, scope?: string): Promise<void>
```

- `subject` — The entity to assign the role to.
- `role` — The role name to assign.
- `scope` — Optional scope for the assignment (e.g. `org:123`).

**Returns:** Resolves when the bonded provider records the assignment.

#### `can(subject, action, resource, context)`

Checks whether a subject is allowed to perform an action on a resource.

```typescript
function can(subject: string, action: string, resource: string, context?: Record<string, unknown>): Promise<boolean>
```

- `subject` — The entity requesting access (e.g. user ID).
- `action` — The action being requested (e.g. `read`, `write`).
- `resource` — The resource being accessed (e.g. `project`).
- `context` — Optional ABAC context attributes for condition evaluation.

**Returns:** `true` if the subject is authorized.

#### `createRole(role)`

Creates a new role definition.

```typescript
function createRole(role: CreateRole): Promise<Role>
```

- `role` — The role definition to create.

**Returns:** The created role with an assigned `id`.

#### `deleteRole(roleId)`

Deletes a role definition by ID.

```typescript
function deleteRole(roleId: string): Promise<void>
```

- `roleId` — The ID of the role to delete.

**Returns:** Resolves when the role is removed.

#### `getPermissions(role)`

Retrieves all permissions granted by a role.

```typescript
function getPermissions(role: string): Promise<Permission[]>
```

- `role` — The role name to look up permissions for.

**Returns:** The permissions granted by the role.

#### `getProvider()`

Retrieves the bonded permissions provider, throwing if none is configured.

```typescript
function getProvider(): PermissionsProvider
```

**Returns:** The bonded permissions provider.

#### `getRoles(subject)`

Retrieves all roles assigned to a subject.

```typescript
function getRoles(subject: string): Promise<Role[]>
```

- `subject` — The entity to look up roles for.

**Returns:** The roles assigned to the subject.

#### `hasProvider()`

Checks whether a permissions provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a permissions provider is bonded.

#### `removePermission(role, permissionId)`

Removes a permission from a role.

```typescript
function removePermission(role: string, permissionId: string): Promise<void>
```

- `role` — The role name to remove the permission from.
- `permissionId` — The ID of the permission to remove.

**Returns:** Resolves when the permission is removed from the role.

#### `revoke(subject, role, scope)`

Revokes a role from a subject, optionally within a scope.

```typescript
function revoke(subject: string, role: string, scope?: string): Promise<void>
```

- `subject` — The entity to revoke the role from.
- `role` — The role name to revoke.
- `scope` — Optional scope for the revocation.

**Returns:** Resolves when the bonded provider records the revocation.

#### `setProvider(provider)`

Registers a permissions provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: PermissionsProvider): void
```

- `provider` — The permissions provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
