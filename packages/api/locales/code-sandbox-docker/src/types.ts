/** Translation keys for the code-sandbox-docker locale package. */
export type CodeSandboxDockerTranslationKey =
  | 'codeSandbox.docker.error.readFailed'
  | 'codeSandbox.docker.error.writeFailed'
  | 'codeSandbox.docker.error.deleteFailed'
  | 'codeSandbox.docker.error.apiError'

/** Translation record mapping code-sandbox-docker keys to translated strings. */
export type CodeSandboxDockerTranslations = {
  [key in CodeSandboxDockerTranslationKey]: string
}
