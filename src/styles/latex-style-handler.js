class LatexStyleHandler {
    constructor(options = {}) {
        this.verbose = options.verbose || false;
        this.log = this.verbose ? console.log.bind(console) : () => {};
        this.stylesheet = this.getBlankStylesheet();
        this.colorDefinitions = new Map();  // Track color definitions
        this.reservedAttributes = new Set([
            'width', 'height', 'anchor',
            'minimum width', 'minimum height',
            'shape'
        ]);
    }

    // Get just the page configuration
    getPage() {
        return this.stylesheet.page;
    }

    // Get the scale configuration
    getPageScale() {
        return this.stylesheet.page.scale;
    }

    // Get the scale configuration
    getPageMargin() {
        return this.stylesheet.page.margin;
    }

    /**
     * Get a blank stylesheet with default values
     * @returns {Object} Blank stylesheet
     */
    getBlankStylesheet() {
        const blank = { 
            page: {},
            style: {}
        };

        blank.page = this.getBlankPage();
        blank.style = this.getBlankStyles();

        return blank;
    }

    getBlankPage() {
        return {
            scale: {
                position: { x: 1, y: 1 },
                size: { w: 1, h: 1 }
                },
            margin:{
                h: 1,
                w: 1
            }
        };
    }

    getBlankStyles() {
        return {
            node: {},
            edge: {}
        };
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
        let value = this.getValueFromPath(this.stylesheet.style?.[styleToUse]?.[category], pathParts);
        
        // If not found, cascade to base
        if (value === undefined) {
            value = this.getValueFromPath(this.stylesheet.style?.base?.[category], pathParts);
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
     * @param {string} generalCategory - 'object', 'label', 'head'
     * @param {string} specificCategory - more refined category like 'label_start', 'head_end'
     */
    getCompleteStyle(styleName, styleType, generalCategory, specificCategory = null) {
        const baseStyle = this.stylesheet?.style?.base?.[styleType]?.[generalCategory] || {};
        const baseStyleSpecific = this.stylesheet?.style?.base?.[styleType]?.[specificCategory] || {};

        const selectedStyle = this.stylesheet?.style?.[styleName || 'default']?.[styleType]?.[generalCategory] || {};
        const selectedStyleSpecific = this.stylesheet?.style?.[styleName || 'default']?.[styleType]?.[specificCategory] || {};

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
    getMergedStyle(base, override) {
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
    mergeStylesheet(newStyles) {
        if (!newStyles) {
            this.log('mergeStylesheet received null or undefined');
            return;
        }

        this.log('mergeStylesheet received:', JSON.stringify(newStyles));
        
        // Initialize stylesheet if needed
        if (!this.stylesheet) {
            this.stylesheet = this.getBlankStylesheet();
        }
        
        // Process styles if present
        if (newStyles.style) {
            this.log('Processing style section');
            
            if (!this.stylesheet.style) {
                this.stylesheet.style = this.getBlankStyles();
            }
            
            // Merge styles at the style name level
            for (const [styleName, styleData] of Object.entries(newStyles.style)) {
                if (!this.stylesheet.style[styleName]) {
                    this.stylesheet.style[styleName] = {};
                }
                
                // Deep merge the style data
                this.stylesheet.style[styleName] = this.deepMergeObjects(
                    this.stylesheet.style[styleName],
                    styleData
                );
            }
        }
        
        // Handle page configuration if present
        if (newStyles.page) {
            this.log('Processing page config in mergeStylesheet:', JSON.stringify(newStyles.page));
            
            if (!this.stylesheet.page) {
                this.log('No existing page config, creating new');
                this.stylesheet.page = this.getBlankPage();
            }
            
            this.log('Before merge, page is:', JSON.stringify(this.stylesheet.page));
            this.stylesheet.page = this.deepMergeObjects(
                this.stylesheet.page,
                newStyles.page
            );
            this.log('After merge, page is:', JSON.stringify(this.stylesheet.page));
        }
    }

    /**
     * Process YAML documents from the style YAML file
     * @param {Array} documents - Array of YAML documents
     * @returns {Array} - Collection of style records
     */
    processYamlDocuments(documents) {
        if (!documents || !Array.isArray(documents) || documents.length === 0) {
            return [];
        }
        
        // Initialize result array to collect all style records
        const result = [];
        
        // Process each document based on its type
        for (const doc of documents) {
            if (!doc || !doc.type) continue;
            
            // Process page configuration
            if (doc.type === 'page') {
                // Create a page object that matches the expected structure
                const pageConfig = {
                    page: { 
                        scale: doc.scale || {},
                        margin: doc.margin || {}
                    }
                };
                
                // Add to result array
                result.push(pageConfig);
            }
            
            // Process style definitions
            else if (doc.type === 'style') {
                const styleName = doc.name || 'base';
                
                // Create a style object that matches the expected structure
                const styleData = { style: {} };
                styleData.style[styleName] = {};
                
                // Copy all properties except type and name
                for (const [key, value] of Object.entries(doc)) {
                    if (key !== 'type' && key !== 'name') {
                        styleData.style[styleName][key] = value;
                    }
                }
                
                // Add to result array
                result.push(styleData);
            }
        }
        
        return result;
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
