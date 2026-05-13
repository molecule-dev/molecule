-- @molecule/api-resource-firmware — schema setup

CREATE TABLE IF NOT EXISTS firmware_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL,
  version       TEXT NOT NULL,
  device_type   TEXT NOT NULL,
  release_notes TEXT NOT NULL DEFAULT '',
  download_url  TEXT,
  checksum      TEXT,
  file_size     BIGINT NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',
  released_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firmware_versions_owner_status
  ON firmware_versions (owner_id, status);

CREATE TABLE IF NOT EXISTS firmware_rollouts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID NOT NULL,
  firmware_id       UUID NOT NULL,
  fleet_id          UUID,
  device_ids        JSONB NOT NULL DEFAULT '[]'::jsonb,
  strategy          TEXT NOT NULL DEFAULT 'immediate',
  status            TEXT NOT NULL DEFAULT 'active',
  target_count      INTEGER NOT NULL DEFAULT 0,
  completed_count   INTEGER NOT NULL DEFAULT 0,
  failed_count      INTEGER NOT NULL DEFAULT 0,
  progress_percent  INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firmware_rollouts_owner_status
  ON firmware_rollouts (owner_id, status);

CREATE TABLE IF NOT EXISTS firmware_update_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rollout_id    UUID NOT NULL,
  firmware_id   UUID NOT NULL,
  device_id     UUID NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firmware_tasks_rollout
  ON firmware_update_tasks (rollout_id);
CREATE INDEX IF NOT EXISTS idx_firmware_tasks_device
  ON firmware_update_tasks (device_id);
