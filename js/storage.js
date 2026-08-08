import { INITIAL_FOOD_ITEMS } from './foodData.js';

const STORAGE_KEYS = {
  MEALS: 'eco_tracker_meals_v1',
  FOODS: 'eco_tracker_all_foods_v2',
  SETTINGS: 'eco_tracker_settings_v1'
};

const DEFAULT_SETTINGS = {
  dailyCalorieGoal: 2000,
  dailyCarbonBudget: 3.5, // kg CO2e per day
  userName: 'Eco Explorer'
};

/**
 * Get all available foods from LocalStorage (or initial defaults)
 */
export function getAvailableFoods() {
  const foodsRaw = localStorage.getItem(STORAGE_KEYS.FOODS);
  if (!foodsRaw) {
    localStorage.setItem(STORAGE_KEYS.FOODS, JSON.stringify(INITIAL_FOOD_ITEMS));
    return INITIAL_FOOD_ITEMS;
  }
  return JSON.parse(foodsRaw);
}

/**
 * Save / Update a Food Item by ID
 */
export function updateFoodItem(foodId, updatedFields) {
  const foods = getAvailableFoods();
  const index = foods.findIndex(f => f.id === foodId);
  
  if (index !== -1) {
    foods[index] = {
      ...foods[index],
      name: updatedFields.name.trim(),
      category: updatedFields.category || foods[index].category,
      calories: Number(updatedFields.calories),
      carbonFootprint: Number(updatedFields.carbonFootprint),
      carbs: Number(updatedFields.carbs || 0),
      protein: Number(updatedFields.protein || 0),
      fat: Number(updatedFields.fat || 0),
      fiber: Number(updatedFields.fiber || 0),
      unit: updatedFields.unit ? updatedFields.unit.trim() : foods[index].unit
    };
    localStorage.setItem(STORAGE_KEYS.FOODS, JSON.stringify(foods));
    return foods[index];
  }
  return null;
}

/**
 * Delete a Food Item by ID
 */
export function deleteFoodItem(foodId) {
  const foods = getAvailableFoods();
  const filtered = foods.filter(f => f.id !== foodId);
  localStorage.setItem(STORAGE_KEYS.FOODS, JSON.stringify(filtered));
  return filtered;
}

/**
 * Save a new custom food item to LocalStorage
 */
export function saveCustomFood(foodItem) {
  const foods = getAvailableFoods();
  
  const newFood = {
    id: `food-${Date.now()}`,
    name: foodItem.name.trim(),
    category: foodItem.category || 'Custom',
    calories: Number(foodItem.calories),
    carbonFootprint: Number(foodItem.carbonFootprint),
    carbs: Number(foodItem.carbs || 0),
    protein: Number(foodItem.protein || 0),
    fat: Number(foodItem.fat || 0),
    fiber: Number(foodItem.fiber || 0),
    unit: foodItem.unit ? foodItem.unit.trim() : 'kg CO2e per serving'
  };

  foods.unshift(newFood);
  localStorage.setItem(STORAGE_KEYS.FOODS, JSON.stringify(foods));
  return newFood;
}

/**
 * Get all logged meals from LocalStorage
 */
export function getMeals() {
  const mealsRaw = localStorage.getItem(STORAGE_KEYS.MEALS);
  if (!mealsRaw) {
    const sampleMeals = seedInitialSampleMeals();
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(sampleMeals));
    return sampleMeals;
  }
  return JSON.parse(mealsRaw);
}

/**
 * Save a new meal
 */
export function saveMeal(mealData) {
  const meals = getMeals();
  const newMeal = {
    id: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    mealType: mealData.mealType || 'Lunch',
    timestamp: mealData.timestamp || new Date().toISOString(),
    items: mealData.items.map(item => ({
      foodId: item.foodId,
      name: item.name,
      category: item.category,
      quantity: Number(item.quantity),
      caloriesPerServing: Number(item.caloriesPerServing),
      carbonPerServing: Number(item.carbonPerServing),
      carbsPerServing: Number(item.carbsPerServing || 0),
      proteinPerServing: Number(item.proteinPerServing || 0),
      fatPerServing: Number(item.fatPerServing || 0),
      fiberPerServing: Number(item.fiberPerServing || 0),
      totalCalories: Number(item.caloriesPerServing) * Number(item.quantity),
      totalCarbon: Number(item.carbonPerServing) * Number(item.quantity),
      totalCarbs: Number(item.carbsPerServing || 0) * Number(item.quantity),
      totalProtein: Number(item.proteinPerServing || 0) * Number(item.quantity),
      totalFat: Number(item.fatPerServing || 0) * Number(item.quantity),
      totalFiber: Number(item.fiberPerServing || 0) * Number(item.quantity),
      unit: item.unit
    })),
    totalCalories: mealData.items.reduce((sum, item) => sum + (Number(item.caloriesPerServing) * Number(item.quantity)), 0),
    totalCarbon: parseFloat(mealData.items.reduce((sum, item) => sum + (Number(item.carbonPerServing) * Number(item.quantity)), 0).toFixed(2)),
    totalCarbs: mealData.items.reduce((sum, item) => sum + (Number(item.carbsPerServing || 0) * Number(item.quantity)), 0),
    totalProtein: mealData.items.reduce((sum, item) => sum + (Number(item.proteinPerServing || 0) * Number(item.quantity)), 0),
    totalFat: mealData.items.reduce((sum, item) => sum + (Number(item.fatPerServing || 0) * Number(item.quantity)), 0),
    totalFiber: mealData.items.reduce((sum, item) => sum + (Number(item.fiberPerServing || 0) * Number(item.quantity)), 0)
  };

  meals.unshift(newMeal);
  localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
  return newMeal;
}

/**
 * Delete a meal by ID
 */
export function deleteMeal(mealId) {
  const meals = getMeals();
  const updatedMeals = meals.filter(m => m.id !== mealId);
  localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(updatedMeals));
}

/**
 * Clear all meal history
 */
export function clearAllMeals() {
  localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify([]));
}

/**
 * Get User Settings
 */
export function getSettings() {
  const settingsRaw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return settingsRaw ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsRaw) } : DEFAULT_SETTINGS;
}

/**
 * Save User Settings
 */
export function saveSettings(newSettings) {
  const current = getSettings();
  const updated = { ...current, ...newSettings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  return updated;
}

/**
 * Export all app data as JSON string
 */
export function exportDataAsJSON() {
  const data = {
    meals: getMeals(),
    foods: getAvailableFoods(),
    settings: getSettings(),
    exportedAt: new Date().toISOString()
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Import JSON data into LocalStorage
 */
export function importDataFromJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data.meals && Array.isArray(data.meals)) {
      localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(data.meals));
    }
    if (data.foods && Array.isArray(data.foods)) {
      localStorage.setItem(STORAGE_KEYS.FOODS, JSON.stringify(data.foods));
    } else if (data.customFoods && Array.isArray(data.customFoods)) {
      localStorage.setItem(STORAGE_KEYS.FOODS, JSON.stringify([...INITIAL_FOOD_ITEMS, ...data.customFoods]));
    }
    if (data.settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Seed realistic initial meals
 */
function seedInitialSampleMeals() {
  const now = new Date();
  
  const formatDate = (daysAgo, hours, minutes) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: 'sample-meal-1',
      mealType: 'Breakfast',
      timestamp: formatDate(0, 8, 30),
      items: [
        { foodId: 'food-34', name: 'Poha', category: 'Breakfast', quantity: 1, caloriesPerServing: 250, carbonPerServing: 0.20, carbsPerServing: 42, proteinPerServing: 4.5, fatPerServing: 7.2, fiberPerServing: 2.6, totalCalories: 250, totalCarbon: 0.20, totalCarbs: 42, totalProtein: 4.5, totalFat: 7.2, totalFiber: 2.6, unit: 'kg CO2e per serving' },
        { foodId: 'food-44', name: 'Lassi', category: 'Dairy', quantity: 1, caloriesPerServing: 180, carbonPerServing: 0.72, carbsPerServing: 24, proteinPerServing: 5.2, fatPerServing: 6.5, fiberPerServing: 0, totalCalories: 180, totalCarbon: 0.72, totalCarbs: 24, totalProtein: 5.2, totalFat: 6.5, totalFiber: 0, unit: 'kg CO2e per glass' }
      ],
      totalCalories: 430,
      totalCarbon: 0.92,
      totalCarbs: 66,
      totalProtein: 9.7,
      totalFat: 13.7,
      totalFiber: 2.6
    },
    {
      id: 'sample-meal-2',
      mealType: 'Lunch',
      timestamp: formatDate(0, 13, 15),
      items: [
        { foodId: 'food-1', name: 'Plain Rice', category: 'Rice', quantity: 1, caloriesPerServing: 205, carbonPerServing: 0.28, carbsPerServing: 45, proteinPerServing: 4.2, fatPerServing: 0.4, fiberPerServing: 0.6, totalCalories: 205, totalCarbon: 0.28, totalCarbs: 45, totalProtein: 4.2, totalFat: 0.4, totalFiber: 0.6, unit: 'kg CO2e per serving' },
        { foodId: 'food-7', name: 'Dal Tadka', category: 'Dal', quantity: 1, caloriesPerServing: 220, carbonPerServing: 0.42, carbsPerServing: 30, proteinPerServing: 12, fatPerServing: 6.5, fiberPerServing: 6.5, totalCalories: 220, totalCarbon: 0.42, totalCarbs: 30, totalProtein: 12, totalFat: 6.5, totalFiber: 6.5, unit: 'kg CO2e per serving' },
        { foodId: 'food-21', name: 'Roti', category: 'Bread', quantity: 2, caloriesPerServing: 120, carbonPerServing: 0.10, carbsPerServing: 22, proteinPerServing: 3.8, fatPerServing: 1.2, fiberPerServing: 2.8, totalCalories: 240, totalCarbon: 0.20, totalCarbs: 44, totalProtein: 7.6, totalFat: 2.4, totalFiber: 5.6, unit: 'kg CO2e per piece' }
      ],
      totalCalories: 665,
      totalCarbon: 0.90,
      totalCarbs: 119,
      totalProtein: 23.8,
      totalFat: 9.3,
      totalFiber: 12.7
    }
  ];
}
