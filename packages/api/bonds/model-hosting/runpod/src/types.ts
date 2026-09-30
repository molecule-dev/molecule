/**
 * RunPod model hosting configuration and wire types.
 *
 * @module
 */

/** Configuration for the RunPod model hosting provider. */
export interface RunPodConfig {
  /** API key. Defaults to `RUNPOD_API_KEY`. */
  apiKey?: string
  /** GraphQL `locations` for `'us'`. Default `'US'`. */
  usLocations?: string
  /** GraphQL `locations` for `'eu'`. Default `'CZ,FR,GB,NO,RO'`. */
  euLocations?: string
  /** Container disk per worker, in GB. Default 20. */
  containerDiskGb?: number
  /** REST base URL (tests). Default `https://rest.runpod.io/v1`. */
  restBaseUrl?: string
  /** GraphQL URL (tests). Default `https://api.runpod.io/graphql`. */
  graphqlUrl?: string
  /** Endpoint URL template (tests); `{id}` is replaced. Default `https://{id}.api.runpod.ai`. */
  endpointUrlTemplate?: string
  /** How often `deploy` probes the health path while workers start, in ms. Default 5000. */
  pollIntervalMs?: number
}

/** A RunPod template (only the fields read here). */
export interface RunPodTemplate {
  id: string
  name: string
}

/** A RunPod serverless endpoint (only the fields read here). */
export interface RunPodEndpoint {
  id: string
  name: string
  templateId?: string
  workersMin?: number
  workersMax?: number
  idleTimeout?: number
  gpuTypeIds?: string[]
  dataCenterIds?: string[]
  createdAt?: string
  workers?: unknown[]
}
