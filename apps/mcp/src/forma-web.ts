import { timingSafeEqual } from 'node:crypto'
import { resolve, sep, extname } from 'node:path'

export type FormaHostedOptions = {
  password?: string
  publicOrigin?: string
  mcpToken?: string
}

function safeMatch(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** The hosted editor is a single shared workspace. Fail closed until secured. */
export function hostedGate(request: Request, options: FormaHostedOptions): Response | null {
  const url = new URL(request.url)
  if (request.method === 'GET' && url.pathname === '/ready') return null
  if (!options.password || options.password.length < 20) {
    return new Response('Forma is not configured', { status: 503 })
  }
  const auth = request.headers.get('authorization') ?? ''
  if (url.pathname === '/mcp') {
    const token = options.mcpToken
    return token && token.length >= 32 && safeMatch(auth, 'Bearer ' + token)
      ? null
      : new Response('Not found', { status: 404 })
  }
  let credentials = ''
  if (auth.startsWith('Basic ') && auth.length < 2048) {
    try { credentials = Buffer.from(auth.slice(6), 'base64').toString('utf8') } catch {}
  }
  if (!safeMatch(credentials, 'team:' + options.password)) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'www-authenticate': 'Basic realm="Cymbient Forma"',
        'cache-control': 'no-store',
      },
    })
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin')
    if (origin && origin !== url.origin && origin !== options.publicOrigin) {
      return new Response('Forbidden origin', { status: 403 })
    }
  }
  if (url.pathname === '/api/agent-install' || url.pathname === '/api/skill-install') {
    return new Response('Unavailable in hosted Forma', { status: 404 })
  }
  return null
}

/** Static SPA serves only files under an explicit compiled client directory. */
export async function serveFormaWeb(request: Request, webDir: string): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 })
  }
  const url = new URL(request.url)
  let pathname = ''
  try { pathname = decodeURIComponent(url.pathname) } catch {
    return new Response('Bad path', { status: 400 })
  }
  if (pathname.includes('\0') || pathname.includes('\\')) return new Response('Bad path', { status: 400 })
  const root = resolve(webDir)
  const requested = resolve(root, '.' + pathname)
  if (requested !== root && !requested.startsWith(root + sep)) {
    return new Response('Not found', { status: 404 })
  }
  let path = requested === root ? resolve(root, 'index.html') : requested
  let file = Bun.file(path)
  if (!(await file.exists())) {
    if (extname(pathname) || !request.headers.get('accept')?.includes('text/html')) {
      return new Response('Not found', { status: 404 })
    }
    path = resolve(root, 'index.html')
    file = Bun.file(path)
  }
  if (!(await file.exists())) return new Response('Forma build unavailable', { status: 503 })
  const headers = new Headers({
    'content-type': file.type || 'application/octet-stream',
    'cache-control': path.endsWith('index.html') ? 'no-store' : 'private, max-age=3600',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-frame-options': 'DENY',
  })
  return new Response(request.method === 'HEAD' ? null : file, { status: 200, headers })
}
