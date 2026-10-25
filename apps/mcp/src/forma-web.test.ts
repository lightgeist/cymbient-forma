import { describe, expect, test } from 'vitest'
import { hostedGate } from './forma-web'

const opts = {
  password: 'forma-test-password-with-many-characters',
  publicOrigin: 'https://forma.aifpd.com',
  mcpToken: 'test-mcp-token-longer-than-thirty-two-characters',
}
const basic = (password: string) => 'Basic ' + Buffer.from('team:' + password).toString('base64')
describe('Forma hosted gate', () => {
  test('fails closed with missing configuration', () => {
    expect(hostedGate(new Request('https://forma.aifpd.com/app'), {})?.status).toBe(503)
  })
  test('protects page, API, and assets', () => {
    for (const path of ['/app', '/api/rpc/design.list', '/assets/a.js', '/forma-source.tar.gz']) {
      expect(hostedGate(new Request('https://forma.aifpd.com' + path), opts)?.status).toBe(401)
    }
    expect(hostedGate(new Request('https://forma.aifpd.com/app', { headers: { authorization: basic(opts.password) } }), opts)).toBeNull()
  })
  test('separates MCP authentication from browser authentication', () => {
    expect(hostedGate(new Request('https://forma.aifpd.com/mcp', { headers: { authorization: basic(opts.password) } }), opts)?.status).toBe(404)
    expect(hostedGate(new Request('https://forma.aifpd.com/mcp', { headers: { authorization: 'Bearer ' + opts.mcpToken } }), opts)).toBeNull()
  })
  test('rejects cross-site mutations and local agent installations', () => {
    expect(hostedGate(new Request('https://forma.aifpd.com/api/rpc/test', {
      method: 'POST', headers: { authorization: basic(opts.password), origin: 'https://evil.invalid' },
    }), opts)?.status).toBe(403)
    expect(hostedGate(new Request('https://forma.aifpd.com/api/agent-install', {
      method: 'POST', headers: { authorization: basic(opts.password) },
    }), opts)?.status).toBe(404)
  })
})
