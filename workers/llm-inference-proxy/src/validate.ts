// Bounds on what one request can ask the GPU endpoint to do. The token and
// temperature ranges cover the sliders in LlmFromScratchDemo.tsx (32-300 and
// 0-1) plus its one-token warm-up request.
export const MAX_MESSAGES = 50
export const MAX_MESSAGE_CHARS = 4000
const MAX_NEW_TOKENS = 300

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatInput {
  messages: ChatMessage[]
  max_new_tokens: number
  temperature: number
}

export type ParseResult = { ok: true; input: ChatInput } | { ok: false; message: string }

const TOP_LEVEL_FIELDS = new Set(['messages', 'max_new_tokens', 'temperature'])
const MESSAGE_FIELDS = new Set(['role', 'content'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unknownField(value: Record<string, unknown>, allowed: Set<string>): string | undefined {
  return Object.keys(value).find((key) => !allowed.has(key))
}

function parseMessage(value: unknown, index: number): ChatMessage | string {
  if (!isRecord(value)) return `messages[${index}] must be an object`
  const extra = unknownField(value, MESSAGE_FIELDS)
  if (extra !== undefined) return `messages[${index}] has an unknown field: ${extra}`
  const { role, content } = value
  if (role !== 'user' && role !== 'assistant') return `messages[${index}].role must be user or assistant`
  if (typeof content !== 'string' || content.length === 0 || content.length > MAX_MESSAGE_CHARS) {
    return `messages[${index}].content must be a string of 1 to ${MAX_MESSAGE_CHARS} characters`
  }
  return { role, content }
}

/**
 * Turn an untrusted request body into the exact object sent to the model.
 * Out-of-range values are rejected, not clamped, so a caller is never given
 * something other than what it asked for.
 */
export function parseChatInput(body: unknown): ParseResult {
  const fail = (message: string): ParseResult => ({ ok: false, message })
  if (!isRecord(body)) return fail('Body must be a JSON object')
  const extra = unknownField(body, TOP_LEVEL_FIELDS)
  if (extra !== undefined) return fail(`Unknown field: ${extra}`)

  const { messages: rawMessages, max_new_tokens: maxNewTokens, temperature } = body
  if (!Array.isArray(rawMessages) || rawMessages.length === 0 || rawMessages.length > MAX_MESSAGES) {
    return fail(`messages must be an array of 1 to ${MAX_MESSAGES} items`)
  }
  const messages: ChatMessage[] = []
  for (const [index, raw] of rawMessages.entries()) {
    const message = parseMessage(raw, index)
    if (typeof message === 'string') return fail(message)
    messages.push(message)
  }

  if (typeof maxNewTokens !== 'number' || !Number.isInteger(maxNewTokens) || maxNewTokens < 1 || maxNewTokens > MAX_NEW_TOKENS) {
    return fail(`max_new_tokens must be an integer from 1 to ${MAX_NEW_TOKENS}`)
  }
  if (typeof temperature !== 'number' || !(temperature >= 0 && temperature <= 1)) {
    return fail('temperature must be a number from 0 to 1')
  }

  return { ok: true, input: { messages, max_new_tokens: maxNewTokens, temperature } }
}
