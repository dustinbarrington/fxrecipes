const RULES = [
  { match: /(canola|vegetable|soybean|corn|sunflower|safflower|grapeseed) oil/i, replacement: 'avocado oil', reason: 'Seed oils are commonly inflammatory; avocado oil is a stable functional fat.' },
  { match: /all-purpose flour|wheat flour|\bflour\b/i, replacement: 'almond flour + tapioca starch', reason: 'Removes gluten/refined flour while preserving baking structure.' },
  { match: /white sugar|brown sugar|granulated sugar|powdered sugar|corn syrup|\bsugar\b/i, replacement: 'coconut sugar or monk fruit blend', reason: 'Lowers glycemic impact and removes refined sugar.' },
  { match: /margarine|shortening/i, replacement: 'grass-fed ghee or coconut oil', reason: 'Replaces processed industrial fats.' },
  { match: /artificial (flavor|color|sweetener)/i, replacement: 'whole-food seasoning or pure extract', reason: 'Avoids artificial additives.' },
]

const PREF_RULES = {
  'gluten free': [
    { match: /soy sauce/i, replacement: 'coconut aminos', reason: 'Maintains umami while removing gluten.' },
    { match: /breadcrumbs?|bread crumbs/i, replacement: 'crushed almond flour crackers', reason: 'Replaces gluten-heavy processed crumbs.' },
  ],
  'dairy free': [
    { match: /butter/i, replacement: 'ghee or coconut oil', reason: 'Avoids dairy proteins with similar cooking performance.' },
    { match: /cream|half-and-half|evaporated milk/i, replacement: 'coconut cream', reason: 'Keeps creamy texture without dairy.' },
    { match: /parmesan|cheddar|mozzarella|cheese/i, replacement: 'nutritional yeast or dairy-free cultured cheese', reason: 'Keeps savory profile without dairy.' },
  ],
  'egg free': [
    { match: /\beggs?\b/i, replacement: 'flax egg (1 tbsp flax + 3 tbsp water per egg)', reason: 'Replaces egg binder for egg-free requirement.' },
  ],
  'nut free': [
    { match: /almond flour|almonds?|cashews?|walnuts?|pecans?/i, replacement: 'sunflower seed flour or pumpkin seeds', reason: 'Preserves texture while removing nuts.' },
  ],
  'no nightshades': [
    { match: /tomato|paprika|chili|bell pepper|eggplant|potato/i, replacement: 'carrot/beet/herb-based alternative', reason: 'Removes nightshades per selected protocol.' },
  ],
}

function splitLines(text) {
  return (text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function detectDishIdentity(text = '') {
  const lower = text.toLowerCase()
  if (lower.includes('chicken')) return 'Chicken Recipe'
  if (lower.includes('cookie') || lower.includes('dessert') || lower.includes('cake') || lower.includes('brownie')) return 'Dessert Recipe'
  if (lower.includes('salad')) return 'Salad Recipe'
  if (lower.includes('soup')) return 'Soup Recipe'
  if (lower.includes('pasta')) return 'Pasta Recipe'
  return 'Custom Recipe'
}

function parseRecipeText(text) {
  const lines = splitLines(text)
  if (!lines.length) return { title: 'Custom Recipe', ingredients: [], instructions: [] }

  let title = 'Custom Recipe'
  const first = lines[0]
  if (!/\d|cup|tbsp|tsp|ingredients?|instructions?|directions?/i.test(first)) {
    title = lines.shift()
  }

  const ingHeader = lines.findIndex((l) => /^ingredients?[:]?$/i.test(l))
  const insHeader = lines.findIndex((l) => /^(instructions?|directions?|method)[:]?$/i.test(l))

  let ingredients = []
  let instructions = []

  if (ingHeader >= 0 && insHeader > ingHeader) {
    ingredients = lines.slice(ingHeader + 1, insHeader)
    instructions = lines.slice(insHeader + 1)
  } else if (insHeader >= 0) {
    ingredients = lines.slice(0, insHeader)
    instructions = lines.slice(insHeader + 1)
  } else {
    ingredients = lines.filter((l) => /^[\-•\d]/.test(l) || /(cup|tbsp|tsp|oz|lb|g|ml|clove|slice)/i.test(l))
    instructions = lines.filter((l) => !ingredients.includes(l))
  }

  ingredients = ingredients.map((l) => l.replace(/^[\-•\d\.\)]\s*/, ''))
  instructions = instructions.map((l) => l.replace(/^\d+[\.)]\s*/, ''))

  if (title === 'Custom Recipe') {
    title = detectDishIdentity([text, ...ingredients, ...instructions].join(' '))
  }

  return { title, ingredients, instructions }
}

function parseDescription(description = '', mealType = 'meal') {
  const text = description.trim()
  const identity = detectDishIdentity(text)
  const title = text ? `${mealType[0].toUpperCase()}${mealType.slice(1)} ${identity}` : 'Custom Meal'
  const chunk = (text.match(/(?:with|using)\s+(.+)/i)?.[1] || text)
  const guessed = chunk.split(/,| and /i).map((x) => x.trim()).filter(Boolean).slice(0, 10)

  return {
    title,
    ingredients: guessed.length ? guessed : ['main protein', 'vegetables', 'healthy fat', 'herbs/spices'],
    instructions: [
      'Prep ingredients and season to taste.',
      'Cook using the same technique requested (bake, sauté, roast, or simmer).',
      'Finish with herbs/citrus and serve.',
    ],
  }
}

function collectRules(preferences = [], healingDiet = '') {
  const selected = preferences.map((p) => p.toLowerCase())
  const rules = [...RULES]

  selected.forEach((pref) => {
    if (PREF_RULES[pref]) rules.push(...PREF_RULES[pref])
  })

  const diet = healingDiet.toLowerCase()
  if (diet.includes('autoimmune') || diet.includes('aip')) {
    rules.push(...(PREF_RULES['no nightshades'] || []))
    rules.push({ match: /beans|lentils|chickpeas|rice|quinoa|oats/i, replacement: 'cauliflower rice or compliant root vegetable', reason: 'Aligns with AIP grain/legume exclusions.' })
  }
  if (diet.includes('ketogenic') || diet.includes('low carb')) {
    rules.push({ match: /rice|pasta|potato|bread/i, replacement: 'cauliflower rice, zucchini noodles, or low-carb wrap', reason: 'Reduces carbohydrate load for keto/low-carb.' })
  }
  if (diet.includes('gut') || diet.includes('fodmap')) {
    rules.push({ match: /onion|garlic/i, replacement: 'garlic-infused oil and green onion tops', reason: 'Improves low-FODMAP tolerance.' })
  }

  return rules
}

function transformIngredients(ingredients, rules) {
  const changes = []
  const revised = ingredients.map((ingredient) => {
    let next = ingredient
    let changed = false

    for (const rule of rules) {
      if (rule.match.test(next)) {
        const replacement = next.replace(rule.match, rule.replacement)
        changes.push({ action: 'SWAP', original: ingredient, replacement, reason: rule.reason })
        next = replacement
        changed = true
      }
    }

    if (!changed) {
      changes.push({ action: 'KEEP', original: ingredient, replacement: '', reason: 'Already compliant with selected criteria.' })
    }

    return next
  })

  return { revised, changes }
}

function escapeRegExp(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function updateInstructions(instructions, changes) {
  if (!instructions.length) return ['Cook with the same method as the original recipe, using transformed ingredients.']

  return instructions.map((step) => {
    let next = step
    changes.filter((c) => c.action === 'SWAP').forEach((change) => {
      const source = change.original.split(',')[0].trim()
      const safeSource = escapeRegExp(source)
      if (safeSource && new RegExp(safeSource, 'i').test(next)) {
        next = next.replace(new RegExp(safeSource, 'ig'), change.replacement)
      }
    })
    return next
  })
}

export function transformWithMockAI(payload) {
  const {
    recipe = '',
    description = '',
    inputMethod = 'paste',
    mealType = 'dinner',
    healingDiet = 'General Functional Nutrition',
    preferences = [],
  } = payload

  const parsed = inputMethod === 'describe' || !recipe.trim() ? parseDescription(description, mealType) : parseRecipeText(recipe)
  const rules = collectRules(preferences, healingDiet)
  const { revised, changes } = transformIngredients(parsed.ingredients, rules)
  const revisedInstructions = updateInstructions(parsed.instructions, changes)
  const changed = changes.filter((item) => item.action !== 'KEEP')

  return {
    recipeName: `${parsed.title} | Functional Version`,
    detectedTitle: parsed.title,
    fallbackTriggered: false,
    originalRecipe: {
      name: parsed.title,
      ingredients: parsed.ingredients,
      instructions: parsed.instructions,
    },
    revisedIngredientList: revised,
    transformedIngredients: changes,
    instructions: revisedInstructions,
    prepTime: '15 min',
    cookTime: '25 min',
    servings: '4 servings',
    summary: `Kept the original dish identity and updated ${changed.length} ingredient(s) to match selected functional criteria.`,
    changeExplanation: changed.map((item) => `${item.original} → ${item.replacement}: ${item.reason}`),
    healthBenefits: [`Aligned with ${healingDiet}`, ...(preferences || []).map((p) => `Supports ${p}`)],
    badges: [healingDiet, ...(preferences || [])],
    nutritionComparison: {
      original: { calories: 460, protein: 20, carbs: 42, fat: 24 },
      transformed: { calories: 430, protein: 24, carbs: 30, fat: 25 },
    },
    inflammatoryLoad: changed.length ? 'low' : 'medium',
  }
}
