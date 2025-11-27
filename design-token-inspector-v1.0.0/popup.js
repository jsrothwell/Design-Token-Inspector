let currentTokens = null;

document.addEventListener('DOMContentLoaded', function() {
  extractTokens();

  // Set up event listeners
  document.getElementById('refreshBtn').addEventListener('click', extractTokens);
  document.getElementById('exportJSON').addEventListener('click', exportAsJSON);
  document.getElementById('exportCSS').addEventListener('click', exportAsCSS);
  document.getElementById('copyTokens').addEventListener('click', copyToClipboard);

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      switchTab(this.dataset.tab);
    });
  });

  // Subtab switching
  document.querySelectorAll('.subtab').forEach(subtab => {
    subtab.addEventListener('click', function() {
      switchSubtab(this.dataset.subtab);
    });
  });
});

async function extractTokens() {
  const loading = document.getElementById('loading');
  const results = document.getElementById('results');
  const error = document.getElementById('error');

  loading.style.display = 'block';
  results.style.display = 'none';
  error.style.display = 'none';

  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab.url || activeTab.url.startsWith('about:') ||
        activeTab.url.startsWith('chrome:') || activeTab.url.startsWith('moz-extension:')) {
      throw new Error('Cannot analyze this page');
    }

    const response = await browser.tabs.sendMessage(activeTab.id, { action: 'extractTokens' });
    currentTokens = response;

    loading.style.display = 'none';
    results.style.display = 'block';

    displayTokens(response);
  } catch (err) {
    console.error('Extraction error:', err);
    loading.style.display = 'none';
    error.style.display = 'block';
  }
}

function displayTokens(tokens) {
  // Display colors
  displayColors(tokens.colors.all, 'allColorsList');
  displayColors(tokens.colors.text, 'textColorsList');
  displayColors(tokens.colors.background, 'bgColorsList');
  displayColors(tokens.colors.border, 'borderColorsList');

  // Display typography
  displayTokenList(tokens.typography.fontFamilies, 'fontFamiliesList');
  displayTokenList(tokens.typography.fontSizes, 'fontSizesList');
  displayTokenList(tokens.typography.fontWeights, 'fontWeightsList');
  displayTokenList(tokens.typography.lineHeights, 'lineHeightsList');
  displayTokenList(tokens.typography.letterSpacings, 'letterSpacingsList');

  // Display spacing
  displayTokenList(tokens.spacing.margins, 'marginsList');
  displayTokenList(tokens.spacing.paddings, 'paddingsList');
  displayTokenList(tokens.spacing.gaps, 'gapsList');

  // Display borders
  displayTokenList(tokens.borders.widths, 'borderWidthsList');
  displayTokenList(tokens.borders.radii, 'borderRadiiList');
  displayTokenList(tokens.borders.styles, 'borderStylesList');

  // Display effects
  displayTokenList(tokens.shadows, 'shadowsList');
  displayTokenList(tokens.transitions, 'transitionsList');

  // Display CSS variables
  displayCSSVariables(tokens.cssVariables);

  // Update stats
  document.getElementById('colorCount').textContent = tokens.colors.all.length;
  document.getElementById('fontSizeCount').textContent = tokens.typography.fontSizes.length;
  const spacingCount = tokens.spacing.margins.length +
                       tokens.spacing.paddings.length +
                       tokens.spacing.gaps.length;
  document.getElementById('spacingCount').textContent = spacingCount;
}

function displayColors(colors, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (colors.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    const p = document.createElement('p');
    p.textContent = 'No colors found';
    emptyState.appendChild(p);
    container.appendChild(emptyState);
    return;
  }

  const maxCount = Math.max(...colors.map(c => c.count));

  colors.forEach(color => {
    const colorDiv = document.createElement('div');
    colorDiv.className = 'color-token';
    colorDiv.onclick = () => copyValue(color.value);

    // Create color swatch
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = color.value;

    // Create color value
    const valueDiv = document.createElement('div');
    valueDiv.className = 'color-value';
    valueDiv.textContent = color.value;

    // Create count
    const countDiv = document.createElement('div');
    countDiv.className = 'token-count';
    countDiv.textContent = `${color.count} usage${color.count !== 1 ? 's' : ''}`;

    colorDiv.appendChild(swatch);
    colorDiv.appendChild(valueDiv);
    colorDiv.appendChild(countDiv);
    container.appendChild(colorDiv);
  });
}

function displayTokenList(tokens, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (tokens.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    const p = document.createElement('p');
    p.textContent = 'No tokens found';
    emptyState.appendChild(p);
    container.appendChild(emptyState);
    return;
  }

  const maxCount = Math.max(...tokens.map(t => t.count));

  tokens.forEach(token => {
    const tokenDiv = document.createElement('div');
    tokenDiv.className = 'token-item';
    tokenDiv.onclick = () => copyValue(token.value);

    const percentage = (token.count / maxCount) * 100;

    // Create token value
    const valueDiv = document.createElement('div');
    valueDiv.className = 'token-value';
    valueDiv.textContent = token.value;

    // Create usage container
    const usageDiv = document.createElement('div');
    usageDiv.className = 'token-usage';

    // Create usage count
    const countSpan = document.createElement('span');
    countSpan.className = 'usage-count';
    countSpan.textContent = `${token.count}×`;

    // Create usage bar
    const barDiv = document.createElement('div');
    barDiv.className = 'usage-bar';

    const fillDiv = document.createElement('div');
    fillDiv.className = 'usage-fill';
    fillDiv.style.width = `${percentage}%`;

    barDiv.appendChild(fillDiv);
    usageDiv.appendChild(countSpan);
    usageDiv.appendChild(barDiv);

    tokenDiv.appendChild(valueDiv);
    tokenDiv.appendChild(usageDiv);
    container.appendChild(tokenDiv);
  });
}

function displayCSSVariables(variables) {
  const container = document.getElementById('cssVariablesList');
  container.innerHTML = '';

  const entries = Object.entries(variables);

  if (entries.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    const p = document.createElement('p');
    p.textContent = 'No CSS variables found';
    emptyState.appendChild(p);
    container.appendChild(emptyState);
    return;
  }

  entries.forEach(([name, value]) => {
    const varDiv = document.createElement('div');
    varDiv.className = 'variable-item';
    varDiv.onclick = () => copyValue(`var(${name})`);

    // Create variable name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'variable-name';
    nameDiv.textContent = name;

    // Create variable value
    const valueDiv = document.createElement('div');
    valueDiv.className = 'variable-value';
    valueDiv.textContent = value;

    varDiv.appendChild(nameDiv);
    varDiv.appendChild(valueDiv);
    container.appendChild(varDiv);
  });
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');
}

function switchSubtab(subtabName) {
  const parent = event.target.closest('.tab-panel');

  // Update subtab buttons within this tab
  parent.querySelectorAll('.subtab').forEach(subtab => {
    subtab.classList.remove('active');
  });
  event.target.classList.add('active');

  // Update subtab panels within this tab
  parent.querySelectorAll('.subtab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  parent.querySelector(`#${subtabName}`).classList.add('active');
}

function exportAsJSON() {
  if (!currentTokens) return;

  const dataStr = JSON.stringify(currentTokens, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  browser.downloads.download({
    url: url,
    filename: `design-tokens-${Date.now()}.json`,
    saveAs: true
  });

  showNotification('JSON exported!');
}

function exportAsCSS() {
  if (!currentTokens) return;

  let css = ':root {\n';

  // Export colors
  currentTokens.colors.all.forEach((color, index) => {
    css += `  --color-${index + 1}: ${color.value};\n`;
  });

  // Export spacing
  currentTokens.spacing.margins.forEach((margin, index) => {
    css += `  --spacing-${index + 1}: ${margin.value};\n`;
  });

  // Export font sizes
  currentTokens.typography.fontSizes.forEach((size, index) => {
    css += `  --font-size-${index + 1}: ${size.value};\n`;
  });

  // Export border radius
  currentTokens.borders.radii.forEach((radius, index) => {
    css += `  --radius-${index + 1}: ${radius.value};\n`;
  });

  css += '}\n';

  const dataBlob = new Blob([css], { type: 'text/css' });
  const url = URL.createObjectURL(dataBlob);

  browser.downloads.download({
    url: url,
    filename: `design-tokens-${Date.now()}.css`,
    saveAs: true
  });

  showNotification('CSS exported!');
}

function copyToClipboard() {
  if (!currentTokens) return;

  const text = JSON.stringify(currentTokens, null, 2);

  navigator.clipboard.writeText(text).then(() => {
    showNotification('Copied to clipboard!');
  }).catch(err => {
    console.error('Copy failed:', err);
    showNotification('Copy failed', 'error');
  });
}

function copyValue(value) {
  navigator.clipboard.writeText(value).then(() => {
    showNotification(`Copied: ${value}`);
  });
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = 'copied-notification';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 2000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
