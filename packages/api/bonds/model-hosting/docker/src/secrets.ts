/**
 * Docker model hosting settings — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can report them. None
 * are required: the defaults target the local engine.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Settings used by the Docker model hosting bond. */
export const modelHostingDockerSecretDefinitions: SecretDefinition[] = [
  {
    key: 'DOCKER_SOCKET',
    description:
      'Docker engine socket — Path to the engine socket the model containers run on. Defaults to /var/run/docker.sock.',
    helpUrl: 'https://docs.docker.com/engine/security/protect-access/',
    required: false,
    example: '/var/run/docker.sock',
  },
  {
    key: 'MODEL_HOST_PUBLIC_HOST',
    description:
      'Model host name — The host name endpoint URLs use (the machine running the containers). Defaults to localhost.',
    helpUrl: 'https://docs.docker.com/engine/network/',
    required: false,
    example: 'gpu-box.internal',
  },
]

registerSecrets(modelHostingDockerSecretDefinitions)
