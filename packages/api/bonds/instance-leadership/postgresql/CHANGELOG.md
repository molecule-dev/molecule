# @molecule/api-instance-leadership-postgresql

## 1.1.2

### Patch Changes

- Expire silent leadership sessions and demote holders when their database heartbeat fails.

## 1.1.0

### Minor Changes

- 313aa40: First release of the PostgreSQL instance-leadership bond: a session advisory lock on a dedicated connection, so one instance leads across every Machine and leadership is released the instant its connection ends.
