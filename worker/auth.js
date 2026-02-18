import { sign, verify } from 'hono/jwt'

const encoder = new TextEncoder()

async function derive(password, salt) {
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password) {
  const salt = crypto.randomUUID()
  const hash = await derive(password, salt)
  return `${salt}:${hash}`
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = (stored || '').split(':')
  if (!salt || !hash) return false
  const candidate = await derive(password, salt)
  return candidate === hash
}

export async function signToken(payload, secret) {
  return sign(payload, secret)
}

export async function getUserFromRequest(c, requireAuth = true) {
  const header = c.req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const secret = c.env.JWT_SECRET || 'fxrecipe-worker-secret'

  if (!token) {
    if (requireAuth) return c.json({ error: 'Unauthorized' }, 401)
    return null
  }

  try {
    const parsed = await verify(token, secret)
    const user = await c.env.DB.prepare('SELECT id, email, default_diet, preferences, created_at FROM users WHERE id = ?')
      .bind(parsed.id)
      .first()

    if (!user) return requireAuth ? c.json({ error: 'Unauthorized' }, 401) : null
    user.preferences = JSON.parse(user.preferences || '[]')
    return user
  } catch {
    if (requireAuth) return c.json({ error: 'Unauthorized' }, 401)
    return null
  }
}
