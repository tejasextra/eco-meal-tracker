import { getMeals, getSettings } from './storage.js?v=1.0.8';

const ACHIEVEMENTS_STORAGE_KEY = 'eco_tracker_achievements_v1';

export const ACHIEVEMENT_DEFINITIONS = [
  {
    id: 'cal-below-avg',
    title: 'Calorie Conscious',
    icon: '🥗',
    desc: 'Daily calories lower than your 7-day average',
    type: 'avg_calorie'
  },
  {
    id: 'co2-below-avg',
    title: 'Carbon Saver',
    icon: '🌿',
    desc: 'Daily CO₂ footprint lower than your 7-day average',
    type: 'avg_carbon'
  },
  {
    id: 'double-champ',
    title: 'Double Champion',
    icon: '🏆',
    desc: 'Eats below BOTH average calories & carbon in one day',
    type: 'double_avg'
  },
  {
    id: 'cal-target-met',
    title: 'Calorie Target Master',
    icon: '🎯',
    desc: 'Stay below your daily calorie goal (2,000 kcal)',
    type: 'target_calorie'
  },
  {
    id: 'co2-budget-met',
    title: 'Eco Guardian',
    icon: '🛡️',
    desc: 'Stay below your daily carbon budget (3.5 kg CO₂)',
    type: 'budget_carbon'
  },
  {
    id: 'green-streak-3',
    title: 'Green Streak',
    icon: '⚡',
    desc: 'Log below-average carbon footprint 3 days in a row',
    type: 'streak_carbon'
  },
  {
    id: 'plant-power-5',
    title: 'Plant Power',
    icon: '🍏',
    desc: 'Log 5 low-CO₂ (Grade A/B) meals',
    type: 'plant_count'
  },
  {
    id: 'first-step',
    title: 'First Step',
    icon: '🌱',
    desc: 'Log your very first meal in EcoTracker',
    type: 'first_meal'
  }
];

/**
 * Get stored achievements state
 */
export function getSavedAchievements() {
  const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

/**
 * Save achievements state
 */
function saveAchievements(unlockedMap) {
  localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(unlockedMap));
}

/**
 * Calculate 7-Day Rolling Averages
 */
export function calculate7DayAverages() {
  const allMeals = getMeals();
  const now = new Date();
  
  let totalCal = 0;
  let totalCo2 = 0;
  let daysWithData = 0;

  for (let i = 1; i <= 7; i++) { // Past 7 full days excluding today
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear(), m = d.getMonth(), date = d.getDate();

    const dayMeals = allMeals.filter(meal => {
      const md = new Date(meal.timestamp);
      return md.getFullYear() === y && md.getMonth() === m && md.getDate() === date;
    });

    if (dayMeals.length > 0) {
      daysWithData++;
      totalCal += dayMeals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0);
      totalCo2 += dayMeals.reduce((sum, meal) => sum + (meal.totalCarbon || 0), 0);
    }
  }

  const avgCal = daysWithData > 0 ? totalCal / daysWithData : 1800; // default fallback if no history
  const avgCo2 = daysWithData > 0 ? totalCo2 / daysWithData : 2.5;

  return { avgCal: Math.round(avgCal), avgCo2: parseFloat(avgCo2.toFixed(2)), daysWithData };
}

/**
 * Evaluate and update achievements status based on meal history
 */
export function evaluateAchievements() {
  const allMeals = getMeals();
  const settings = getSettings();
  const saved = getSavedAchievements();
  const averages = calculate7DayAverages();

  const now = new Date();
  const todayMeals = allMeals.filter(m => {
    const d = new Date(m.timestamp);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });

  const todayCal = todayMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
  const todayCo2 = todayMeals.reduce((sum, m) => sum + (m.totalCarbon || 0), 0);

  const updated = { ...saved };

  // 1. First Step
  if (allMeals.length > 0 && !updated['first-step']) {
    updated['first-step'] = { unlocked: true, unlockedAt: new Date().toISOString() };
  }

  // 2. Calorie Conscious (Today cal < avg cal AND user logged at least 1 meal today)
  if (todayMeals.length > 0 && todayCal < averages.avgCal && !updated['cal-below-avg']) {
    updated['cal-below-avg'] = { unlocked: true, unlockedAt: new Date().toISOString() };
  }

  // 3. Carbon Saver (Today CO2 < avg CO2 AND user logged at least 1 meal today)
  if (todayMeals.length > 0 && todayCo2 < averages.avgCo2 && !updated['co2-below-avg']) {
    updated['co2-below-avg'] = { unlocked: true, unlockedAt: new Date().toISOString() };
  }

  // 4. Double Champion
  if (todayMeals.length > 0 && todayCal < averages.avgCal && todayCo2 < averages.avgCo2 && !updated['double-champ']) {
    updated['double-champ'] = { unlocked: true, unlockedAt: new Date().toISOString() };
  }

  // 5. Calorie Target Master
  if (todayMeals.length > 0 && todayCal <= settings.dailyCalorieGoal && !updated['cal-target-met']) {
    updated['cal-target-met'] = { unlocked: true, unlockedAt: new Date().toISOString() };
  }

  // 6. Eco Guardian
  if (todayMeals.length > 0 && todayCo2 <= settings.dailyCarbonBudget && !updated['co2-budget-met']) {
    updated['co2-budget-met'] = { unlocked: true, unlockedAt: new Date().toISOString() };
  }

  // 7. Green Streak 3 Days
  let streakCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayMeals = allMeals.filter(m => {
      const md = new Date(m.timestamp);
      return md.getFullYear() === d.getFullYear() && md.getMonth() === d.getMonth() && md.getDate() === d.getDate();
    });
    const cCo2 = dayMeals.reduce((sum, m) => sum + (m.totalCarbon || 0), 0);
    if (dayMeals.length > 0 && cCo2 < averages.avgCo2) {
      streakCount++;
    } else if (i > 0) {
      break;
    }
  }
  if (streakCount >= 3 && !updated['green-streak-3']) {
    updated['green-streak-3'] = { unlocked: true, unlockedAt: new Date().toISOString() };
  }

  // 8. Plant Power (5+ Grade A/B low emission meals)
  let lowCo2MealCount = 0;
  allMeals.forEach(meal => {
    const isLowCo2 = meal.items.every(it => (it.carbonPerServing || 0) <= 0.50);
    if (isLowCo2) lowCo2MealCount++;
  });
  if (lowCo2MealCount >= 5 && !updated['plant-power-5']) {
    updated['plant-power-5'] = { unlocked: true, unlockedAt: new Date().toISOString() };
  }

  saveAchievements(updated);
  return { achievements: updated, averages, todayCal, todayCo2, lowCo2MealCount };
}

const CUSTOM_ACHIEVEMENTS_KEY = 'eco_tracker_custom_achievements_v1';

/**
 * Get all custom user-defined achievements
 */
export function getCustomAchievements() {
  const raw = localStorage.getItem(CUSTOM_ACHIEVEMENTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

/**
 * Save a new custom achievement created by user
 */
export function saveCustomAchievement(item) {
  const list = getCustomAchievements();
  const newItem = {
    id: `custom-ach-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: item.title.trim(),
    desc: item.desc ? item.desc.trim() : 'Personal goal',
    icon: item.icon || '⭐',
    unlocked: item.unlocked !== undefined ? Boolean(item.unlocked) : true,
    unlockedAt: item.unlocked ? new Date().toISOString() : null,
    isCustom: true
  };
  list.unshift(newItem);
  localStorage.setItem(CUSTOM_ACHIEVEMENTS_KEY, JSON.stringify(list));
  return newItem;
}

/**
 * Toggle unlocked status of a custom achievement
 */
export function toggleCustomAchievement(id) {
  const list = getCustomAchievements();
  const found = list.find(a => a.id === id);
  if (found) {
    found.unlocked = !found.unlocked;
    found.unlockedAt = found.unlocked ? new Date().toISOString() : null;
    localStorage.setItem(CUSTOM_ACHIEVEMENTS_KEY, JSON.stringify(list));
  }
  return list;
}

/**
 * Delete a custom achievement
 */
export function deleteCustomAchievement(id) {
  const list = getCustomAchievements();
  const updated = list.filter(a => a.id !== id);
  localStorage.setItem(CUSTOM_ACHIEVEMENTS_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Render Achievements List in Reports Tab
 */
export function renderAchievementsSection(containerEl) {
  if (!containerEl) return;

  const { achievements, averages, todayCal, todayCo2 } = evaluateAchievements();
  const customAchievements = getCustomAchievements();

  const stdTotal = ACHIEVEMENT_DEFINITIONS.length;
  const stdUnlocked = Object.values(achievements).filter(a => a.unlocked).length;
  const customUnlocked = customAchievements.filter(a => a.unlocked).length;

  const totalUnlocked = stdUnlocked + customUnlocked;
  const totalTotal = stdTotal + customAchievements.length;

  let html = `
    <div class="achievement-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
      <div>
        <div class="achievement-title" style="display: flex; align-items: center; gap: 8px;">
          <span>🏆 Badges & Achievements</span>
          <span class="badge-count-pill">${totalUnlocked} / ${totalTotal} Unlocked</span>
        </div>
        <div class="avg-stats-sub" style="margin-top: 2px;">
          <span>Your 7-Day Avg: <strong>${averages.avgCal} kcal</strong> • <strong>${averages.avgCo2} kg CO₂</strong></span>
        </div>
      </div>
      <button class="btn-secondary" id="btnOpenAddAchievement" style="padding: 6px 12px; font-size: 0.78rem; font-weight: 700; border-color: var(--primary-500); color: var(--primary-700); background: var(--primary-50);">
        + Add Achievement
      </button>
    </div>
    <div class="achievements-grid">
  `;

  // 1. Render Built-in Achievements
  ACHIEVEMENT_DEFINITIONS.forEach(def => {
    const status = achievements[def.id];
    const isUnlocked = status && status.unlocked;

    let progressStr = '';
    if (def.id === 'cal-below-avg') {
      progressStr = `Today: ${Math.round(todayCal)} vs Avg: ${averages.avgCal} kcal`;
    } else if (def.id === 'co2-below-avg') {
      progressStr = `Today: ${todayCo2.toFixed(1)} vs Avg: ${averages.avgCo2} kg`;
    } else if (def.id === 'double-champ') {
      progressStr = `Double savings check`;
    }

    const unlockDate = isUnlocked ? new Date(status.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

    html += `
      <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon-wrap">${def.icon}</div>
        <div class="achievement-info">
          <div class="achievement-card-title">
            ${def.title}
            ${isUnlocked ? `<span class="unlocked-tag">Unlocked ${unlockDate}</span>` : `<span class="locked-tag">Locked</span>`}
          </div>
          <div class="achievement-card-desc">${def.desc}</div>
          ${progressStr ? `<div class="achievement-progress">${progressStr}</div>` : ''}
        </div>
      </div>
    `;
  });

  // 2. Render User Custom Achievements
  customAchievements.forEach(custom => {
    const isUnlocked = custom.unlocked;
    const unlockDate = isUnlocked && custom.unlockedAt ? new Date(custom.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

    html += `
      <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'} custom-ach-card" data-id="${custom.id}">
        <div class="achievement-icon-wrap">${custom.icon || '⭐'}</div>
        <div class="achievement-info" style="position: relative; padding-right: 28px;">
          <div class="achievement-card-title">
            ${custom.title}
            <span class="custom-badge-pill" style="font-size: 0.65rem; background: var(--primary-100); color: var(--primary-700); padding: 1px 6px; border-radius: 8px; margin-left: 4px;">Custom</span>
            ${isUnlocked ? `<span class="unlocked-tag">Unlocked ${unlockDate}</span>` : `<span class="locked-tag">In Progress</span>`}
          </div>
          <div class="achievement-card-desc">${custom.desc}</div>
          <div style="margin-top: 4px; display: flex; align-items: center; gap: 8px;">
            <button class="btn-toggle-custom-ach text-link-btn" data-id="${custom.id}" style="font-size: 0.72rem;">
              ${isUnlocked ? 'Mark Locked' : '✓ Mark Unlocked'}
            </button>
          </div>
          <button class="food-action-btn delete-btn btn-del-custom-ach" data-id="${custom.id}" title="Delete achievement" style="position: absolute; top: 0; right: 0;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  containerEl.innerHTML = html;
}


