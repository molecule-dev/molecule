/** Explicit project facts used to generate a native-compatible Node deployment. */
export interface ApiDeploymentArtifactOptions {
  /** One Debian/apt-based image for build and runtime; an immutable digest is supported. */
  nodeImage?: string
  /** Build command as argv, executed after npm ci with install scripts enabled. */
  buildCommand?: readonly string[]
  /** Server command as argv, executed without a shell. */
  runtimeCommand?: readonly string[]
  /** Output paths to carry. For workspaces, include the server workspace and frontend output. */
  runtimePaths?: readonly string[]
  /** Server working directory relative to the build context root. */
  runtimeDirectory?: string
  /** Additional Debian build prerequisites, beyond Python/make/C++. */
  buildPackages?: readonly string[]
  /** Additional Debian runtime libraries/tools. */
  runtimePackages?: readonly string[]
  /** Exposed container port; does not configure a hosting provider. */
  port?: number
}

/** Ordinary project files; callers own their write/merge policy for existing files. */
export interface ApiDeploymentArtifacts {
  /** Self-contained multi-stage Dockerfile; does not depend on the external build script. */
  Dockerfile: string
  /** The identical POSIX install/build/prune body embedded in the Dockerfile. */
  '.molecule/deploy/build.sh': string
  /** Build-context exclusions for host modules, old output and local secrets. */
  '.dockerignore': string
}
