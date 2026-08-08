import { getEcoGrade } from './foodData.js';
import { 
  getAvailableFoods, 
  getMeals, 
  saveMeal, 
  deleteMeal, 
  getSettings, 
  saveCustomFood,
  updateFoodItem,
  deleteFoodItem,
  exportDataAsJSON, 
  importDataFromJSON 
} from './storage.js';
import { renderTrendChart, renderCategoryBreakdown, renderMacroBreakdown } from './charts.js';
import { renderAchievementsSection, evaluateAchievements } from './achievements.js';

// State Management
let state = {
  currentTab: 'tabHome',
  selectedDate: new Date(),
  selectedDrawerItems: {}, // { foodId: { food, quantity } }
  activeDrawerCategory: 'ALL',
  activeDbCategory: 'ALL',
  reportsPeriod: 'daily', // 'daily' | 'weekly'
  availableFoods: []
};

// PWA Install Prompt Deferred Event
let deferredInstallPrompt = null;

// Register Service Worker for Offline PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
      .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
  });
}

// Capture PWA Install Prompt Event
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('btnInstallPWA');
  if (btn) btn.style.display = 'flex';
});

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  state.availableFoods = getAvailableFoods();
  initLucideIcons();
  setupEventListeners();
  setDefaultDateTimeInput();
  renderCurrentView();
});

function initLucideIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Event Listeners Registration
 */
function setupEventListeners() {
  // Navigation Tabs (Mobile Bottom Nav)
  document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId === 'tabAddMealTrigger') {
        openAddMealDrawer();
      } else {
        switchTab(tabId);
      }
    });
  });

  // Navigation Tabs (Desktop Top Nav Header)
  document.querySelectorAll('.desktop-nav-links .desktop-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId) switchTab(tabId);
    });
  });

  document.getElementById('btnDesktopAddMeal')?.addEventListener('click', openAddMealDrawer);

  // PWA Install App Button
  document.getElementById('btnInstallPWA')?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('EcoTracker Installed! 🎉');
      }
      deferredInstallPrompt = null;
      document.getElementById('btnInstallPWA').style.display = 'none';
    }
  });

  // FAB Add Meal Trigger
  document.getElementById('fabAddMeal').addEventListener('click', openAddMealDrawer);

  // Date Navigator on Home Dashboard
  document.getElementById('btnPrevDate').addEventListener('click', () => {
    state.selectedDate.setDate(state.selectedDate.getDate() - 1);
    renderHomeDashboard();
  });

  document.getElementById('btnNextDate').addEventListener('click', () => {
    state.selectedDate.setDate(state.selectedDate.getDate() + 1);
    renderHomeDashboard();
  });

  // Drawer Controls
  document.getElementById('btnCloseDrawer').addEventListener('click', closeAddMealDrawer);
  document.getElementById('drawerBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'drawerBackdrop') closeAddMealDrawer();
  });

  // Drawer Category Pills
  document.querySelectorAll('#drawerCategoryPills .cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#drawerCategoryPills .cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeDrawerCategory = btn.getAttribute('data-cat');
      renderDrawerFoodList();
    });
  });

  // Drawer Search
  document.getElementById('drawerSearchInput').addEventListener('input', () => {
    renderDrawerFoodList();
  });

  // Save Meal Action
  document.getElementById('btnSaveMeal').addEventListener('click', handleSaveMeal);

  // Reports Period Switcher
  document.querySelectorAll('.period-toggle .period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-toggle .period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.reportsPeriod = btn.getAttribute('data-period');
      renderReportsView();
    });
  });

  // Database Tab Search & Category Filter
  document.getElementById('dbSearchInput').addEventListener('input', renderDatabaseView);
  document.querySelectorAll('#dbCategoryPills .cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#dbCategoryPills .cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeDbCategory = btn.getAttribute('data-cat');
      renderDatabaseView();
    });
  });

  // Custom Food Modal
  document.getElementById('btnOpenAddCustomFood').addEventListener('click', () => {
    document.getElementById('customFoodModal').classList.add('open');
  });

  document.getElementById('btnCloseCustomFoodModal').addEventListener('click', () => {
    document.getElementById('customFoodModal').classList.remove('open');
  });

  document.getElementById('btnSaveCustomFood').addEventListener('click', handleSaveCustomFood);

  // Edit Food Modal
  document.getElementById('btnCloseEditFoodModal').addEventListener('click', () => {
    document.getElementById('editFoodModal').classList.remove('open');
  });

  document.getElementById('btnSaveEditFood').addEventListener('click', handleSaveEditFood);

  // Data Export & Import
  document.getElementById('btnExportData').addEventListener('click', handleExportData);
  document.getElementById('btnExportJSON').addEventListener('click', handleExportData);

  const importFileInput = document.getElementById('fileImportInput');
  document.getElementById('btnImportJSON').addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', handleImportData);
}

/**
 * Switch Active View Tab
 */
function switchTab(tabId) {
  state.currentTab = tabId;

  document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.desktop-nav-links .desktop-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.toggle('active', view.id === tabId);
  });

  renderCurrentView();
}

function renderCurrentView() {
  if (state.currentTab === 'tabHome') renderHomeDashboard();
  if (state.currentTab === 'tabReports') renderReportsView();
  if (state.currentTab === 'tabDatabase') renderDatabaseView();
}

/**
 * Render Home Dashboard (Progress Rings, Equivalencies, Meals Timeline)
 */
function renderHomeDashboard() {
  const settings = getSettings();
  const allMeals = getMeals();

  // Filter meals for selected date
  const selYear = state.selectedDate.getFullYear();
  const selMonth = state.selectedDate.getMonth();
  const selDay = state.selectedDate.getDate();

  const todayMeals = allMeals.filter(m => {
    const d = new Date(m.timestamp);
    return d.getFullYear() === selYear && d.getMonth() === selMonth && d.getDate() === selDay;
  });

  // Date Header Label
  const today = new Date();
  const isToday = today.getFullYear() === selYear && today.getMonth() === selMonth && today.getDate() === selDay;
  const dateLabel = isToday ? 'Today' : state.selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  document.getElementById('dateDisplayLabel').textContent = dateLabel;

  // Calculate Totals
  const totalCal = todayMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
  const totalCo2 = todayMeals.reduce((sum, m) => sum + (m.totalCarbon || 0), 0);
  const totalCarbs = todayMeals.reduce((sum, m) => sum + (m.totalCarbs || 0), 0);
  const totalProtein = todayMeals.reduce((sum, m) => sum + (m.totalProtein || 0), 0);
  const totalFat = todayMeals.reduce((sum, m) => sum + (m.totalFat || 0), 0);
  const totalFiber = todayMeals.reduce((sum, m) => sum + (m.totalFiber || 0), 0);

  document.getElementById('valCalorieToday').textContent = Math.round(totalCal);
  document.getElementById('valCarbonToday').textContent = totalCo2.toFixed(1);

  // Render Daily Macronutrient Summary Card
  renderMacroBreakdown(document.getElementById('homeMacroContainer'), {
    carbs: totalCarbs,
    protein: totalProtein,
    fat: totalFat,
    fiber: totalFiber
  });

  // Update Progress Rings
  updateGaugeRing('ringCalorie', totalCal, settings.dailyCalorieGoal);
  updateGaugeRing('ringCarbon', totalCo2, settings.dailyCarbonBudget);

  // Eco Impact Real-World Equivalencies
  // 1 kg CO2e ≈ 4.0 km gasoline car drive, 120 phone charges, 0.04 tree offsets/yr
  const carKm = (totalCo2 * 4.0).toFixed(1);
  const phones = Math.round(totalCo2 * 120);
  const trees = (totalCo2 * 0.04).toFixed(2);

  document.getElementById('equivCarKm').textContent = `${carKm} km`;
  document.getElementById('equivPhones').textContent = phones;
  document.getElementById('equivTrees').textContent = trees;

  const ecoBadge = document.getElementById('ecoScoreBadge');
  if (totalCo2 <= settings.dailyCarbonBudget * 0.8) {
    ecoBadge.textContent = 'Eco Status: Excellent 🌱';
    ecoBadge.style.background = 'rgba(255, 255, 255, 0.3)';
  } else if (totalCo2 <= settings.dailyCarbonBudget) {
    ecoBadge.textContent = 'Eco Status: Good 🌿';
    ecoBadge.style.background = 'rgba(255, 255, 255, 0.2)';
  } else {
    ecoBadge.textContent = 'Eco Status: High Impact ⚠️';
    ecoBadge.style.background = 'rgba(239, 68, 68, 0.4)';
  }

  // Render Meal Timeline Cards
  const container = document.getElementById('mealTimelineContainer');
  document.getElementById('mealCountLabel').textContent = `${todayMeals.length} logged`;
  container.innerHTML = '';

  if (todayMeals.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
        <i data-lucide="utensils-crossed" style="width: 36px; height: 36px; stroke-width: 1.5; color: var(--text-light); margin-bottom: 8px;"></i>
        <div style="font-weight: 600; font-size: 0.95rem;">No meals logged for this date</div>
        <div style="font-size: 0.78rem; color: var(--text-light); margin-top: 4px;">Tap "Add Meal" below to log your food!</div>
      </div>
    `;
    initLucideIcons();
    return;
  }

  todayMeals.forEach(meal => {
    const card = document.createElement('div');
    card.className = 'meal-card';

    const timeStr = new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const mealTypeClass = (meal.mealType || 'lunch').toLowerCase();

    const itemsHtml = meal.items.map(it => `
      <div class="meal-item-row">
        <div class="item-name-qty">${it.name} <span>x${it.quantity}</span></div>
        <div class="item-metrics">
          <span class="cal-text">${it.totalCalories || (it.caloriesPerServing * it.quantity)} kcal</span>
          <span class="co2-text">${(it.totalCarbon || (it.carbonPerServing * it.quantity)).toFixed(2)} kg</span>
        </div>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="meal-card-header">
        <div class="meal-type-tag ${mealTypeClass}">
          <i data-lucide="sun"></i> ${meal.mealType}
        </div>
        <div class="meal-time-str">${timeStr}</div>
      </div>
      <div class="meal-items-list">${itemsHtml}</div>
      <div class="meal-card-footer">
        <div>Total: <span class="cal-text">${Math.round(meal.totalCalories)} kcal</span> • <span class="co2-text">${meal.totalCarbon.toFixed(2)} kg CO₂e</span></div>
        <button class="delete-meal-btn" data-meal-id="${meal.id}" title="Delete meal">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  // Attach delete listeners
  container.querySelectorAll('.delete-meal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mealId = btn.getAttribute('data-meal-id');
      deleteMeal(mealId);
      showToast('Meal Deleted');
      renderHomeDashboard();
    });
  });

  initLucideIcons();
}

/**
 * Helper to update SVG Circle Gauge
 */
function updateGaugeRing(elementId, current, target) {
  const ring = document.getElementById(elementId);
  if (!ring) return;
  const circumference = 2 * Math.PI * 40; // r=40 -> ~251.2
  const ratio = Math.min(current / target, 1.0);
  const offset = circumference - (ratio * circumference);
  ring.style.strokeDashoffset = offset;
}

/**
 * Slide-Up Bottom Sheet Drawer Controls
 */
function openAddMealDrawer() {
  state.selectedDrawerItems = {};
  state.activeDrawerCategory = 'ALL';
  document.getElementById('drawerSearchInput').value = '';
  document.querySelectorAll('#drawerCategoryPills .cat-pill').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-cat') === 'ALL');
  });
  
  setDefaultDateTimeInput();
  updateDrawerLiveTotals();
  renderDrawerFoodList();

  document.getElementById('drawerBackdrop').classList.add('open');
}

function closeAddMealDrawer() {
  document.getElementById('drawerBackdrop').classList.remove('open');
}

function setDefaultDateTimeInput() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('inputMealTime').value = now.toISOString().slice(0, 16);
}

/**
 * Render Food Cards inside Bottom Sheet Drawer
 */
function renderDrawerFoodList() {
  const container = document.getElementById('drawerFoodList');
  const search = document.getElementById('drawerSearchInput').value.toLowerCase().trim();
  const category = state.activeDrawerCategory;

  let filtered = state.availableFoods.filter(food => {
    const matchSearch = food.name.toLowerCase().includes(search) || food.category.toLowerCase().includes(search);
    const matchCategory = category === 'ALL' || food.category.toLowerCase() === category.toLowerCase();
    return matchSearch && matchCategory;
  });

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">No foods match filter</div>`;
    return;
  }

  filtered.forEach(food => {
    const qty = state.selectedDrawerItems[food.id]?.quantity || 0;
    const isSelected = qty > 0;
    const grade = getEcoGrade(food.carbonFootprint);

    const card = document.createElement('div');
    card.className = `food-select-card ${isSelected ? 'selected' : ''}`;

    card.innerHTML = `
      <div class="food-info-left">
        <div class="food-title">${food.name}</div>
        <div class="food-meta">
          <span>${food.calories} kcal</span> • 
          <span>${food.carbonFootprint} kg CO₂</span>
          <span class="eco-badge ${grade.class}">${grade.grade} - ${grade.label}</span>
        </div>
        <div class="food-macros-line">
          <span class="macro-pill-inline">🌾 C: ${food.carbs || 0}g</span>
          <span class="macro-pill-inline">🍗 P: ${food.protein || 0}g</span>
          <span class="macro-pill-inline">🥑 F: ${food.fat || 0}g</span>
          <span class="macro-pill-inline">🌿 Fib: ${food.fiber || 0}g</span>
        </div>
      </div>
      <div class="qty-stepper">
        <button class="step-btn btn-minus" data-food-id="${food.id}">-</button>
        <span class="qty-val">${qty}</span>
        <button class="step-btn btn-plus" data-food-id="${food.id}">+</button>
      </div>
    `;

    // Plus button
    card.querySelector('.btn-plus').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!state.selectedDrawerItems[food.id]) {
        state.selectedDrawerItems[food.id] = { food, quantity: 1 };
      } else {
        state.selectedDrawerItems[food.id].quantity += 1;
      }
      updateDrawerLiveTotals();
      renderDrawerFoodList();
    });

    // Minus button
    card.querySelector('.btn-minus').addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.selectedDrawerItems[food.id]) {
        state.selectedDrawerItems[food.id].quantity -= 1;
        if (state.selectedDrawerItems[food.id].quantity <= 0) {
          delete state.selectedDrawerItems[food.id];
        }
      }
      updateDrawerLiveTotals();
      renderDrawerFoodList();
    });

    container.appendChild(card);
  });
}

/**
 * Update Drawer Header Live Totals
 */
function updateDrawerLiveTotals() {
  let totalCal = 0;
  let totalCo2 = 0;

  Object.values(state.selectedDrawerItems).forEach(item => {
    totalCal += item.food.calories * item.quantity;
    totalCo2 += item.food.carbonFootprint * item.quantity;
  });

  document.getElementById('drawerLiveCalories').textContent = `${Math.round(totalCal)} kcal`;
  document.getElementById('drawerLiveCarbon').textContent = `${totalCo2.toFixed(2)} kg`;
}

/**
 * Handle Save Meal Action
 */
function handleSaveMeal() {
  const selectedKeys = Object.keys(state.selectedDrawerItems);
  if (selectedKeys.length === 0) {
    showToast('Please select at least 1 food item');
    return;
  }

  const mealType = document.getElementById('inputMealType').value;
  const datetimeVal = document.getElementById('inputMealTime').value;

  const items = selectedKeys.map(key => {
    const entry = state.selectedDrawerItems[key];
    return {
      foodId: entry.food.id,
      name: entry.food.name,
      category: entry.food.category,
      quantity: entry.quantity,
      caloriesPerServing: entry.food.calories,
      carbonPerServing: entry.food.carbonFootprint,
      carbsPerServing: entry.food.carbs || 0,
      proteinPerServing: entry.food.protein || 0,
      fatPerServing: entry.food.fat || 0,
      fiberPerServing: entry.food.fiber || 0,
      unit: entry.food.unit
    };
  });

  saveMeal({
    mealType: mealType,
    timestamp: datetimeVal ? new Date(datetimeVal).toISOString() : new Date().toISOString(),
    items: items
  });

  evaluateAchievements();

  closeAddMealDrawer();
  showToast('Meal Logged Successfully! 🌱');

  if (state.currentTab === 'tabHome') {
    renderHomeDashboard();
  } else {
    switchTab('tabHome');
  }
}

/**
 * Render Reports & Analytics View
 */
function renderReportsView() {
  const allMeals = getMeals();
  const period = state.reportsPeriod; // 'daily' | 'weekly'

  const trendData = [];
  const now = new Date();

  if (period === 'daily') {
    // Past 7 Days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);

      const year = d.getFullYear();
      const month = d.getMonth();
      const day = d.getDate();

      const dayMeals = allMeals.filter(m => {
        const md = new Date(m.timestamp);
        return md.getFullYear() === year && md.getMonth() === month && md.getDate() === day;
      });

      const dayCal = dayMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
      const dayCo2 = dayMeals.reduce((sum, m) => sum + (m.totalCarbon || 0), 0);

      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      trendData.push({ label, calories: dayCal, carbon: dayCo2 });
    }
  } else {
    // Past 4 Weeks
    for (let w = 3; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (w * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(23, 59, 59, 999);

      const weekMeals = allMeals.filter(m => {
        const md = new Date(m.timestamp);
        return md >= weekStart && md <= weekEnd;
      });

      const weekCal = weekMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
      const weekCo2 = weekMeals.reduce((sum, m) => sum + (m.totalCarbon || 0), 0);

      const label = w === 0 ? 'This Wk' : `${w}w ago`;
      trendData.push({ label, calories: weekCal, carbon: weekCo2 });
    }
  }

  // Render Canvas Trend Charts
  const calCanvas = document.getElementById('chartCalorieCanvas');
  const co2Canvas = document.getElementById('chartCarbonCanvas');

  renderTrendChart(calCanvas, trendData, 'calories');
  renderTrendChart(co2Canvas, trendData, 'carbon');

  // Compute Averages
  const divisor = trendData.length || 1;
  const avgCal = Math.round(trendData.reduce((sum, d) => sum + d.calories, 0) / divisor);
  const avgCo2 = (trendData.reduce((sum, d) => sum + d.carbon, 0) / divisor).toFixed(1);

  const avgPrefix = period === 'daily' ? 'Daily Avg' : 'Weekly Total Avg';
  document.getElementById('chartCalorieAvg').textContent = `${avgPrefix}: ${avgCal} kcal`;
  document.getElementById('chartCarbonAvg').textContent = `${avgPrefix}: ${avgCo2} kg`;

  // Compute Category Breakdown & Macro Totals
  const catMap = {};
  let totalCarbs = 0, totalProtein = 0, totalFat = 0, totalFiber = 0;

  allMeals.forEach(m => {
    totalCarbs += (m.totalCarbs || 0);
    totalProtein += (m.totalProtein || 0);
    totalFat += (m.totalFat || 0);
    totalFiber += (m.totalFiber || 0);

    m.items.forEach(it => {
      const cat = it.category || 'Other';
      const co2 = it.totalCarbon || (it.carbonPerServing * it.quantity);
      catMap[cat] = (catMap[cat] || 0) + co2;
    });
  });

  const categoryData = Object.keys(catMap).map(cat => ({
    name: cat,
    carbon: catMap[cat]
  }));

  renderCategoryBreakdown(document.getElementById('catBreakdownContainer'), categoryData);

  // Render Macronutrient Intake Bar & Stats
  renderMacroBreakdown(document.getElementById('reportsMacroContainer'), {
    carbs: totalCarbs,
    protein: totalProtein,
    fat: totalFat,
    fiber: totalFiber
  });

  // Render Achievements & Badges
  renderAchievementsSection(document.getElementById('achievementsContainer'));
}

/**
 * Render Food Database View
 */
function renderDatabaseView() {
  const container = document.getElementById('dbFoodListContainer');
  const search = document.getElementById('dbSearchInput').value.toLowerCase().trim();
  const category = state.activeDbCategory;

  let filtered = state.availableFoods.filter(food => {
    const matchSearch = food.name.toLowerCase().includes(search) || food.category.toLowerCase().includes(search);
    const matchCategory = category === 'ALL' || food.category.toLowerCase() === category.toLowerCase();
    return matchSearch && matchCategory;
  });

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);">No foods found matching your search.</div>`;
    return;
  }

  filtered.forEach(food => {
    const grade = getEcoGrade(food.carbonFootprint);
    const card = document.createElement('div');
    card.className = 'food-dir-card';

    card.innerHTML = `
      <!-- Top-right Edit & Delete Actions -->
      <div class="food-dir-actions">
        <button class="food-action-btn edit-btn" data-food-id="${food.id}" title="Edit food">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="food-action-btn delete-btn" data-food-id="${food.id}" title="Delete food">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>

      <!-- Left: All nutritional info -->
      <div class="food-info-left" style="padding-right: 68px;">
        <!-- Name & Category -->
        <div class="food-title" style="margin-bottom: 4px;">
          ${food.name}
          <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500; margin-left: 4px;">${food.category}</span>
        </div>

        <!-- Calories & CO2 row -->
        <div class="food-meta" style="margin-bottom: 4px;">
          <span style="font-weight: 600; color: var(--calorie-color);">${food.calories} kcal</span>
          <span style="color: var(--text-light); margin: 0 4px;">•</span>
          <span style="font-weight: 600; color: var(--carbon-color);">${food.carbonFootprint} kg CO₂e</span>
        </div>

        <!-- Unit description + Eco badge on the same line -->
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="font-size: 0.7rem; color: var(--text-muted);">${food.unit}</span>
          <span class="eco-badge ${grade.class}">${grade.grade} · ${grade.label}</span>
        </div>

        <!-- Macronutrient pills -->
        <div class="food-macros-line">
          <span class="macro-pill-inline" style="color:#3b82f6;">🌾 Carbs: ${food.carbs || 0}g</span>
          <span class="macro-pill-inline" style="color:#ef4444;">🍗 Protein: ${food.protein || 0}g</span>
          <span class="macro-pill-inline" style="color:#f59e0b;">🥑 Fat: ${food.fat || 0}g</span>
          <span class="macro-pill-inline" style="color:#10b981;">🌿 Fiber: ${food.fiber || 0}g</span>
        </div>
      </div>
    `;

    // Edit button
    card.querySelector('.edit-btn').addEventListener('click', () => openEditFoodModal(food));

    // Delete button
    card.querySelector('.delete-btn').addEventListener('click', () => {
      if (confirm(`Delete "${food.name}" from the directory?`)) {
        deleteFoodItem(food.id);
        state.availableFoods = getAvailableFoods();
        showToast(`"${food.name}" deleted ✓`);
        renderDatabaseView();
      }
    });

    container.appendChild(card);
  });
}

/**
 * Open Edit Food Modal and pre-fill values
 */
function openEditFoodModal(food) {
  document.getElementById('efId').value = food.id;
  document.getElementById('efName').value = food.name;
  document.getElementById('efCategory').value = food.category;
  document.getElementById('efCalories').value = food.calories;
  document.getElementById('efCarbon').value = food.carbonFootprint;
  document.getElementById('efUnit').value = food.unit || '';
  document.getElementById('efCarbs').value = food.carbs || 0;
  document.getElementById('efProtein').value = food.protein || 0;
  document.getElementById('efFat').value = food.fat || 0;
  document.getElementById('efFiber').value = food.fiber || 0;
  document.getElementById('editFoodModal').classList.add('open');
}

/**
 * Save edited food item
 */
function handleSaveEditFood() {
  const id = document.getElementById('efId').value;
  const name = document.getElementById('efName').value.trim();
  const calories = document.getElementById('efCalories').value;
  const carbon = document.getElementById('efCarbon').value;

  if (!name || !calories || !carbon) {
    showToast('Please fill in Name, Calories, and CO₂');
    return;
  }

  updateFoodItem(id, {
    name,
    category: document.getElementById('efCategory').value,
    calories,
    carbonFootprint: carbon,
    unit: document.getElementById('efUnit').value,
    carbs: document.getElementById('efCarbs').value || 0,
    protein: document.getElementById('efProtein').value || 0,
    fat: document.getElementById('efFat').value || 0,
    fiber: document.getElementById('efFiber').value || 0
  });

  state.availableFoods = getAvailableFoods();
  document.getElementById('editFoodModal').classList.remove('open');
  showToast('Food item updated! ✅');
  renderDatabaseView();
}

/**
 * Save Custom Food Item
 */
function handleSaveCustomFood() {
  const name = document.getElementById('cfName').value.trim();
  const category = document.getElementById('cfCategory').value;
  const calories = document.getElementById('cfCalories').value;
  const carbon = document.getElementById('cfCarbon').value;
  const unit = document.getElementById('cfUnit').value.trim();

  const carbs = document.getElementById('cfCarbs').value;
  const protein = document.getElementById('cfProtein').value;
  const fat = document.getElementById('cfFat').value;
  const fiber = document.getElementById('cfFiber').value;

  if (!name || !calories || !carbon) {
    showToast('Please fill in Name, Calories, and CO₂');
    return;
  }

  saveCustomFood({
    name,
    category,
    calories,
    carbonFootprint: carbon,
    carbs: carbs || 0,
    protein: protein || 0,
    fat: fat || 0,
    fiber: fiber || 0,
    unit: unit || 'kg CO2e per serving'
  });

  // Reset form inputs
  document.getElementById('cfName').value = '';
  document.getElementById('cfCalories').value = '';
  document.getElementById('cfCarbon').value = '';
  document.getElementById('cfUnit').value = '';
  document.getElementById('cfCarbs').value = '';
  document.getElementById('cfProtein').value = '';
  document.getElementById('cfFat').value = '';
  document.getElementById('cfFiber').value = '';

  state.availableFoods = getAvailableFoods();
  document.getElementById('customFoodModal').classList.remove('open');
  showToast('Custom Food Added! 🍲');
  
  if (state.currentTab === 'tabDatabase') renderDatabaseView();
}

/**
 * Handle Data Export
 */
function handleExportData() {
  const jsonStr = exportDataAsJSON();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `eco-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup JSON Exported 📥');
}

/**
 * Handle Data Import
 */
function handleImportData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const res = importDataFromJSON(evt.target.result);
    if (res.success) {
      showToast('Data Restored Successfully! 🎉');
      state.availableFoods = getAvailableFoods();
      renderCurrentView();
    } else {
      showToast('Error importing file: ' + res.error);
    }
  };
  reader.readAsText(file);
}

/**
 * Toast Notification Popup
 */
function showToast(message) {
  const toast = document.getElementById('toastMsg');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}
