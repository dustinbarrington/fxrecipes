import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ensureSchema, monthKey } from './db.js'
import { getUserFromRequest, hashPassword, signToken, verifyPassword } from './auth.js'
import { transformWithMockAI } from './mockAi.js'

const app = new Hono()

const diets = [
  'General Functional Nutrition',
  'Anti-Inflammatory',
  'Blood Sugar Balance / Glycemic',
  'Autoimmune Protocol (AIP)',
  'Gut Healing / Low FODMAP',
  'Ketogenic / Low Carb',
  'Paleo',
  'Carnivore-Adjacent',
  'Hormone Balance',
]

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use('*', async (c, next) => {
  await ensureSchema(c.env.DB)
  await next()
})

const getClientIp = (c) => c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || '0.0.0.0'


function decodeHtml(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeInstruction(item) {
  if (!item) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'object' && item.text) return item.text
  if (typeof item === 'object' && item.name) return item.name
  return ''
}

function extractRecipeFromHtml(html = '') {
  const scriptMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const match of scriptMatches) {
    try {
      const json = JSON.parse(match[1])
      const blocks = Array.isArray(json) ? json : [json]
      const candidates = []
      const crawl = (node) => {
        if (!node) return
        if (Array.isArray(node)) return node.forEach(crawl)
        if (typeof node === 'object') {
          if (node['@type'] === 'Recipe' || (Array.isArray(node['@type']) && node['@type'].includes('Recipe'))) candidates.push(node)
          Object.values(node).forEach(crawl)
        }
      }
      blocks.forEach(crawl)
      const recipe = candidates[0]
      if (recipe) {
        const ingredients = (recipe.recipeIngredient || []).map((i) => decodeHtml(String(i))).filter(Boolean)
        const instructionsRaw = recipe.recipeInstructions || []
        const instructions = (Array.isArray(instructionsRaw) ? instructionsRaw : [instructionsRaw])
          .map(normalizeInstruction)
          .map((i) => decodeHtml(String(i)))
          .filter(Boolean)
        if (ingredients.length || instructions.length) {
          const name = decodeHtml(String(recipe.name || 'Recipe from URL'))
          const text = [name, 'Ingredients:', ...ingredients, 'Instructions:', ...instructions].join('\n')
          return { name, text, ingredients, instructions }
        }
      }
    } catch {}
  }

  const textFallback = decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
  return { name: 'Recipe from URL', text: textFallback }
}

async function resolveRecipeInput(input) {
  if (input.inputMethod !== 'url' || !input.recipeUrl) return input
  try {
    const url = new URL(input.recipeUrl)
    const res = await fetch(url.toString(), { method: 'GET' })
    if (!res.ok) return input
    const html = await res.text()
    const extracted = extractRecipeFromHtml(html)
    return {
      ...input,
      recipe: extracted.text || input.recipe || '',
      description: extracted.name || input.description || '',
    }
  } catch {
    return input
  }
}


async function getUsage(c, userId = null) {
  const key = monthKey()
  if (userId) {
    const row = await c.env.DB.prepare('SELECT count FROM usage_tracking WHERE user_id = ? AND month_key = ?').bind(userId, key).first()
    return row?.count || 0
  }
  const row = await c.env.DB.prepare('SELECT count FROM usage_tracking WHERE ip_address = ? AND month_key = ?').bind(getClientIp(c), key).first()
  return row?.count || 0
}

async function incrementUsage(c, userId = null) {
  const key = monthKey()
  if (userId) {
    await c.env.DB.prepare(`INSERT INTO usage_tracking (user_id, month_key, count) VALUES (?, ?, 1)
      ON CONFLICT(user_id, month_key) DO UPDATE SET count = count + 1`).bind(userId, key).run()
    return
  }
  await c.env.DB.prepare(`INSERT INTO usage_tracking (ip_address, month_key, count) VALUES (?, ?, 1)
    ON CONFLICT(ip_address, month_key) DO UPDATE SET count = count + 1`).bind(getClientIp(c), key).run()
}

app.post('/api/auth/signup', async (c) => {
  const { email, password, defaultDiet = diets[0] } = await c.req.json()
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400)
  if (!diets.includes(defaultDiet)) return c.json({ error: 'Invalid diet option' }, 400)

  const passwordHash = await hashPassword(password)
  const secret = c.env.JWT_SECRET || 'fxrecipe-worker-secret'

  try {
    const result = await c.env.DB.prepare('INSERT INTO users (email, password_hash, default_diet) VALUES (?, ?, ?)')
      .bind(email.trim().toLowerCase(), passwordHash, defaultDiet)
      .run()

    const user = await c.env.DB.prepare('SELECT id, email, default_diet, preferences, created_at FROM users WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first()

    user.preferences = JSON.parse(user.preferences || '[]')
    const token = await signToken({ id: user.id, email: user.email }, secret)
    return c.json({ token, user })
  } catch {
    return c.json({ error: 'Email already in use' }, 400)
  }
})

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400)

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.trim().toLowerCase()).first()
  if (!user) return c.json({ error: 'Invalid credentials' }, 401)

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return c.json({ error: 'Invalid credentials' }, 401)

  const secret = c.env.JWT_SECRET || 'fxrecipe-worker-secret'
  const token = await signToken({ id: user.id, email: user.email }, secret)
  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      default_diet: user.default_diet,
      preferences: JSON.parse(user.preferences || '[]'),
      created_at: user.created_at,
    },
  })
})

app.get('/api/auth/me', async (c) => {
  const user = await getUserFromRequest(c)
  if (user instanceof Response) return user
  return c.json({ user })
})

app.get('/api/usage', async (c) => {
  const maybeUser = await getUserFromRequest(c, false)
  const used = await getUsage(c, maybeUser?.id)
  return c.json({ used, limit: null, remaining: null, unlimited: true })
})

app.post('/api/transform', async (c) => {
  const maybeUser = await getUserFromRequest(c, false)

  const rawInput = await c.req.json()
  const input = await resolveRecipeInput(rawInput)
  if (!input?.recipe && !input?.description) return c.json({ error: 'Recipe input required' }, 400)

  const transformed = transformWithMockAI(input)
  await incrementUsage(c, maybeUser?.id)
  return c.json(transformed)
})

app.post('/api/recipes/save', async (c) => {
  const user = await getUserFromRequest(c)
  if (user instanceof Response) return user

  const { recipeName, originalInput, inputMethod, healingDiet, preferences = [], mealType, transformedRecipe, originalName } = await c.req.json()
  if (!recipeName || !transformedRecipe) return c.json({ error: 'Recipe payload missing' }, 400)

  const res = await c.env.DB.prepare(`INSERT INTO recipes
    (user_id, recipe_name, original_name, original_input, input_method, transformed_recipe, healing_diet, preferences, meal_type, save_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
    .bind(
      user.id,
      recipeName,
      originalName || recipeName.replace(' | Functional Version', ''),
      originalInput || '',
      inputMethod || 'paste',
      JSON.stringify(transformedRecipe),
      healingDiet || user.default_diet,
      JSON.stringify(preferences),
      mealType || 'dinner',
    )
    .run()

  return c.json({ id: res.meta.last_row_id, message: 'Recipe saved' })
})

app.get('/api/recipes/my', async (c) => {
  const user = await getUserFromRequest(c)
  if (user instanceof Response) return user
  const rows = await c.env.DB.prepare('SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all()
  return c.json((rows.results || []).map((r) => ({ ...r, transformed_recipe: JSON.parse(r.transformed_recipe), preferences: JSON.parse(r.preferences || '[]') })))
})

app.put('/api/recipes/:id/favorite', async (c) => {
  const user = await getUserFromRequest(c)
  if (user instanceof Response) return user
  const id = c.req.param('id')

  const row = await c.env.DB.prepare('SELECT is_favorite FROM recipes WHERE id = ? AND user_id = ?').bind(id, user.id).first()
  if (!row) return c.json({ error: 'Not found' }, 404)

  const next = row.is_favorite ? 0 : 1
  await c.env.DB.prepare('UPDATE recipes SET is_favorite = ? WHERE id = ? AND user_id = ?').bind(next, id, user.id).run()
  return c.json({ isFavorite: !!next })
})

app.delete('/api/recipes/:id', async (c) => {
  const user = await getUserFromRequest(c)
  if (user instanceof Response) return user
  await c.env.DB.prepare('DELETE FROM recipes WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).run()
  return c.json({ message: 'Deleted' })
})

app.get('/api/recipes/public', async (c) => {
  const mealType = c.req.query('mealType')
  const healingDiet = c.req.query('healingDiet')
  const preference = c.req.query('preference')
  const sort = c.req.query('sort') || 'newest'
  const search = c.req.query('search') || ''

  let sql = 'SELECT recipes.*, users.email FROM recipes LEFT JOIN users ON recipes.user_id = users.id WHERE 1=1'
  const args = []
  if (mealType && mealType !== 'all') { sql += ' AND meal_type = ?'; args.push(mealType) }
  if (healingDiet && healingDiet !== 'all') { sql += ' AND healing_diet = ?'; args.push(healingDiet) }
  if (preference && preference !== 'all') { sql += ' AND preferences LIKE ?'; args.push(`%${preference}%`) }
  if (search) { sql += ' AND (recipe_name LIKE ? OR transformed_recipe LIKE ? OR original_name LIKE ?)'; args.push(`%${search}%`, `%${search}%`, `%${search}%`) }

  if (sort === 'most-remixed') sql += ' ORDER BY remix_count DESC, created_at DESC'
  else if (sort === 'most-saved') sql += ' ORDER BY save_count DESC, created_at DESC'
  else sql += ' ORDER BY created_at DESC'

  const rows = await c.env.DB.prepare(sql).bind(...args).all()
  return c.json((rows.results || []).map((r) => ({ ...r, transformed_recipe: JSON.parse(r.transformed_recipe), preferences: JSON.parse(r.preferences || '[]') })))
})

app.get('/api/recipes/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT recipes.*, users.email FROM recipes LEFT JOIN users ON recipes.user_id = users.id WHERE recipes.id = ?').bind(c.req.param('id')).first()
  if (!row) return c.json({ error: 'Recipe not found' }, 404)
  return c.json({ ...row, transformed_recipe: JSON.parse(row.transformed_recipe), preferences: JSON.parse(row.preferences || '[]') })
})

app.post('/api/recipes/:id/remix', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('UPDATE recipes SET remix_count = remix_count + 1 WHERE id = ?').bind(id).run()
  await c.env.DB.prepare('INSERT INTO recipe_interactions (recipe_id, action) VALUES (?, ?)').bind(id, 'remix').run()
  return c.json({ message: 'Remix tracked' })
})

app.put('/api/user/profile', async (c) => {
  const user = await getUserFromRequest(c)
  if (user instanceof Response) return user
  const { defaultDiet, preferences = [] } = await c.req.json()
  await c.env.DB.prepare('UPDATE users SET default_diet = ?, preferences = ? WHERE id = ?').bind(defaultDiet || user.default_diet, JSON.stringify(preferences), user.id).run()
  return c.json({ message: 'Profile updated' })
})

app.put('/api/user/password', async (c) => {
  const user = await getUserFromRequest(c)
  if (user instanceof Response) return user
  const { currentPassword, newPassword } = await c.req.json()
  if (!newPassword) return c.json({ error: 'New password required' }, 400)

  const full = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first()
  const ok = await verifyPassword(currentPassword || '', full.password_hash)
  if (!ok) return c.json({ error: 'Current password incorrect' }, 400)

  const nextHash = await hashPassword(newPassword)
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(nextHash, user.id).run()
  return c.json({ message: 'Password updated' })
})

app.delete('/api/user', async (c) => {
  const user = await getUserFromRequest(c)
  if (user instanceof Response) return user
  await c.env.DB.prepare('DELETE FROM recipes WHERE user_id = ?').bind(user.id).run()
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run()
  return c.json({ message: 'Account deleted' })
})

app.get('/api/stats/public', async (c) => {
  const total = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM recipes').first()
  const featured = await c.env.DB.prepare('SELECT id, recipe_name, healing_diet, meal_type, created_at FROM recipes ORDER BY created_at DESC LIMIT 3').all()
  return c.json({ totalRecipes: total?.count || 0, featured: featured.results || [] })
})

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Something went wrong' }, 500)
})

export default app
