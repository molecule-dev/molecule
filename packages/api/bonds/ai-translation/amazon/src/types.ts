/**
 * Amazon Translate provider configuration.
 *
 * @module
 */

/**
 * An explicit AWS credential pair. Omit to resolve credentials through the
 * AWS default chain (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, shared
 * config files, or an instance role) at send time.
 */
export interface AwsCredentials {
  /** The AWS access key ID. */
  accessKeyId: string
  /** The AWS secret access key. */
  secretAccessKey: string
}

/**
 * Configuration for the Amazon Translate provider.
 */
export interface AmazonTranslateConfig {
  /** AWS region to call Translate in. Defaults to AWS_TRANSLATE_REGION, then AWS_REGION, then 'us-east-1'. */
  region?: string
  /** Endpoint URL override. Defaults to the AWS regional endpoint. */
  endpoint?: string
  /** Explicit credentials. Omit to use the AWS default chain. */
  credentials?: AwsCredentials
}
