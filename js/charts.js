/**
 * Canvas Chart Renderer for Mobile Eco-Tracker
 * Clean, lightweight, crisp high-DPI rendering without external heavy libraries.
 */

/**
 * Render Calorie & Carbon Footprint Trend Bar Chart
 * @param {HTMLCanvasElement} canvas 
 * @param {Array} trendData [{ label: 'Mon', calories: 1400, carbon: 2.1 }]
 * @param {String} mode 'calories' | 'carbon' | 'both'
 */
export function renderTrendChart(canvas, trendData, mode = 'calories') {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Handle Retina / High-DPI screens
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  
  const width = rect.width || 340;
  const height = rect.height || 220;
  
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  // Clear background
  ctx.clearRect(0, 0, width, height);

  if (!trendData || trendData.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available for this period', width / 2, height / 2);
    return;
  }

  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Determine max values for scaling
  const maxCalorie = Math.max(...trendData.map(d => d.calories), 2000);
  const maxCarbon = Math.max(...trendData.map(d => d.carbon), 5.0);

  const primaryColor = mode === 'calories' ? '#059669' : '#10b981'; // Emerald & Mint
  const secondaryColor = mode === 'calories' ? '#34d399' : '#047857';

  // Draw grid lines
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  const gridRows = 4;
  for (let i = 0; i <= gridRows; i++) {
    const y = paddingTop + (chartHeight / gridRows) * i;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    const val = mode === 'calories' 
      ? Math.round(maxCalorie * (1 - i / gridRows))
      : (maxCarbon * (1 - i / gridRows)).toFixed(1);
    ctx.fillText(val, paddingLeft - 8, y + 4);
  }

  // Draw Bars
  const barCount = trendData.length;
  const groupWidth = chartWidth / barCount;
  const barWidth = Math.min(groupWidth * 0.55, 24);

  trendData.forEach((d, idx) => {
    const xCenter = paddingLeft + groupWidth * idx + groupWidth / 2;
    const xLeft = xCenter - barWidth / 2;

    const value = mode === 'calories' ? d.calories : d.carbon;
    const maxVal = mode === 'calories' ? maxCalorie : maxCarbon;
    
    const barHeight = (value / maxVal) * chartHeight;
    const yTop = paddingTop + (chartHeight - barHeight);

    // Rounded top bar
    ctx.fillStyle = primaryColor;
    const radius = Math.min(6, barWidth / 2);

    ctx.beginPath();
    ctx.moveTo(xLeft, paddingTop + chartHeight);
    ctx.lineTo(xLeft, yTop + radius);
    ctx.quadraticCurveTo(xLeft, yTop, xLeft + radius, yTop);
    ctx.lineTo(xLeft + barWidth - radius, yTop);
    ctx.quadraticCurveTo(xLeft + barWidth, yTop, xLeft + barWidth, yTop + radius);
    ctx.lineTo(xLeft + barWidth, paddingTop + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Value label on top of bar
    if (value > 0) {
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      const labelText = mode === 'calories' ? `${Math.round(value)}` : `${value.toFixed(1)}kg`;
      ctx.fillText(labelText, xCenter, yTop - 6);
    }

    // X-axis label
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, xCenter, height - paddingBottom + 20);
  });
}

/**
 * Render Category Footprint Horizontal Bar Breakdown
 */
export function renderCategoryBreakdown(containerEl, categoryData) {
  if (!containerEl) return;
  containerEl.innerHTML = '';

  if (!categoryData || categoryData.length === 0) {
    containerEl.innerHTML = `<div class="empty-chart-msg">No category data recorded yet</div>`;
    return;
  }

  const totalCarbon = categoryData.reduce((sum, c) => sum + c.carbon, 0);

  categoryData.sort((a, b) => b.carbon - a.carbon);

  categoryData.forEach(cat => {
    const percent = totalCarbon > 0 ? ((cat.carbon / totalCarbon) * 100).toFixed(1) : 0;
    
    const itemEl = document.createElement('div');
    itemEl.className = 'cat-breakdown-item';
    itemEl.innerHTML = `
      <div class="cat-item-header">
        <span class="cat-name">
          <span class="cat-dot" style="background-color: ${getCategoryColor(cat.name)};"></span>
          ${cat.name}
        </span>
        <span class="cat-stats">${cat.carbon.toFixed(2)} kg CO₂e (${percent}%)</span>
      </div>
      <div class="cat-bar-bg">
        <div class="cat-bar-fill" style="width: ${percent}%; background-color: ${getCategoryColor(cat.name)};"></div>
      </div>
    `;
    containerEl.appendChild(itemEl);
  });
}

/**
 * Color mapper for food categories
 */
function getCategoryColor(category) {
  const colors = {
    'Rice': '#3b82f6',
    'Dal': '#f59e0b',
    'Paneer': '#ec4899',
    'Vegetable': '#10b981',
    'Bread': '#8b5cf6',
    'South Indian': '#06b6d4',
    'Breakfast': '#f97316',
    'Non-Veg': '#ef4444',
    'Dairy': '#6366f1',
    'Dessert': '#a855f7',
    'Snack': '#14b8a6',
    'Street Food': '#eab308'
  };
  return colors[category] || '#64748b';
}

/**
 * Render Macronutrient Distribution Bar & Summary Cards
 */
export function renderMacroBreakdown(containerEl, macroData) {
  if (!containerEl) return;

  const carbs = Math.round(macroData.carbs || 0);
  const protein = Math.round(macroData.protein || 0);
  const fat = Math.round(macroData.fat || 0);
  const fiber = Math.round(macroData.fiber || 0);

  const totalGrams = (carbs + protein + fat) || 1;
  const carbsPct = ((carbs / totalGrams) * 100).toFixed(0);
  const proteinPct = ((protein / totalGrams) * 100).toFixed(0);
  const fatPct = ((fat / totalGrams) * 100).toFixed(0);

  containerEl.innerHTML = `
    <div class="macro-summary-header">
      <div class="macro-title">Macronutrient Intake</div>
      <div class="macro-total-grams">${totalGrams}g Total Macros</div>
    </div>
    
    <!-- Multi-segment Macro Distribution Bar -->
    <div class="macro-dist-bar">
      <div class="macro-bar-seg bar-carbs" style="width: ${carbsPct}%;" title="Carbs: ${carbs}g (${carbsPct}%)"></div>
      <div class="macro-bar-seg bar-protein" style="width: ${proteinPct}%;" title="Protein: ${protein}g (${proteinPct}%)"></div>
      <div class="macro-bar-seg bar-fat" style="width: ${fatPct}%;" title="Fat: ${fat}g (${fatPct}%)"></div>
    </div>

    <!-- Macro Badges Grid -->
    <div class="macro-badges-grid">
      <div class="macro-badge-item badge-carbs">
        <div class="macro-badge-icon">🌾</div>
        <div class="macro-badge-details">
          <span class="macro-val">${carbs}g</span>
          <span class="macro-name">Carbs (${carbsPct}%)</span>
        </div>
      </div>
      <div class="macro-badge-item badge-protein">
        <div class="macro-badge-icon">🍗</div>
        <div class="macro-badge-details">
          <span class="macro-val">${protein}g</span>
          <span class="macro-name">Protein (${proteinPct}%)</span>
        </div>
      </div>
      <div class="macro-badge-item badge-fat">
        <div class="macro-badge-icon">🥑</div>
        <div class="macro-badge-details">
          <span class="macro-val">${fat}g</span>
          <span class="macro-name">Fat (${fatPct}%)</span>
        </div>
      </div>
      <div class="macro-badge-item badge-fiber">
        <div class="macro-badge-icon">🌿</div>
        <div class="macro-badge-details">
          <span class="macro-val">${fiber}g</span>
          <span class="macro-name">Fiber</span>
        </div>
      </div>
    </div>
  `;
}
