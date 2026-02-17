import jwt from 'jsonwebtoken'
import db from './db.js'

export const JWT_SECRET = process.env.JWT_SECRET || 'fxrecipe-secret'

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
}

export function authRequired(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = db.prepare('SELECT id, email, default_diet, preferences, created_at FROM users WHERE id = ?').get(decoded.id)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    user.preferences = JSON.parse(user.preferences || '[]')
    req.user = user
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
