/**
 * AWS Textract OCR provider configuration.
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
 * Configuration for the AWS Textract OCR provider.
 */
export interface TextractOcrConfig {
  /** AWS region to call Textract in. Defaults to AWS_TEXTRACT_REGION, then AWS_REGION, then 'us-east-1'. */
  region?: string
  /** Endpoint URL override (e.g. a local stub). Defaults to the AWS regional endpoint. */
  endpoint?: string
  /** Explicit credentials. Omit to use the AWS default chain. */
  credentials?: AwsCredentials
}
