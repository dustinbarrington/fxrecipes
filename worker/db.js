let initialized = false

export async function ensureSchema(db) {
  if (initialized) return
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      default_diet TEXT DEFAULT 'General Functional Nutrition',
      preferences TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      recipe_name TEXT NOT NULL,
      original_name TEXT,
      original_input TEXT,
      input_method TEXT,
      transformed_recipe TEXT NOT NULL,
      healing_diet TEXT,
      preferences TEXT DEFAULT '[]',
      meal_type TEXT,
      is_favorite INTEGER DEFAULT 0,
      remix_count INTEGER DEFAULT 0,
      save_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS recipe_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS usage_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      ip_address TEXT,
      month_key TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      UNIQUE(user_id, month_key),
      UNIQUE(ip_address, month_key)
    )`,
  ]

  for (const statement of statements) {
    await db.prepare(statement).run()
  }
  initialized = true
}

export const monthKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
