import { transformWithMockAI } from '../mockAi.js'

function assert(cond, message) {
  if (!cond) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
}

const chickenInput = {
  inputMethod: 'paste',
  recipe: `Weeknight Chicken Skillet\nIngredients:\n1 lb chicken breast\n2 tbsp vegetable oil\n1 tsp paprika\n1 cup rice\nInstructions:\nHeat oil and cook chicken.\nAdd paprika and rice.\nSimmer until done.`,
  healingDiet: 'Anti-Inflammatory',
  preferences: ['Gluten Free', 'Dairy Free'],
}

const dessertInput = {
  inputMethod: 'describe',
  description: 'a chocolate chip dessert with flour and sugar',
  mealType: 'dessert',
  healingDiet: 'Blood Sugar Balance / Glycemic',
  preferences: ['Gluten Free', 'Dairy Free'],
}

const outA = transformWithMockAI(chickenInput)
const outB = transformWithMockAI(dessertInput)

assert(outA.recipeName !== outB.recipeName, 'two very different inputs should produce different recipe names')
assert(outA.recipeName.toLowerCase().includes('chicken'), 'chicken input should retain chicken identity')
assert(outB.recipeName.toLowerCase().includes('dessert'), 'dessert description should retain dessert identity')
assert(!outA.recipeName.toLowerCase().includes('caesar'), 'must not fallback to caesar salad')
assert(!outB.recipeName.toLowerCase().includes('caesar'), 'must not fallback to caesar salad')
assert(outA.changeExplanation.length > 0, 'chicken input should include at least one swap explanation')
assert(outB.changeExplanation.length > 0, 'dessert input should include at least one swap explanation')

console.log('PASS: transform uses input identity and differs by payload')
console.log('A:', outA.recipeName)
console.log('B:', outB.recipeName)
