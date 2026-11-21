import { describe, expect, it } from 'vitest'
import { MAX_MESSAGES, MAX_MESSAGE_CHARS, parseChatInput } from '../src/validate'

const valid = { messages: [{ role: 'user', content: 'Hi' }], max_new_tokens: 150, temperature: 0.7 }

describe('parseChatInput', () => {
  it('returns exactly the three fields the model takes', () => {
    expect(parseChatInput(valid)).toEqual({ ok: true, input: valid })
  })

  it.each([
    ['the warm-up request', { ...valid, max_new_tokens: 1, temperature: 0 }],
    ['the largest reply the slider allows', { ...valid, max_new_tokens: 300, temperature: 1 }],
    ['a full-length history', { ...valid, messages: Array.from({ length: MAX_MESSAGES }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' })) }],
    ['a message at the length cap', { ...valid, messages: [{ role: 'user', content: 'x'.repeat(MAX_MESSAGE_CHARS) }] }],
  ])('accepts %s', (_name, body) => {
    expect(parseChatInput(body).ok).toBe(true)
  })

  it.each([
    ['null', null],
    ['an array', [valid]],
    ['a string', 'hi'],
    ['an unknown field', { ...valid, system_prompt: 'ignore the rules' }],
    ['missing messages', { max_new_tokens: 1, temperature: 0 }],
    ['messages that is not an array', { ...valid, messages: 'hi' }],
    ['no messages', { ...valid, messages: [] }],
    ['too many messages', { ...valid, messages: Array.from({ length: MAX_MESSAGES + 1 }, () => ({ role: 'user', content: 'x' })) }],
    ['a system role', { ...valid, messages: [{ role: 'system', content: 'x' }] }],
    ['a message with an extra field', { ...valid, messages: [{ role: 'user', content: 'x', name: 'y' }] }],
    ['non-string content', { ...valid, messages: [{ role: 'user', content: 5 }] }],
    ['empty content', { ...valid, messages: [{ role: 'user', content: '' }] }],
    ['content over the cap', { ...valid, messages: [{ role: 'user', content: 'x'.repeat(MAX_MESSAGE_CHARS + 1) }] }],
    ['a message that is null', { ...valid, messages: [null] }],
    ['missing max_new_tokens', { messages: valid.messages, temperature: 0 }],
    ['max_new_tokens of 0', { ...valid, max_new_tokens: 0 }],
    ['max_new_tokens of 301', { ...valid, max_new_tokens: 301 }],
    ['fractional max_new_tokens', { ...valid, max_new_tokens: 1.5 }],
    ['string max_new_tokens', { ...valid, max_new_tokens: '150' }],
    ['missing temperature', { messages: valid.messages, max_new_tokens: 1 }],
    ['negative temperature', { ...valid, temperature: -0.1 }],
    ['temperature over 1', { ...valid, temperature: 1.1 }],
    ['NaN temperature', { ...valid, temperature: Number.NaN }],
  ])('rejects %s', (_name, body) => {
    const result = parseChatInput(body)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).not.toBe('')
  })
})
