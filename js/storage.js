import { INITIAL_FOOD_ITEMS } from './foodData.js';

const STORAGE_KEYS = {
  MEALS: 'eco_tracker_meals_v1',
  CUSTOM_FOODS: 'eco_tracker_custom_foods_v1',
  SETTINGS: 'eco_tracker_settings_v1'
};

const DEFAULT_SETTINGS = {
  dailyCalorieGoal: 2000,
  dailyCarbonBudget: 3.5, // kg CO2e per day
  userName: 'Eco Explorer'
};

/**
 * Get all available foods (Initial presets + User custom foods)
 */
export function getAvailableFoods() {
  const customFoodsRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS);
  const customFoods = customFoodsRaw ? JSON.parse(customFoodsRaw) : [];
  return [...INITIAL_FOOD_ITEMS, ...customFoods];
}

/**
 * Save a new custom food item to LocalStorage
 */
export function saveCustomFood(foodItem) {
  const customFoodsRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS);
  const customFoods = customFoodsRaw ? JSON.parse(customFoodsRaw) : [];
  
  const newFood = {
    id: `custom-${Date.now()}`,
    name: foodItem.name.trim(),
    category: foodItem.category || 'Custom',
    calories: Number(foodItem.calories),
    carbonFootprint: Number(foodItem.carbonFootprint),
    unit: foodItem.unit || 'kg CO2e per serving'
  };

  customFoods.push(newFood);
  localStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(customFoods));
  return newFood;
}

/**
 * Delete a custom food item
 */
export function deleteCustomFood(foodId) {
  const customFoodsRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS);
  let customFoods = customFoodsRaw ? JSON.parse(customFoodsRaw) : [];
  customFoods = customFoods.filter(f => f.id !== foodId);
  localStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(customFoods));
}

/**
 * Get all logged meals from LocalStorage
 */
export function getMeals() {
  const mealsRaw = localStorage.getItem(STORAGE_KEYS.MEALS);
  if (!mealsRaw) {
    // Seed initial sample meals so user sees a vibrant dashboard right away!
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
    mealType: mealData.mealType || 'Lunch', // Breakfast, Lunch, Dinner, Snack
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
    customFoods: JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS) || '[]'),
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
    if (data.customFoods && Array.isArray(data.customFoods)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(data.customFoods));
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
 * Seed realistic initial meals for smooth first user experience
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
        { foodId: 'food-34', name: 'Poha', category: 'Breakfast', quantity: 1, caloriesPerServing: 250, carbonPerServing: 0.20, totalCalories: 250, totalCarbon: 0.20, unit: 'kg CO2e per serving' },
        { foodId: 'food-44', name: 'Lassi', category: 'Dairy', quantity: 1, caloriesPerServing: 180, carbonPerServing: 0.72, totalCalories: 180, totalCarbon: 0.72, unit: 'kg CO2e per glass' }
      ],
      totalCalories: 430,
      totalCarbon: 0.92
    },
    {
      id: 'sample-meal-2',
      mealType: 'Lunch',
      timestamp: formatDate(0, 13, 15),
      items: [
        { foodId: 'food-1', name: 'Plain Rice', category: 'Rice', quantity: 1, caloriesPerServing: 205, carbonPerServing: 0.28, totalCalories: 205, totalCarbon: 0.28, unit: 'kg CO2e per serving' },
        { foodId: 'food-7', name: 'Dal Tadka', category: 'Dal', quantity: 1, caloriesPerServing: 220, carbonPerServing: 0.42, totalCalories: 220, totalCarbon: 0.42, unit: 'kg CO2e per serving' },
        { foodId: 'food-21', name: 'Roti', category: 'Bread', quantity: 2, caloriesPerServing: 120, carbonPerServing: 0.10, totalCalories: 240, totalCarbon: 0.20, unit: 'kg CO2e per piece' }
      ],
      totalCalories: 665,
      totalCarbon: 0.90
    },
    {
      id: 'sample-meal-3',
      mealType: 'Dinner',
      timestamp: formatDate(1, 20, 0),
      items: [
        { foodId: 'food-4', name: 'Veg Biryani', category: 'Rice', quantity: 1, caloriesPerServing: 390, carbonPerServing: 0.55, totalCalories: 390, totalCarbon: 0.55, unit: 'kg CO2e per serving' },
        { foodId: 'food-43', name: 'Curd', category: 'Dairy', quantity: 1, caloriesPerServing: 98, carbonPerServing: 0.48, totalCalories: 98, totalCarbon: 0.48, unit: 'kg CO2e per bowl' }
      ],
      totalCalories: 488,
      totalCarbon: 1.03
    },
    {
      id: 'sample-meal-4',
      mealType: 'Lunch',
      timestamp: formatDate(2, 13, 0),
      items: [
        { foodId: 'food-37', name: 'Chicken Curry', category: 'Non-Veg', quantity: 1, caloriesPerServing: 350, carbonPerServing: 2.10, totalCalories: 350, totalCarbon: 2.10, unit: 'kg CO2e per serving' },
        { foodId: 'food-23', name: 'Naan', category: 'Bread', quantity: 2, caloriesPerServing: 260, carbonPerServing: 0.28, totalCalories: 520, totalCarbon: 0.56, unit: 'kg CO2e per piece' }
      ],
      totalCalories: 870,
      totalCarbon: 2.66
    }
  ];
}
