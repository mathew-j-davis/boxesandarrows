class LatexStyleHandler {
    constructor(styleSheet) {
        this.styleSheet = styleSheet;
        this.colorDefinitions = new Map();  // Track color definitions
        this.reservedAttributes = new Set([
            'width', 'height', 'anchor',
            'minimum width', 'minimum height',
            'shape'
        ]);
    }

    /**
     * Get a style attribute by cascading from the specified style to base
     * @param {string} category - 'node', 'edge', etc.
     * @param {string} styleName - name of the style, or null/undefined for default
     * @param {string} attributePath - dot-separated path to the attribute (e.g., 'node.anchor')
     * @param {any} [defaultValue=null] - value to return if attribute not found
     */
    getStyleAttribute(category, styleName, attributePath, defaultValue = null) {
        // Split the attribute path into parts
        const pathParts = attributePath.split('.');
        
        // Try the specified style first (or default if none specified)
        const styleToUse = styleName || 'default';
        let value = this.getValueFromPath(this.styleSheet.style?.[styleToUse]?.[category], pathParts);
        
        // If not found, cascade to base
        if (value === undefined) {
            value = this.getValueFromPath(this.styleSheet.style?.base?.[category], pathParts);
        }
        
        return value ?? defaultValue;
    }

    /**
     * Helper to safely traverse an object path
     */
    getValueFromPath(obj, pathParts) {
        if (!obj) return undefined;
        
        return pathParts.reduce((current, part) => {
            return current?.[part];
        }, obj);
    }

    /**
     * Get complete style object for a category/style, with base cascade
     * @param {string} styleName - name of the style, or null/undefined for default
     * @param {string} styleType - 'node', 'edge', etc.
     * @param {string} generalCategory - 'object', 'text', 'head'
     * @param {string} specificCategory - more refined category like 'text_start', 'head_end'
     */
    getCompleteStyle(styleName, styleType, generalCategory, specificCategory = null) {
        const baseStyle = this.styleSheet?.style?.base?.[styleType]?.[generalCategory] || {};
        const baseStyleSpecific = this.styleSheet?.style?.base?.[styleType]?.[specificCategory] || {};

        const selectedStyle = this.styleSheet?.style?.[styleName || 'default']?.[styleType]?.[generalCategory] || {};
        const selectedStyleSpecific = this.styleSheet?.style?.[styleName || 'default']?.[styleType]?.[specificCategory] || {};

        return {
            ...baseStyle,
            ...baseStyleSpecific,
            ...selectedStyle,
            ...selectedStyleSpecific,
        };
    }

    applyLatexFormatting(text, style) {
        let result = text;
        
        if (style?.latex?.flags) {
            for (const [category, command] of Object.entries(style.latex.flags)) {
                if (command) {
                    const cleanCommand = command.startsWith('\\') ? command.slice(1) : command;
                    result = `\\${cleanCommand}{${result}}`;
                }
            }
        }

        if (style?.latex?.commands) {
            for (const [name, command] of Object.entries(style.latex.commands)) {
                if (command.args && command.enabled !== false) {
                    const cleanName = name.startsWith('\\') ? name.slice(1) : name;
                    result = `\\${cleanName}${command.args.map(arg => `{${arg}}`).join('')}{${result}}`;
                }
            }
        }

        return result;
    }

    tikzifyStyle(style) {
        if (!style?.tikz) return '';
        
        const options = Object.entries(style.tikz)
            .map(([key, value]) => {
                if (value === true) return key;
                if (value === false) return null;
                
                // Process hex colors
                if (typeof value === 'string' && value.startsWith('#')) {
                    // Register and use the registered color name
                    return `${key}=${this.registerColor(value)}`;
                }
                
                return `${key}=${value}`;
            })
            .filter(Boolean)
            .join(', ');
            
        return options;
    }

    /**
     * Process raw TikZ attributes string into a style object
     * @param {string} attributeStr - Raw TikZ attributes
     * @returns {Object} Style object with processed attributes
     */
    processAttributes(attributeStr) {
        if (!attributeStr) return {};
        
        const style = { tikz: {} };
        const attributes = attributeStr.split(',').map(attr => attr.trim());
        
        for (const attr of attributes) {
            // Skip empty attributes
            if (!attr) continue;
            
            // Handle key=value pairs
            if (attr.includes('=')) {
                const [key, value] = attr.split('=').map(s => s.trim());
                
                // Skip reserved attributes
                if (this.reservedAttributes.has(key)) continue;
                
                // Process color values in draw and fill
                if ((key === 'draw' || key === 'fill') && value.startsWith('#')) {
                    style.tikz[key] = this.registerColor(value);
                } else {
                    style.tikz[key] = value;
                }
            } else {
                // Handle flag attributes (no value)
                style.tikz[attr] = true;
            }
        }
        
        return style;
    }

    /**
     * Register a color and return its name
     * @param {string} colorValue - Color value (e.g., #FFFFFF)
     * @returns {string} Color name to use in TikZ
     */
    registerColor(colorValue) {
        if (!colorValue.startsWith('#')) return colorValue;
        
        const hex = colorValue.replace('#', '').toUpperCase();
        const colorName = `color${hex}`;
        
        if (!this.colorDefinitions.has(colorName)) {
            this.colorDefinitions.set(colorName, hex);
        }
        
        return colorName;
    }

    /**
     * Get all color definitions for the preamble
     * @returns {string[]} Array of color definition commands
     */
    getColorDefinitions() {
        const definitions = [];
        for (const [name, hex] of this.colorDefinitions) {
            definitions.push(`\\definecolor{${name}}{HTML}{${hex}}`);
        }
        return definitions;
    }

    /**
     * Merge style objects, with the second taking precedence
     * @param {Object} base - Base style object
     * @param {Object} override - Override style object
     * @returns {Object} Merged style object
     */
    mergeStyles(base, override) {
        const result = { ...base };
        
        if (override.tikz) {
            result.tikz = { ...result.tikz, ...override.tikz };
        }
        
        if (override.latex) {
            result.latex = result.latex || { commands: {} };
            result.latex.commands = {
                ...result.latex.commands,
                ...override.latex.commands
            };
        }
        
        return result;
    }

    /**
     * Merge new styles into the existing stylesheet
     * @param {Object} newStyles - New styles to merge
     */
    mergeStyleSheet(newStyles) {
        if (!newStyles || !newStyles.style) return;
        
        // Initialize style section if it doesn't exist
        if (!this.styleSheet) {
            this.styleSheet = {};
        }
        
        if (!this.styleSheet.style) {
            this.styleSheet.style = {};
        }
        
        // Merge styles at the style name level
        for (const [styleName, styleData] of Object.entries(newStyles.style)) {
            if (!this.styleSheet.style[styleName]) {
                this.styleSheet.style[styleName] = {};
            }
            
            // Deep merge the style data
            this.styleSheet.style[styleName] = this.deepMergeObjects(
                this.styleSheet.style[styleName],
                styleData
            );
        }
        
        // Handle page configuration if present
        if (newStyles.page) {
            if (!this.styleSheet.page) {
                this.styleSheet.page = {};
            }
            
            this.styleSheet.page = this.deepMergeObjects(
                this.styleSheet.page,
                newStyles.page
            );
        }
    }

    /**
     * Deep merge of objects for style data
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} - Merged object
     */
    deepMergeObjects(target, source) {
        if (!source) return target;
        if (!target) return { ...source };
        
        const output = { ...target };
        
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key] || typeof target[key] !== 'object') {
                    output[key] = { ...source[key] };
                } else {
                    output[key] = this.deepMergeObjects(target[key], source[key]);
                }
            } else {
                output[key] = source[key];
            }
        });
        
        return output;
    }
}

module.exports = LatexStyleHandler;
