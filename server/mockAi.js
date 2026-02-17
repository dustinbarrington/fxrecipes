import { mockTransformations } from '../src/data/mockTransformations.js'

export function transformWithMockAI(payload) {
  const { recipe = '', mealType = 'dinner', healingDiet = '' } = payload
  const chooseCookies = healingDiet.toLowerCase().includes('blood') || recipe.toLowerCase().includes('cookie') || mealType === 'dessert'
  return chooseCookies ? mockTransformations.cookies : mockTransformations.caesar
}
