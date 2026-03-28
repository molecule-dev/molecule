CREATE TABLE IF NOT EXISTS "workflows" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "initialState" TEXT NOT NULL,
  "states" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflows_name" ON "workflows" ("name");

CREATE TABLE IF NOT EXISTS "workflow_instances" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflowId" UUID NOT NULL REFERENCES "workflows"("id") ON DELETE CASCADE,
  "state" TEXT NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_instances_workflowId" ON "workflow_instances" ("workflowId");
CREATE INDEX IF NOT EXISTS "idx_workflow_instances_state" ON "workflow_instances" ("state");

CREATE TABLE IF NOT EXISTS "workflow_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "instanceId" UUID NOT NULL REFERENCES "workflow_instances"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL,
  "fromState" TEXT NOT NULL,
  "toState" TEXT NOT NULL,
  "data" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_events_instanceId" ON "workflow_events" ("instanceId");
