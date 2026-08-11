import { getEcoGrade } from './foodData.js?v=1.3.1';
import { 
  getAvailableFoods, 
  getMeals, 
  saveMeal, 
  deleteMeal, 
  getSettings, 
  saveCustomFood,
  updateFoodItem,
  deleteFoodItem,
  getGroceryItems,
  addGroceryItem,
  toggleGroceryDone,
  deleteGroceryItem,
  clearPurchasedGroceries,
  getUserProfile,
  saveUserProfile,
  exportDataAsJSON, 
  importDataFromJSON,
  getAIApiKey,
  saveAIApiKey,
  removeAIApiKey
} from './storage.js?v=1.3.1';
import { renderTrendChart, renderCategoryBreakdown, renderMacroBreakdown } from './charts.js?v=1.3.1';
import { 
  renderAchievementsSection, 
  evaluateAchievements,
  saveCustomAchievement,
  toggleCustomAchievement,
  deleteCustomAchievement
} from './achievements.js?v=1.3.1';
import { analyzeFoodImage, chatWithAICoach } from './aiService.js?v=1.3.1';

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
  updateAiFeatureVisibility();

  // First time user profile check
  const profile = getUserProfile();
  if (!profile) {
    openProfileSetupModal(true);
  }

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
  document.getElementById('fabAddMeal')?.addEventListener('click', openAddMealDrawer);

  // Date Navigator on Home Dashboard
  document.getElementById('btnPrevDate')?.addEventListener('click', () => {
    state.selectedDate.setDate(state.selectedDate.getDate() - 1);
    renderHomeDashboard();
  });

  document.getElementById('btnNextDate')?.addEventListener('click', () => {
    state.selectedDate.setDate(state.selectedDate.getDate() + 1);
    renderHomeDashboard();
  });

  // Drawer Controls
  document.getElementById('btnCloseDrawer')?.addEventListener('click', closeAddMealDrawer);
  document.getElementById('drawerBackdrop')?.addEventListener('click', (e) => {
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
  document.getElementById('drawerSearchInput')?.addEventListener('input', () => {
    renderDrawerFoodList();
  });

  // Save Meal Action
  document.getElementById('btnSaveMeal')?.addEventListener('click', handleSaveMeal);

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
  document.getElementById('dbSearchInput')?.addEventListener('input', renderDatabaseView);
  document.querySelectorAll('#dbCategoryPills .cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#dbCategoryPills .cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeDbCategory = btn.getAttribute('data-cat');
      renderDatabaseView();
    });
  });

  // Custom Food Modal (Choice between Manual & AI if API key exists)
  document.getElementById('btnOpenAddCustomFood')?.addEventListener('click', () => {
    const hasKey = Boolean(getAIApiKey());
    if (hasKey) {
      document.getElementById('choiceAddFoodModal')?.classList.add('open');
    } else {
      document.getElementById('customFoodModal')?.classList.add('open');
    }
  });

  document.getElementById('btnCloseCustomFoodModal')?.addEventListener('click', () => {
    document.getElementById('customFoodModal')?.classList.remove('open');
  });

  document.getElementById('btnSaveCustomFood')?.addEventListener('click', handleSaveCustomFood);

  // Edit Food Modal
  document.getElementById('btnCloseEditFoodModal')?.addEventListener('click', () => {
    document.getElementById('editFoodModal')?.classList.remove('open');
  });

  document.getElementById('btnSaveEditFood')?.addEventListener('click', handleSaveEditFood);

  // Data Export & Import
  document.getElementById('btnExportData')?.addEventListener('click', handleExportData);
  document.getElementById('btnExportJSON')?.addEventListener('click', handleExportData);

  const importFileInput = document.getElementById('fileImportInput');
  document.getElementById('btnImportJSON')?.addEventListener('click', () => importFileInput?.click());
  importFileInput?.addEventListener('change', handleImportData);

  // Grocery Form Submit & Clear
  const formAddGrocery = document.getElementById('formAddGrocery');
  if (formAddGrocery) {
    formAddGrocery.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('inputGrocName');
      const qtyInput = document.getElementById('inputGrocQty');

      const name = nameInput.value.trim();
      const qty = qtyInput.value.trim();

      if (!name) return;

      addGroceryItem({ name, quantity: qty });
      nameInput.value = '';
      qtyInput.value = '';
      showToast('Grocery item added 🛒');
      renderGroceriesView();
    });
  }

  const btnClearPurchased = document.getElementById('btnClearPurchased');
  if (btnClearPurchased) {
    btnClearPurchased.addEventListener('click', () => {
      clearPurchasedGroceries();
      showToast('Purchased items cleared');
      renderGroceriesView();
    });
  }

  // Profile Modal Selectable Pill Buttons Listener
  document.querySelectorAll('.pill-options-group').forEach(group => {
    group.querySelectorAll('.pill-option').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.pill-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  // Profile Setup Form Submit (fires from Submit button in Step 3)
  const formProfileSetup = document.getElementById('formProfileSetup');
  if (formProfileSetup) {
    formProfileSetup.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('psName').value.trim();
      const age = document.getElementById('psAge').value;
      const height = document.getElementById('psHeight').value;
      const weight = document.getElementById('psWeight').value;

      const gender = document.querySelector('#groupGender .pill-option.active')?.getAttribute('data-val') || 'Female';
      const activityLevel = document.querySelector('#groupActivity .pill-option.active')?.getAttribute('data-val') || 'Lightly Active';
      const goal = document.querySelector('#groupGoal .pill-option.active')?.getAttribute('data-val') || 'Stay Healthy';
      const dietType = document.querySelector('#groupDiet .pill-option.active')?.getAttribute('data-val') || 'Vegetarian';
      const allergies = document.getElementById('psAllergies').value.trim();

      if (!name || !age || !height || !weight) {
        showToast('Please fill in Name, Age, Height, and Weight');
        return;
      }

      saveUserProfile({
        name, age, height, weight, gender, activityLevel, goal, dietType, allergies
      });

      document.getElementById('profileSetupModal').classList.remove('open');
      showToast('Profile Saved! 🌱');
      renderCurrentView();
    });
  }

  // Wizard — Step 1 Next button (validates Step 1 fields)
  document.getElementById('btnWizardNext1')?.addEventListener('click', () => {
    const name = document.getElementById('psName').value.trim();
    const age = document.getElementById('psAge').value;
    const height = document.getElementById('psHeight').value;
    const weight = document.getElementById('psWeight').value;
    if (!name || !age || !height || !weight) {
      showToast('Please fill in Name, Age, Height, and Weight');
      return;
    }
    wizardGotoStep(2);
  });

  // Wizard — Step 2 Back button
  document.getElementById('btnWizardBack2')?.addEventListener('click', () => {
    wizardGotoStep(1);
  });

  // Wizard — Step 2 Next button
  document.getElementById('btnWizardNext2')?.addEventListener('click', () => {
    wizardGotoStep(3);
  });

  // Wizard — Step 3 Back button
  document.getElementById('btnWizardBack3')?.addEventListener('click', () => {
    wizardGotoStep(2);
  });

  // Edit Profile Button
  document.getElementById('btnEditProfile')?.addEventListener('click', () => {
    openProfileSetupModal(false);
  });

  document.getElementById('btnCloseProfileModal')?.addEventListener('click', () => {
    document.getElementById('profileSetupModal').classList.remove('open');
  });

  // Custom Achievement Modal & Handlers
  document.addEventListener('click', (e) => {
    // Open Add Achievement Modal button (rendered in Reports header)
    if (e.target && (e.target.id === 'btnOpenAddAchievement' || e.target.closest('#btnOpenAddAchievement'))) {
      document.getElementById('customAchievementModal').classList.add('open');
    }
    // Delete Custom Achievement
    if (e.target && e.target.closest('.btn-del-custom-ach')) {
      const btn = e.target.closest('.btn-del-custom-ach');
      const id = btn.getAttribute('data-id');
      if (confirm('Delete this custom achievement?')) {
        deleteCustomAchievement(id);
        showToast('Achievement deleted');
        renderAchievementsSection(document.getElementById('achievementsContainer'));
      }
    }
    // Toggle Custom Achievement Status
    if (e.target && e.target.closest('.btn-toggle-custom-ach')) {
      const btn = e.target.closest('.btn-toggle-custom-ach');
      const id = btn.getAttribute('data-id');
      toggleCustomAchievement(id);
      showToast('Achievement status updated!');
      renderAchievementsSection(document.getElementById('achievementsContainer'));
    }
  });

  document.getElementById('btnCloseCustomAchievementModal')?.addEventListener('click', () => {
    document.getElementById('customAchievementModal').classList.remove('open');
  });

  const formCustomAchievement = document.getElementById('formCustomAchievement');
  if (formCustomAchievement) {
    formCustomAchievement.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('caTitle').value.trim();
      const desc = document.getElementById('caDesc').value.trim();
      const icon = document.getElementById('caIcon').value;
      const unlocked = document.getElementById('caUnlocked').checked;

      if (!title) {
        showToast('Please enter an Achievement Title');
        return;
      }

      saveCustomAchievement({ title, desc, icon, unlocked });

      // Reset form
      document.getElementById('caTitle').value = '';
      document.getElementById('caDesc').value = '';

      document.getElementById('customAchievementModal').classList.remove('open');
      showToast('Custom Achievement Added! 🏆');
      renderAchievementsSection(document.getElementById('achievementsContainer'));
    });
  }

  // =========================================================================
  // AI FEATURE LISTENERS
  // =========================================================================

  // Save AI API Key
  document.getElementById('btnSaveAiKey')?.addEventListener('click', () => {
    const key = document.getElementById('inputProfAiKey')?.value.trim();
    if (!key) {
      showToast('Please enter an API Key');
      return;
    }
    saveAIApiKey(key);
    updateAiFeatureVisibility();
    showToast('AI Key Saved! ✨ Features Unlocked!');
  });

  // Remove AI API Key
  document.getElementById('btnRemoveAiKey')?.addEventListener('click', () => {
    removeAIApiKey();
    const input = document.getElementById('inputProfAiKey');
    if (input) input.value = '';
    updateAiFeatureVisibility();
    showToast('AI API Key Removed');
    if (state.currentTab === 'tabAICoach') {
      switchTab('tabHome');
    }
  });

  // Toggle Show/Hide AI Key
  document.getElementById('btnToggleShowAiKey')?.addEventListener('click', () => {
    const input = document.getElementById('inputProfAiKey');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  // Choice Modal Handlers
  document.getElementById('btnChoiceManualFood')?.addEventListener('click', () => {
    document.getElementById('choiceAddFoodModal')?.classList.remove('open');
    document.getElementById('customFoodModal')?.classList.add('open');
  });

  document.getElementById('btnChoiceAiFood')?.addEventListener('click', () => {
    document.getElementById('choiceAddFoodModal')?.classList.remove('open');
    resetAiFoodAnalyzerModal();
    document.getElementById('aiFoodAnalyzerModal')?.classList.add('open');
  });

  document.getElementById('btnCloseChoiceFoodModal')?.addEventListener('click', () => {
    document.getElementById('choiceAddFoodModal')?.classList.remove('open');
  });

  document.getElementById('btnCloseAiFoodModal')?.addEventListener('click', () => {
    document.getElementById('aiFoodAnalyzerModal')?.classList.remove('open');
  });

  // AI Image File Select & Camera Capture
  const handleAiImageSelect = (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;

    pendingAiImageMimeType = file.type || 'image/jpeg';
    const reader = new FileReader();
    reader.onload = (e) => {
      pendingAiImageBase64 = e.target.result;
      const imgPreview = document.getElementById('imgAiFoodPreview');
      const previewWrap = document.getElementById('aiFoodPreviewWrap');
      const btnRun = document.getElementById('btnRunAiAnalysis');

      if (imgPreview) imgPreview.src = pendingAiImageBase64;
      if (previewWrap) previewWrap.style.display = 'block';
      if (btnRun) btnRun.style.display = 'block';
    };
    reader.readAsDataURL(file);
  };

  document.getElementById('inputAiFoodFile')?.addEventListener('change', handleAiImageSelect);
  document.getElementById('inputAiFoodCamera')?.addEventListener('change', handleAiImageSelect);

  // Run AI Food Analysis
  document.getElementById('btnRunAiAnalysis')?.addEventListener('click', async () => {
    if (!pendingAiImageBase64) {
      showToast('Please select or capture an image first');
      return;
    }

    const uploadStep = document.getElementById('aiImageUploadStep');
    const spinner = document.getElementById('aiAnalysisSpinner');
    const resultStep = document.getElementById('aiAnalysisResultStep');

    if (uploadStep) uploadStep.style.display = 'none';
    if (spinner) spinner.style.display = 'block';
    if (resultStep) resultStep.style.display = 'none';

    try {
      const foodObj = await analyzeFoodImage(pendingAiImageBase64, pendingAiImageMimeType);

      if (spinner) spinner.style.display = 'none';
      if (resultStep) resultStep.style.display = 'block';

      // Pre-fill result form
      document.getElementById('aiResName').value = foodObj.name || '';
      document.getElementById('aiResCategory').value = foodObj.category || 'Custom';
      document.getElementById('aiResCalories').value = foodObj.caloriesPer100g || '';
      document.getElementById('aiResCarbon').value = foodObj.carbonPer100g || '';
      document.getElementById('aiResCarbs').value = foodObj.carbs || '';
      document.getElementById('aiResProtein').value = foodObj.protein || '';
      document.getElementById('aiResFat').value = foodObj.fat || '';
      document.getElementById('aiResFiber').value = foodObj.fiber || '';
      document.getElementById('aiResUnit').value = foodObj.unit || 'kg CO2e per 100g';

      showToast('Food analyzed successfully! ✨');
    } catch (err) {
      if (spinner) spinner.style.display = 'none';
      if (uploadStep) uploadStep.style.display = 'block';
      showToast(err.message || 'AI Analysis failed. Please try again.');
    }
  });

  // AI Analyze Again
  document.getElementById('btnAiAnalyzeAgain')?.addEventListener('click', () => {
    resetAiFoodAnalyzerModal();
  });

  // Save AI Food Result Form
  document.getElementById('formSaveAiFood')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('aiResName').value.trim();
    const category = document.getElementById('aiResCategory').value;
    const calories = Number(document.getElementById('aiResCalories').value) || 0;
    const carbon = Number(document.getElementById('aiResCarbon').value) || 0;
    const unit = document.getElementById('aiResUnit').value.trim() || 'kg CO2e per 100g';
    const carbs = Number(document.getElementById('aiResCarbs').value) || 0;
    const protein = Number(document.getElementById('aiResProtein').value) || 0;
    const fat = Number(document.getElementById('aiResFat').value) || 0;
    const fiber = Number(document.getElementById('aiResFiber').value) || 0;

    if (!name || isNaN(calories) || isNaN(carbon)) {
      showToast('Please enter Food Name, Calories, and CO₂ footprint');
      return;
    }

    saveCustomFood({
      name, category, caloriesPer100g: calories, carbonPer100g: carbon,
      unit, carbs, protein, fat, fiber
    });

    state.availableFoods = getAvailableFoods();
    document.getElementById('aiFoodAnalyzerModal')?.classList.remove('open');
    showToast(`Saved "${name}" to Food Directory! 🌱`);
    renderDatabaseView();
    renderDrawerFoodList();
  });

  // Form AI Chat Submit
  document.getElementById('formAiChat')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('inputAiChat');
    const userMsg = input?.value.trim();
    if (!userMsg) return;

    input.value = '';
    appendAiChatMessage('user', userMsg);

    const typing = document.getElementById('aiTypingIndicator');
    if (typing) typing.style.display = 'block';

    try {
      const responseText = await chatWithAICoach(userMsg, aiChatHistory);
      if (typing) typing.style.display = 'none';
      appendAiChatMessage('assistant', responseText);
      aiChatHistory.push({ role: 'user', text: userMsg });
      aiChatHistory.push({ role: 'assistant', text: responseText });
    } catch (err) {
      if (typing) typing.style.display = 'none';
      appendAiChatMessage('assistant', `⚠️ ${err.message || 'Sorry, I could not process your message right now.'}`);
    }
  });

  // Prompt Chips Click Handlers
  document.querySelectorAll('.ai-prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const promptText = chip.getAttribute('data-prompt');
      const input = document.getElementById('inputAiChat');
      if (input && promptText) {
        input.value = promptText;
        document.getElementById('formAiChat')?.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
  });
}

// AI Feature State Variables
let aiChatHistory = [];
let pendingAiImageBase64 = null;
let pendingAiImageMimeType = 'image/jpeg';

/**
 * Update visibility of AI Coach nav items & profile API Key status
 */
function updateAiFeatureVisibility() {
  const apiKey = getAIApiKey();
  const hasKey = Boolean(apiKey);

  // Desktop Nav AI Coach button
  const navBtnAiCoach = document.getElementById('navBtnAiCoach');
  if (navBtnAiCoach) navBtnAiCoach.style.display = hasKey ? 'inline-flex' : 'none';

  // Mobile Bottom Nav AI Coach button
  const mobileNavBtnAiCoach = document.getElementById('mobileNavBtnAiCoach');
  if (mobileNavBtnAiCoach) mobileNavBtnAiCoach.style.display = hasKey ? 'flex' : 'none';

  // Profile View Status Badge & Input Field
  const aiStatusBadge = document.getElementById('aiStatusBadge');
  if (aiStatusBadge) {
    if (hasKey) {
      aiStatusBadge.textContent = '● Active ✨';
      aiStatusBadge.style.background = 'var(--primary-100)';
      aiStatusBadge.style.color = 'var(--primary-700)';
    } else {
      aiStatusBadge.textContent = '○ Inactive (Optional)';
      aiStatusBadge.style.background = '#e2e8f0';
      aiStatusBadge.style.color = '#64748b';
    }
  }

  const inputProfAiKey = document.getElementById('inputProfAiKey');
  if (inputProfAiKey && !inputProfAiKey.value) {
    inputProfAiKey.value = apiKey;
  }
}

function resetAiFoodAnalyzerModal() {
  pendingAiImageBase64 = null;
  const fileInput = document.getElementById('inputAiFoodFile');
  const cameraInput = document.getElementById('inputAiFoodCamera');
  if (fileInput) fileInput.value = '';
  if (cameraInput) cameraInput.value = '';

  const previewWrap = document.getElementById('aiFoodPreviewWrap');
  const btnRun = document.getElementById('btnRunAiAnalysis');
  const uploadStep = document.getElementById('aiImageUploadStep');
  const spinner = document.getElementById('aiAnalysisSpinner');
  const resultStep = document.getElementById('aiAnalysisResultStep');

  if (previewWrap) previewWrap.style.display = 'none';
  if (btnRun) btnRun.style.display = 'none';
  if (uploadStep) uploadStep.style.display = 'block';
  if (spinner) spinner.style.display = 'none';
  if (resultStep) resultStep.style.display = 'none';
}

function appendAiChatMessage(role, text) {
  const container = document.getElementById('aiChatMessages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = `ai-msg-bubble ${role}`;

  const sender = document.createElement('div');
  sender.className = 'msg-sender';
  sender.textContent = role === 'user' ? 'You 👤' : 'Annam AI Coach 🤖';

  const textDiv = document.createElement('div');
  textDiv.className = 'msg-text';
  textDiv.innerHTML = text
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  bubble.appendChild(sender);
  bubble.appendChild(textDiv);
  container.appendChild(bubble);

  container.scrollTop = container.scrollHeight;
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
  if (state.currentTab === 'tabGroceries') renderGroceriesView();
  if (state.currentTab === 'tabProfile') renderProfileView();
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

  document.getElementById('targetCalorieLabel').textContent = `Goal: ${settings.dailyCalorieGoal.toLocaleString()} kcal`;
  document.getElementById('targetCarbonLabel').textContent = `Budget: ${settings.dailyCarbonBudget} kg`;

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

/**
 * Render Grocery Shopping List View
 */
function renderGroceriesView() {
  const items = getGroceryItems();

  const activeItems = items.filter(i => !i.purchased);
  const purchasedItems = items.filter(i => i.purchased);

  // Update summary badges
  const summaryPill = document.getElementById('grocerySummaryPill');
  const activeCount = document.getElementById('activeGrocCount');
  const purchasedCount = document.getElementById('purchasedGrocCount');

  if (summaryPill) summaryPill.textContent = `${activeItems.length} active`;
  if (activeCount) activeCount.textContent = `${activeItems.length} items`;
  if (purchasedCount) purchasedCount.textContent = `${purchasedItems.length} items`;

  const activeContainer = document.getElementById('activeGroceryContainer');
  const purchasedContainer = document.getElementById('purchasedGroceryContainer');

  if (!activeContainer || !purchasedContainer) return;

  activeContainer.innerHTML = '';
  purchasedContainer.innerHTML = '';

  // Render Active Items
  if (activeItems.length === 0) {
    activeContainer.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--text-muted);">
        <div style="font-size: 1.5rem; margin-bottom: 4px;">🎉</div>
        <div style="font-weight: 600; font-size: 0.9rem;">Your shopping list is clear!</div>
        <div style="font-size: 0.75rem; color: var(--text-light); margin-top: 2px;">Add items above to start your list.</div>
      </div>
    `;
  } else {
    activeItems.forEach(item => {
      const card = createGroceryItemCard(item);
      activeContainer.appendChild(card);
    });
  }

  // Render Purchased Items
  if (purchasedItems.length === 0) {
    purchasedContainer.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-light); font-size: 0.8rem;">
        No purchased items yet. Click "Done" on an item when bought.
      </div>
    `;
  } else {
    purchasedItems.forEach(item => {
      const card = createGroceryItemCard(item);
      purchasedContainer.appendChild(card);
    });
  }
}

/**
 * Helper to create a single Grocery Item Card DOM Element
 */
function createGroceryItemCard(item) {
  const card = document.createElement('div');
  card.className = `grocery-item-card ${item.purchased ? 'purchased' : ''}`;

  card.innerHTML = `
    <div class="grocery-item-left">
      <div class="grocery-item-title">${item.name}</div>
      ${item.quantity ? `<span class="grocery-item-qty">${item.quantity}</span>` : ''}
    </div>
    <div class="grocery-item-actions">
      <button class="btn-done-item ${item.purchased ? 'done-active' : ''}" data-id="${item.id}">
        ${item.purchased ? '✓ Purchased' : '✓ Done'}
      </button>
      <button class="food-action-btn delete-btn btn-del-groc" data-id="${item.id}" title="Delete item">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    </div>
  `;

  // Toggle Done Button Listener
  card.querySelector('.btn-done-item').addEventListener('click', () => {
    toggleGroceryDone(item.id);
    showToast(item.purchased ? 'Moved back to shopping list' : 'Moved to Purchased! ✓');
    renderGroceriesView();
  });

  // Delete Button Listener
  card.querySelector('.btn-del-groc').addEventListener('click', () => {
    deleteGroceryItem(item.id);
    showToast('Grocery item deleted');
    renderGroceriesView();
  });

  return card;
}

/**
 * Wizard helper — navigate to a given step (1, 2, or 3)
 * Updates progress bar, step dots, and step title/description.
 */
let _wizardIsFirstTime = false;

function wizardGotoStep(step) {
  // Hide all step contents and reset progress indicators
  document.querySelectorAll('.wizard-step-content').forEach(el => el.classList.remove('active'));

  // Activate the current step content
  const target = document.getElementById(`step${step}Content`);
  if (target) target.classList.add('active');

  // Update progress bar dots and lines
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`wsStep${i}`);
    if (!stepEl) continue;
    const dot = stepEl.querySelector('.step-dot');
    if (i <= step) {
      stepEl.classList.add('active');
      if (dot) dot.textContent = '●';
    } else {
      stepEl.classList.remove('active');
      if (dot) dot.textContent = '○';
    }
  }
  for (let i = 1; i <= 2; i++) {
    const lineEl = document.getElementById(`wsLine${i}`);
    if (!lineEl) continue;
    if (i < step) {
      lineEl.classList.add('active');
    } else {
      lineEl.classList.remove('active');
    }
  }

  // Update title and description per step
  const title = document.getElementById('profModalTitle');
  const desc  = document.getElementById('profModalDesc');
  if (step === 1) {
    if (title) title.textContent = _wizardIsFirstTime ? 'Welcome to Annam 🌱' : 'Edit Profile ✏️';
    if (desc)  desc.textContent  = _wizardIsFirstTime ? "Let's set up your profile." : 'Update your details below.';
  } else if (step === 2) {
    if (title) title.textContent = 'Your Goals 🎯';
    if (desc)  desc.textContent  = 'Choose your health goals, diet type and activity level.';
  } else if (step === 3) {
    if (title) title.textContent = 'Almost Done! 🌱';
    if (desc)  desc.textContent  = 'Any food allergies we should know about?';
  }
}

/**
 * Open Profile Setup Modal and pre-fill if editing
 */
function openProfileSetupModal(isFirstTime = false) {
  _wizardIsFirstTime = isFirstTime;

  const cancelBtn = document.getElementById('btnCloseProfileModal');
  if (isFirstTime) {
    if (cancelBtn) cancelBtn.style.display = 'none';
  } else {
    if (cancelBtn) cancelBtn.style.display = 'block';
  }

  // Pre-fill existing profile values so user doesn't lose data
  const profile = getUserProfile();
  if (profile) {
    document.getElementById('psName').value = profile.name || '';
    document.getElementById('psAge').value = profile.age || '';
    document.getElementById('psHeight').value = profile.height || '';
    document.getElementById('psWeight').value = profile.weight || '';
    document.getElementById('psAllergies').value = profile.allergies || '';

    selectPillOption('#groupGender', profile.gender || 'Female');
    selectPillOption('#groupActivity', profile.activityLevel || 'Lightly Active');
    selectPillOption('#groupGoal', profile.goal || 'Stay Healthy');
    selectPillOption('#groupDiet', profile.dietType || 'Vegetarian');
  }

  // Always start at step 1
  wizardGotoStep(1);

  document.getElementById('profileSetupModal').classList.add('open');
}

function selectPillOption(groupSelector, value) {
  const group = document.querySelector(groupSelector);
  if (!group) return;
  group.querySelectorAll('.pill-option').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-val') === value);
  });
}

/**
 * Render Profile View Screen
 */
function renderProfileView() {
  const profile = getUserProfile();
  if (!profile) return;

  document.getElementById('profDisplayName').textContent = profile.name;
  document.getElementById('profTagDiet').textContent = profile.dietType || 'Vegetarian';
  document.getElementById('profTagActivity').textContent = profile.activityLevel || 'Active';

  document.getElementById('profValAge').textContent = profile.age || '--';
  document.getElementById('profValHeight').textContent = profile.height || '--';
  document.getElementById('profValWeight').textContent = profile.weight || '--';

  document.getElementById('profValBMI').textContent = profile.bmi || '--';
  document.getElementById('profValBMICat').textContent = profile.bmiCategory || 'Normal';

  document.getElementById('profValCalGoal').textContent = `${profile.dailyCalorieGoal ? profile.dailyCalorieGoal.toLocaleString() : 2000} kcal`;
  document.getElementById('profValCarbonBudget').textContent = `${profile.dailyCarbonBudget || 3.5} kg`;

  document.getElementById('profValGender').textContent = profile.gender || 'Other';
  document.getElementById('profValGoal').textContent = profile.goal || 'Stay Healthy';
  document.getElementById('profValActivity').textContent = profile.activityLevel || 'Lightly Active';
  document.getElementById('profValDiet').textContent = profile.dietType || 'Vegetarian';
  document.getElementById('profValAllergies').textContent = profile.allergies && profile.allergies.trim() ? profile.allergies : 'None reported';
}


