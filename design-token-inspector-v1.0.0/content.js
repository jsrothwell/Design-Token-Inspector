// Design Token Inspector - Content Script
// Extracts design tokens from any webpage

(function() {
  'use strict';

  class DesignTokenExtractor {
    constructor() {
      this.tokens = {
        colors: {
          all: new Map(),
          text: new Map(),
          background: new Map(),
          border: new Map()
        },
        typography: {
          fontFamilies: new Map(),
          fontSizes: new Map(),
          fontWeights: new Map(),
          lineHeights: new Map(),
          letterSpacings: new Map()
        },
        spacing: {
          margins: new Map(),
          paddings: new Map(),
          gaps: new Map()
        },
        borders: {
          widths: new Map(),
          radii: new Map(),
          styles: new Map()
        },
        shadows: new Map(),
        transitions: new Map()
      };
      this.processedElements = new Set();
    }

    extract() {
      this.extractFromAllElements();
      this.extractFromComputedStyles();
      this.extractFromCSSVariables();
      
      return this.formatResults();
    }

    extractFromAllElements() {
      const elements = document.querySelectorAll('*');
      
      elements.forEach(element => {
        if (this.processedElements.has(element)) return;
        this.processedElements.add(element);
        
        const computed = window.getComputedStyle(element);
        
        // Extract colors
        this.extractColor(computed.color, 'text');
        this.extractColor(computed.backgroundColor, 'background');
        this.extractColor(computed.borderColor, 'border');
        this.extractColor(computed.borderTopColor, 'border');
        this.extractColor(computed.borderRightColor, 'border');
        this.extractColor(computed.borderBottomColor, 'border');
        this.extractColor(computed.borderLeftColor, 'border');
        
        // Extract typography
        this.extractTypography(computed);
        
        // Extract spacing
        this.extractSpacing(computed);
        
        // Extract borders
        this.extractBorders(computed);
        
        // Extract shadows
        if (computed.boxShadow && computed.boxShadow !== 'none') {
          this.addToken(this.tokens.shadows, computed.boxShadow);
        }
        if (computed.textShadow && computed.textShadow !== 'none') {
          this.addToken(this.tokens.shadows, computed.textShadow);
        }
        
        // Extract transitions
        if (computed.transition && computed.transition !== 'all 0s ease 0s') {
          this.addToken(this.tokens.transitions, computed.transition);
        }
      });
    }

    extractColor(colorValue, type) {
      if (!colorValue || colorValue === 'rgba(0, 0, 0, 0)' || colorValue === 'transparent') {
        return;
      }
      
      const normalized = this.normalizeColor(colorValue);
      if (normalized) {
        this.addToken(this.tokens.colors[type], normalized);
        this.addToken(this.tokens.colors.all, normalized);
      }
    }

    normalizeColor(color) {
      if (!color) return null;
      
      // Convert to RGB for consistency
      const temp = document.createElement('div');
      temp.style.color = color;
      document.body.appendChild(temp);
      const computed = window.getComputedStyle(temp).color;
      document.body.removeChild(temp);
      
      // Convert rgb/rgba to hex for display
      const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const a = match[4] ? parseFloat(match[4]) : 1;
        
        if (a < 1) {
          return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
        
        const toHex = (n) => {
          const hex = n.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      }
      
      return color;
    }

    extractTypography(computed) {
      // Font families
      if (computed.fontFamily) {
        this.addToken(this.tokens.typography.fontFamilies, computed.fontFamily);
      }
      
      // Font sizes
      if (computed.fontSize) {
        const size = this.normalizeUnit(computed.fontSize);
        if (size) this.addToken(this.tokens.typography.fontSizes, size);
      }
      
      // Font weights
      if (computed.fontWeight) {
        this.addToken(this.tokens.typography.fontWeights, computed.fontWeight);
      }
      
      // Line heights
      if (computed.lineHeight && computed.lineHeight !== 'normal') {
        const lh = this.normalizeUnit(computed.lineHeight);
        if (lh) this.addToken(this.tokens.typography.lineHeights, lh);
      }
      
      // Letter spacing
      if (computed.letterSpacing && computed.letterSpacing !== 'normal') {
        const ls = this.normalizeUnit(computed.letterSpacing);
        if (ls) this.addToken(this.tokens.typography.letterSpacings, ls);
      }
    }

    extractSpacing(computed) {
      // Margins
      ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].forEach(prop => {
        const value = this.normalizeUnit(computed[prop]);
        if (value && value !== '0px') {
          this.addToken(this.tokens.spacing.margins, value);
        }
      });
      
      // Paddings
      ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(prop => {
        const value = this.normalizeUnit(computed[prop]);
        if (value && value !== '0px') {
          this.addToken(this.tokens.spacing.paddings, value);
        }
      });
      
      // Gap (for flexbox/grid)
      if (computed.gap && computed.gap !== 'normal' && computed.gap !== '0px') {
        const value = this.normalizeUnit(computed.gap);
        if (value) this.addToken(this.tokens.spacing.gaps, value);
      }
    }

    extractBorders(computed) {
      // Border widths
      ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'].forEach(prop => {
        const value = this.normalizeUnit(computed[prop]);
        if (value && value !== '0px') {
          this.addToken(this.tokens.borders.widths, value);
        }
      });
      
      // Border radius
      ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].forEach(prop => {
        const value = this.normalizeUnit(computed[prop]);
        if (value && value !== '0px') {
          this.addToken(this.tokens.borders.radii, value);
        }
      });
      
      // Border styles
      ['borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle'].forEach(prop => {
        const value = computed[prop];
        if (value && value !== 'none') {
          this.addToken(this.tokens.borders.styles, value);
        }
      });
    }

    extractFromComputedStyles() {
      // This is already handled in extractFromAllElements
    }

    extractFromCSSVariables() {
      const root = document.documentElement;
      const computed = window.getComputedStyle(root);
      
      // Get all CSS variables from :root
      const variables = Array.from(computed).filter(prop => prop.startsWith('--'));
      
      this.cssVariables = {};
      variables.forEach(variable => {
        const value = computed.getPropertyValue(variable).trim();
        if (value) {
          this.cssVariables[variable] = value;
        }
      });
    }

    normalizeUnit(value) {
      if (!value || value === 'none' || value === 'auto') return null;
      
      // Keep as is, just clean up
      return value.trim();
    }

    addToken(map, value) {
      if (!value) return;
      
      const count = map.get(value) || 0;
      map.set(value, count + 1);
    }

    formatResults() {
      const formatMap = (map) => {
        return Array.from(map.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count);
      };

      return {
        colors: {
          all: formatMap(this.tokens.colors.all),
          text: formatMap(this.tokens.colors.text),
          background: formatMap(this.tokens.colors.background),
          border: formatMap(this.tokens.colors.border)
        },
        typography: {
          fontFamilies: formatMap(this.tokens.typography.fontFamilies),
          fontSizes: formatMap(this.tokens.typography.fontSizes),
          fontWeights: formatMap(this.tokens.typography.fontWeights),
          lineHeights: formatMap(this.tokens.typography.lineHeights),
          letterSpacings: formatMap(this.tokens.typography.letterSpacings)
        },
        spacing: {
          margins: formatMap(this.tokens.spacing.margins),
          paddings: formatMap(this.tokens.spacing.paddings),
          gaps: formatMap(this.tokens.spacing.gaps)
        },
        borders: {
          widths: formatMap(this.tokens.borders.widths),
          radii: formatMap(this.tokens.borders.radii),
          styles: formatMap(this.tokens.borders.styles)
        },
        shadows: formatMap(this.tokens.shadows),
        transitions: formatMap(this.tokens.transitions),
        cssVariables: this.cssVariables || {},
        meta: {
          url: window.location.href,
          title: document.title,
          timestamp: new Date().toISOString()
        }
      };
    }

    detectInconsistencies() {
      const issues = [];
      
      // Check for similar colors
      const allColors = this.tokens.colors.all;
      // TODO: Implement color similarity detection
      
      // Check for inconsistent spacing (e.g., 12px, 13px, 14px)
      const spacingValues = [
        ...this.tokens.spacing.margins.keys(),
        ...this.tokens.spacing.paddings.keys()
      ];
      
      // Check for too many font sizes
      if (this.tokens.typography.fontSizes.size > 15) {
        issues.push({
          type: 'typography',
          severity: 'warning',
          message: `${this.tokens.typography.fontSizes.size} different font sizes detected. Consider using a modular scale.`
        });
      }
      
      return issues;
    }
  }

  // Listen for messages from popup
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractTokens') {
      const extractor = new DesignTokenExtractor();
      const results = extractor.extract();
      sendResponse(results);
    }
    return true;
  });
})();
