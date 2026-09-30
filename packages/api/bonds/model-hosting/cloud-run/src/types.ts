/**
 * Cloud Run model hosting configuration and wire types.
 *
 * @module
 */

/** Configuration for the Cloud Run model hosting provider. */
export interface CloudRunConfig {
  /** Google Cloud project id. Defaults to `GOOGLE_CLOUD_PROJECT`. */
  projectId?: string
  /**
   * Service account key JSON (the file's contents, not a path). Defaults to
   * `GOOGLE_SERVICE_ACCOUNT_JSON`. Needs `roles/run.admin` to deploy and
   * `roles/run.invoker` on the services to call private ones.
   */
  serviceAccountJson?: string
  /** Region for `'us'`. Default `'us-central1'` (has L4 GPUs). */
  usRegion?: string
  /** Region for `'eu'`. Default `'europe-west4'` (has L4 GPUs). */
  euRegion?: string
  /** Service account email the containers run as (optional; Cloud Run's default otherwise). */
  runtimeServiceAccount?: string
  /** Admin API base URL (tests, proxies). Default `https://run.googleapis.com`. */
  apiBaseUrl?: string
  /** OAuth token endpoint (tests). Default `https://oauth2.googleapis.com/token`. */
  tokenUrl?: string
  /** How often `deploy` polls the service while it rolls out, in ms. Default 5000. */
  pollIntervalMs?: number
}

/** The fields of a service account key this bond reads. */
export interface ServiceAccountKey {
  client_email: string
  private_key: string
  private_key_id?: string
}

/** A Cloud Run v2 Condition (only the fields read here). */
export interface RunCondition {
  type?: string
  state?: 'CONDITION_PENDING' | 'CONDITION_RECONCILING' | 'CONDITION_FAILED' | 'CONDITION_SUCCEEDED'
  message?: string
}

/** A Cloud Run v2 Service (only the fields read or written here). */
export interface RunService {
  name?: string
  uri?: string
  createTime?: string
  reconciling?: boolean
  terminalCondition?: RunCondition
  labels?: Record<string, string>
  annotations?: Record<string, string>
  ingress?: string
  invokerIamDisabled?: boolean
  template?: {
    containers?: Array<Record<string, unknown>>
    scaling?: { minInstanceCount?: number; maxInstanceCount?: number }
    nodeSelector?: { accelerator?: string }
    gpuZonalRedundancyDisabled?: boolean
    maxInstanceRequestConcurrency?: number
    serviceAccount?: string
  }
}
