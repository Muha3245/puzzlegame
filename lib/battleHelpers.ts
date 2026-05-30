import { CATEGORIES } from '../constants/categories';

const LEVELS_PER_CATEGORY = 8;

export function getRandomBattleLevel(difficulty: string) {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const level = Math.floor(Math.random() * LEVELS_PER_CATEGORY) + 1;
  return {
    categoryId: category.id,
    categoryKey: category.id,
    categoryTitle: category.name,
    difficulty,
    level,
  };
}
