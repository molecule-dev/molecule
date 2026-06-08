/**
 * Types for the chatbot-tester sandbox UI.
 *
 * @module
 */

/** A single chat message displayed in the chatbot tester sandbox UI. */
export interface TesterMessage {
  id: string | number
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

/** A selectable bot/agent option shown in the chatbot tester sandbox UI. */
export interface TesterBotOption {
  id: string
  name?: string
}
