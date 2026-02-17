import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import db from './db.js'
import { authRequired, signToken } from './auth.js'
import { transformWithMockAI } from './mockAi.js'

const app = express()
const PORT = process.env.PORT || 4000
const apiLimiter = new Map()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.use('/api/transform', (req, res, next) => {
  const key = req.ip
  const now = Date.now()
  const row = apiLimiter.get(key) || { count: 0, ts: now }
  if (now - row.ts > 60_000) {
    apiLimiter.set(key, { count: 1, ts: now })
    return next()
  }
  if (row.count >= 30) return res.status(429).json({ error: 'Too many requests' })
  row.count += 1
  apiLimiter.set(key, row)
  return next()
})

const diets = [
  'General Functional Nutrition', 'Anti-Inflammatory', 'Blood Sugar Balance / Glycemic', 'Autoimmune Protocol (AIP)', 'Gut Healing / Low FODMAP',
  'Ketogenic / Low Carb', 'Paleo', 'Carnivore-Adjacent', 'Hormone Balance',
]

const monthKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getUsage(req, userId = null) {
  const key = monthKey()
  if (userId) {
    const found = db.prepare('SELECT count FROM usage_tracking WHERE user_id = ? AND month_key = ?').get(userId, key)
    return found?.count || 0
  }
  const found = db.prepare('SELECT count FROM usage_tracking WHERE ip_address = ? AND month_key = ?').get(req.ip, key)
  return found?.count || 0
}

function incrementUsage(req, userId = null) {
  const key = monthKey()
  if (userId) {
    db.prepare(`INSERT INTO usage_tracking (user_id, month_key, count) VALUES (?, ?, 1)
      ON CONFLICT(user_id, month_key) DO UPDATE SET count = count + 1`).run(userId, key)
    return
  }
  db.prepare(`INSERT INTO usage_tracking (ip_address, month_key, count) VALUES (?, ?, 1)
    ON CONFLICT(ip_address, month_key) DO UPDATE SET count = count + 1`).run(req.ip, key)
}

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, defaultDiet = diets[0] } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  if (!diets.includes(defaultDiet)) return res.status(400).json({ error: 'Invalid diet option' })
  const hash = await bcrypt.hash(password, 10)
  try {
    const info = db.prepare('INSERT INTO users (email, password_hash, default_diet) VALUES (?, ?, ?)').run(email.trim().toLowerCase(), hash, defaultDiet)
    const user = db.prepare('SELECT id, email, default_diet, preferences, created_at FROM users WHERE id = ?').get(info.lastInsertRowid)
    user.preferences = JSON.parse(user.preferences)
    return res.json({ token: signToken(user), user })
  } catch {
    return res.status(400).json({ error: 'Email already in use' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase())
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  return res.json({
    token: signToken(user),
    user: {
      id: user.id, email: user.email, default_diet: user.default_diet, preferences: JSON.parse(user.preferences || '[]'), created_at: user.created_at,
    },
  })
})

app.get('/api/auth/me', authRequired, (req, res) => res.json({ user: req.user }))

app.get('/api/usage', (req, res) => {
  const token = req.headers.authorization
  let userId = null
  if (token?.startsWith('Bearer ')) {
    try {
      const jwt = token.slice(7)
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString())
      userId = payload.id
    } catch {}
  }
  const used = getUsage(req, userId)
  return res.json({ used, limit: 3, remaining: Math.max(0, 3 - used) })
})

app.post('/api/transform', (req, res) => {
  const token = req.headers.authorization
  let userId = null
  if (token?.startsWith('Bearer ')) {
    try {
      const jwt = token.slice(7)
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString())
      userId = payload.id
    } catch {}
  }
  const used = getUsage(req, userId)
  if (used >= 3) return res.status(403).json({ error: 'Monthly limit reached', upgrade: true })

  const input = req.body
  if (!input?.recipe && !input?.description) return res.status(400).json({ error: 'Recipe input required' })
  const transformed = transformWithMockAI(input)
  incrementUsage(req, userId)
  return res.json(transformed)
})

app.post('/api/recipes/save', authRequired, (req, res) => {
  const { recipeName, originalInput, inputMethod, healingDiet, preferences = [], mealType, transformedRecipe, originalName } = req.body
  if (!recipeName || !transformedRecipe) return res.status(400).json({ error: 'Recipe payload missing' })
  const info = db.prepare(`INSERT INTO recipes
    (user_id, recipe_name, original_name, original_input, input_method, transformed_recipe, healing_diet, preferences, meal_type, save_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(
    req.user.id,
    recipeName,
    originalName || recipeName.replace(' | Functional Version', ''),
    originalInput || '',
    inputMethod || 'paste',
    JSON.stringify(transformedRecipe),
    healingDiet || req.user.default_diet,
    JSON.stringify(preferences),
    mealType || 'dinner',
  )
  return res.json({ id: info.lastInsertRowid, message: 'Recipe saved' })
})

app.get('/api/recipes/my', authRequired, (req, res) => {
  const items = db.prepare('SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id)
  return res.json(items.map((r) => ({ ...r, transformed_recipe: JSON.parse(r.transformed_recipe), preferences: JSON.parse(r.preferences || '[]') })))
})

app.put('/api/recipes/:id/favorite', authRequired, (req, res) => {
  const row = db.prepare('SELECT is_favorite FROM recipes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  const next = row.is_favorite ? 0 : 1
  db.prepare('UPDATE recipes SET is_favorite = ? WHERE id = ? AND user_id = ?').run(next, req.params.id, req.user.id)
  return res.json({ isFavorite: !!next })
})

app.delete('/api/recipes/:id', authRequired, (req, res) => {
  db.prepare('DELETE FROM recipes WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id)
  return res.json({ message: 'Deleted' })
})

app.get('/api/recipes/public', (req, res) => {
  const { mealType, healingDiet, preference, sort = 'newest', search = '' } = req.query
  let sql = 'SELECT recipes.*, users.email FROM recipes LEFT JOIN users ON recipes.user_id = users.id WHERE 1=1'
  const args = []
  if (mealType && mealType !== 'all') { sql += ' AND meal_type = ?'; args.push(mealType) }
  if (healingDiet && healingDiet !== 'all') { sql += ' AND healing_diet = ?'; args.push(healingDiet) }
  if (preference && preference !== 'all') { sql += ' AND preferences LIKE ?'; args.push(`%${preference}%`) }
  if (search) { sql += ' AND (recipe_name LIKE ? OR transformed_recipe LIKE ? OR original_name LIKE ?)'; args.push(`%${search}%`, `%${search}%`, `%${search}%`) }

  if (sort === 'most-remixed') sql += ' ORDER BY remix_count DESC, created_at DESC'
  else if (sort === 'most-saved') sql += ' ORDER BY save_count DESC, created_at DESC'
  else sql += ' ORDER BY created_at DESC'

  const items = db.prepare(sql).all(...args)
  return res.json(items.map((r) => ({ ...r, transformed_recipe: JSON.parse(r.transformed_recipe), preferences: JSON.parse(r.preferences || '[]') })))
})

app.get('/api/recipes/:id', (req, res) => {
  const row = db.prepare('SELECT recipes.*, users.email FROM recipes LEFT JOIN users ON recipes.user_id = users.id WHERE recipes.id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Recipe not found' })
  return res.json({ ...row, transformed_recipe: JSON.parse(row.transformed_recipe), preferences: JSON.parse(row.preferences || '[]') })
})

app.post('/api/recipes/:id/remix', (req, res) => {
  db.prepare('UPDATE recipes SET remix_count = remix_count + 1 WHERE id = ?').run(req.params.id)
  db.prepare('INSERT INTO recipe_interactions (recipe_id, action) VALUES (?, ?)').run(req.params.id, 'remix')
  return res.json({ message: 'Remix tracked' })
})

app.put('/api/user/profile', authRequired, (req, res) => {
  const { defaultDiet, preferences = [] } = req.body
  db.prepare('UPDATE users SET default_diet = ?, preferences = ? WHERE id = ?').run(defaultDiet || req.user.default_diet, JSON.stringify(preferences), req.user.id)
  return res.json({ message: 'Profile updated' })
})

app.put('/api/user/password', authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  const ok = await bcrypt.compare(currentPassword || '', user.password_hash)
  if (!ok) return res.status(400).json({ error: 'Current password incorrect' })
  const hash = await bcrypt.hash(newPassword, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id)
  return res.json({ message: 'Password updated' })
})

app.delete('/api/user', authRequired, (req, res) => {
  db.prepare('DELETE FROM recipes WHERE user_id = ?').run(req.user.id)
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id)
  return res.json({ message: 'Account deleted' })
})

app.get('/api/stats/public', (_req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM recipes').get().count
  const featured = db.prepare('SELECT id, recipe_name, healing_diet, meal_type, created_at FROM recipes ORDER BY created_at DESC LIMIT 3').all()
  return res.json({ totalRecipes: total, featured })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  return res.status(500).json({ error: 'Something went wrong' })
})

app.listen(PORT, () => console.log(`FxRecipe API running on ${PORT}`))
