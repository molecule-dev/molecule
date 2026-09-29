/**
 * AI decisions provider interface.
 *
 * A "decision" is a typed question about a piece of state (text, an email, a
 * ticket, a JSON document) whose answer is a probability distribution, never
 * generated text: pick one of N options (`choice`), place it on an ordered
 * scale (`score`), or say how likely a statement is true (`yesNo`). One call
 * asks any number of questions about the same state.
 *
 * The shape follows the `/v1/systemone` protocol spoken by TypeSafe's Jev and
 * the open-weights Laya server, but it is provider-neutral: an LLM bond
 * implements it too.
 *
 * @module
 */

/**
 * What the questions are about: plain text, or a JSON object / array (an
 * email with headers, a ticket with metadata, a chat log).
 */
export type DecisionState = string | Record<string, unknown> | unknown[]

/**
 * Pick exactly one option.
 */
export interface ChoiceQuestion {
  type: 'choice'
  /** What is being decided, e.g. `'Which team should handle this ticket?'`. */
  instructions: string
  /**
   * The options, keyed by the label you want back, each with a short
   * description of when it applies. `{ billing: 'invoices, refunds', tech: 'bugs, outages' }`.
   */
  criteria: Record<string, string>
}

/**
 * Place the state on an ordered scale.
 */
export interface ScoreQuestion {
  type: 'score'
  /** What is being rated, e.g. `'How urgent is this?'`. */
  instructions: string
  /**
   * The levels, lowest first. Level `i` is described by `criteria[i]`:
   * `['calm', 'firm', 'angry', 'furious']`.
   */
  criteria: string[]
}

/**
 * How likely is a statement true. (Called `noul` on the Jev/Laya wire.)
 */
export interface YesNoQuestion {
  type: 'yesNo'
  /** The statement to test, e.g. `'The customer is asking for a refund.'`. */
  instructions: string
  /** Optional descriptions of what counts as yes and as no. */
  criteria?: { yes?: string; no?: string }
}

/** Any question a decision provider answers. */
export type DecisionQuestion = ChoiceQuestion | ScoreQuestion | YesNoQuestion

/** Fields every answer carries. */
export interface AnswerBase {
  /**
   * Probability mass on the reported answer (the highest option probability;
   * `max(p, 1 - p)` for yes/no), in `0..1`. Every bond computes it this same
   * way from the probabilities, so a threshold means the same thing whichever
   * provider is bonded — it is NOT the vendor's own `confidence` field.
   */
  confidence: number
  /** Set only when `minConfidence` was passed: `true` when `confidence` fell below it. */
  lowConfidence?: boolean
}

/** Answer to a {@link ChoiceQuestion}. */
export interface ChoiceAnswer extends AnswerBase {
  type: 'choice'
  /** The most likely option — always one of the question's `criteria` keys. */
  choice: string
  /** Probability per option (every `criteria` key present), summing to ~1. */
  probabilities: Record<string, number>
}

/** Answer to a {@link ScoreQuestion}. */
export interface ScoreAnswer extends AnswerBase {
  type: 'score'
  /** Expected level index — may fall between levels (e.g. `2.64`). */
  score: number
  /** The most likely level index (`0..criteria.length - 1`). */
  level: number
  /** Probability per level, indexed like `criteria`. */
  probabilities: number[]
}

/** Answer to a {@link YesNoQuestion}. */
export interface YesNoAnswer extends AnswerBase {
  type: 'yesNo'
  /** Probability that the statement is true, in `0..1`. */
  probability: number
  /** `probability >= 0.5`. Prefer thresholding `probability` yourself when the cost of each mistake differs. */
  answer: boolean
}

/** Any answer. `answers[id].type` matches `questions[id].type`. */
export type DecisionAnswer = ChoiceAnswer | ScoreAnswer | YesNoAnswer

/**
 * Maps a questions object to its answers object, so
 * `result.answers.department.choice` is typed when the questions are literal.
 */
export type AnswersFor<Q extends Record<string, DecisionQuestion>> = {
  [K in keyof Q]: Q[K] extends ChoiceQuestion
    ? ChoiceAnswer
    : Q[K] extends ScoreQuestion
      ? ScoreAnswer
      : YesNoAnswer
}

/**
 * An image the questions are also about (a screenshot, a photo of a receipt).
 */
export interface DecisionImage {
  /** The image's media type: `'image/png'`, `'image/jpeg'`, `'image/webp'`, … */
  mimeType: string
  /** The raw image bytes, base64-encoded — no `data:` URL prefix. */
  data: string
}

/** Input to one decision request. */
export interface DecideInput<
  Q extends Record<string, DecisionQuestion> = Record<string, DecisionQuestion>,
> {
  /** What the questions are about. */
  state: DecisionState
  /** The questions, keyed by an id you choose; answers come back under the same ids. */
  questions: Q
  /**
   * Images the questions are also about, read alongside `state`. Only bonds
   * whose model sees images accept this; every other bond THROWS when it is
   * set rather than silently answering from the text alone.
   */
  images?: DecisionImage[]
  /** Provider-specific model / checkpoint id (e.g. `'jev-latest'`, `'multilingual'`). */
  model?: string
  /** Mark answers whose `confidence` is below this (`0..1`) with `lowConfidence: true`. */
  minConfidence?: number
  /** Abort signal to cancel the in-flight request. */
  signal?: AbortSignal
}

/** Token usage, when the provider reports it. */
export interface DecisionUsage {
  inputTokens: number
  outputTokens: number
}

/** Result of one decision request. */
export interface DecideResult<
  Q extends Record<string, DecisionQuestion> = Record<string, DecisionQuestion>,
> {
  /** One answer per question id. */
  answers: AnswersFor<Q>
  /** The model or checkpoint that answered, when the provider says. */
  model?: string
  /** Token usage, when reported. */
  usage?: DecisionUsage
}

/**
 * AI decisions provider interface. Implemented by the Laya, Jev and LLM bonds.
 */
export interface AIDecisionsProvider {
  /** Provider identifier. */
  readonly name: string

  /**
   * Answer every question about `state`.
   *
   * @param input - The state, the questions and options.
   * @returns One typed answer per question id.
   */
  decide<Q extends Record<string, DecisionQuestion>>(
    input: DecideInput<Q>,
  ): Promise<DecideResult<Q>>
}
