/**
 * Types for the chatbot-tester sandbox UI.
 *
 * @module
 */

export interface TesterMessage {
  id: string | number
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

export interface TesterBotOption {
  id: string
  name?: string
}
