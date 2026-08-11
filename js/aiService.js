import { getAIApiKey, getUserProfile, getMeals } from './storage.js?v=1.3.1';

/**
 * Call Gemini 1.5/2.0 Flash REST API
 */
async function callGeminiApi(payload) {
  const apiKey = getAIApiKey();
  if (!apiKey) {
    throw new Error('No AI API key configured. Please add your key in the Profile section.');
  }

  // Try active Gemini models in sequence (gemini-1.5-flash, gemini-2.0-flash, gemini-1.5-pro)
  const models = ['gemini-3.6-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }

      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || '';

      if (response.status === 400 || response.status === 403) {
        if (errMsg.includes('API key') || errMsg.includes('unauthorized') || errMsg.includes('API_KEY_INVALID')) {
          throw new Error('Invalid API Key or Unauthorized. Please check your Gemini API key in Profile.');
        }
        // If it's a model-not-found error for this specific model, continue loop to try next model
        lastError = new Error(errMsg || `Model ${model} request failed`);
      } else if (response.status === 429) {
        throw new Error('API Rate limit reached. Please wait a moment and try again.');
      } else {
        lastError = new Error(errMsg || `API Request failed (Status ${response.status})`);
      }
    } catch (err) {
      if (err.message.includes('Invalid API Key') || err.message.includes('No AI API key')) {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to connect to AI Service.');
}

/**
 * Analyze Food Image using Gemini Vision AI
 * @param {string} base64Data Image data base64 string
 * @param {string} mimeType 'image/jpeg' or 'image/png'
 * @returns {Promise<Object>} Food details JSON
 */
export async function analyzeFoodImage(base64Data, mimeType = 'image/jpeg') {
  // Clean base64 prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

  const prompt = `Analyze this food image. Identify the food item and estimate its nutrition metrics per 100g serving.
Return ONLY a valid, raw JSON object (with no markdown backticks, no markdown formatting, no extra text) matching this EXACT schema:
{
  "name": "Food Name",
  "category": "One of: Breakfast, Rice, Dal, Paneer, Vegetable, Bread, South Indian, Non-Veg, Dairy, Dessert, Snack, Street Food, Custom",
  "caloriesPer100g": 250,
  "carbonPer100g": 0.35,
  "carbs": 40.5,
  "protein": 8.2,
  "fat": 5.0,
  "fiber": 3.0,
  "unit": "kg CO2e per 100g"
}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64
            }
          }
        ]
      }
    ]
  };

  const responseText = await callGeminiApi(payload);

  // Clean JSON response
  let cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    const foodObj = JSON.parse(cleanedText);

    // Validate and fill default fallbacks
    return {
      name: foodObj.name || 'Analyzed Food Item',
      category: foodObj.category || 'Custom',
      caloriesPer100g: Number(foodObj.caloriesPer100g) || 200,
      carbonPer100g: Number(foodObj.carbonPer100g) || 0.40,
      carbs: Number(foodObj.carbs) || 30,
      protein: Number(foodObj.protein) || 5,
      fat: Number(foodObj.fat) || 4,
      fiber: Number(foodObj.fiber) || 2,
      unit: foodObj.unit || 'kg CO2e per 100g'
    };
  } catch (err) {
    throw new Error('AI could not parse the food image structure properly. Please try another clearer image.');
  }
}

/**
 * Chat with AI Health & Eco Coach
 * Incorporates User Profile (BMR, TDEE, Goal, Diet, Allergies) and recent logged meals.
 * @param {string} userMessage User's query
 * @param {Array} chatHistory Previous message thread
 * @returns {Promise<string>} AI response text
 */
export async function chatWithAICoach(userMessage, chatHistory = []) {
  const profile = getUserProfile() || {};
  const todayStr = new Date().toISOString().split('T')[0];
  const recentMeals = getMeals(todayStr) || [];

  let mealSummaryText = 'No meals logged today yet.';
  if (recentMeals.length > 0) {
    const totalCal = recentMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
    const totalCO2 = recentMeals.reduce((sum, m) => sum + (m.totalCarbon || 0), 0);
    const itemsList = recentMeals.flatMap(m => m.items.map(i => `${i.name} (${i.quantity || 1} serving)`)).join(', ');

    mealSummaryText = `Today's Logged Meals (${recentMeals.length} meals total): ${itemsList}.
Total Calories Today: ${totalCal} kcal (Goal: ${profile.dailyCalorieGoal || 2000} kcal).
Total CO2 Footprint Today: ${totalCO2.toFixed(2)} kg CO2e (Budget: ${profile.dailyCarbonBudget || 3.5} kg).`;
  }

  const systemContext = `You are the Annam AI Coach — an empathetic, expert Nutritionist and Sustainability Advisor.
Your mission is to help the user achieve their health goals while eating sustainably to minimize carbon footprint.

User Profile Context:
- Name: ${profile.name || 'Friend'}
- Age: ${profile.age || 'Unknown'}, Gender: ${profile.gender || 'Not specified'}
- Height: ${profile.height || '--'} cm, Weight: ${profile.weight || '--'} kg
- Primary Goal: ${profile.goal || 'Stay Healthy'}
- Diet Type: ${profile.dietType || 'Balanced'}
- Activity Level: ${profile.activityLevel || 'Active'}
- Allergies / Restrictions: ${profile.allergies || 'None'}
- Target Daily Calories: ${profile.dailyCalorieGoal || 2000} kcal
- Target Daily CO2 Budget: ${profile.dailyCarbonBudget || 3.5} kg CO2e

Current Meal Log Summary:
${mealSummaryText}

Instruction:
Answer the user's question directly, warmly, and concisely using markdown. Use formatting like bullet points or bold text where appropriate. Keep answers practical, encouraging, and focused on both nutrition and eco-friendliness.`;

  // Build Gemini API message contents
  const contents = [
    {
      role: 'user',
      parts: [{ text: systemContext }]
    },
    {
      role: 'model',
      parts: [{ text: `Hello ${profile.name || 'there'}! 👋 I am your Annam AI Health & Eco Coach. How can I help you optimize your nutrition and carbon budget today?` }]
    }
  ];

  // Append recent chat history
  chatHistory.forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  });

  // Append new user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const payload = { contents };
  return await callGeminiApi(payload);
}
