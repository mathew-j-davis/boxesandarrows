const StyleHandler = require('./style-handler');

class LatexStyleHandler extends StyleHandler {
    constructor(options = {}) {
        // Initialize the base StyleHandler
        super(options);
        
        // LaTeX-specific properties
        this.colorDefinitions = new Map();  // Track color definitions
        this.reservedAttributes = new Set([
            'width', 'height', 'anchor',
            'minimum width', 'minimum height',
            'shape'
        ]);
    }

    // LaTeX-specific methods

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
                return `${key}=${value}`;
            });
            
        return options.join(', ');
    }

    /**
     * Process an attribute string into a style object
     * @param {string} attributeStr - Attribute string (comma-separated list of attributes)
     * @returns {Object} Style object with parsed attributes
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
        for (const [name, hex] of this.colorDefinitions.entries()) {
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
     * Generate node style definitions for the document
     * @returns {Object} Node style definitions
     */
    getNodeStyleDefs() {
        const defs = {
            base: {},
        };
        
        // Process each style in the stylesheet
        Object.entries(this.stylesheet.style || {}).forEach(([styleName, styleData]) => {
            // Skip base (handled separately)
            if (styleName === 'base') return;
            
            // Initialize style in defs if needed
            if (!defs[styleName]) {
                defs[styleName] = {};
            }
            
            // Process node styles in this category
            if (styleData.node) {
                Object.entries(styleData.node).forEach(([nodeCategory, nodeCategoryData]) => {
                    // Generate the style definition
                    if (nodeCategory === 'object' && nodeCategoryData.tikz) {
                        defs[styleName][nodeCategory] = this.tikzifyStyle(nodeCategoryData);
                    }
                });
            }
        });
        
        return defs;
    }

    /**
     * Generate edge style definitions for the document
     * @returns {Object} Edge style definitions
     */
    getEdgeStyleDefs() {
        const defs = {
            base: {},
        };
        
        // Process each style in the stylesheet
        Object.entries(this.stylesheet.style || {}).forEach(([styleName, styleData]) => {
            // Skip base (handled separately)
            if (styleName === 'base') return;
            
            // Initialize style in defs if needed
            if (!defs[styleName]) {
                defs[styleName] = {};
            }
            
            // Process edge styles in this category
            if (styleData.edge) {
                Object.entries(styleData.edge).forEach(([edgeCategory, edgeCategoryData]) => {
                    // Generate the style definition
                    if (edgeCategory === 'object' && edgeCategoryData.tikz) {
                        defs[styleName][edgeCategory] = this.tikzifyStyle(edgeCategoryData);
                    }
                });
            }
        });
        
        return defs;
    }

    /**
     * Render the final style declarations for the document
     * @returns {Object} Style declarations
     */
    renderStyleDeclarations() {
        const declarations = {
            colors: this.getColorDefinitions(),
            nodes: this.getNodeStyleDefs(),
            edges: this.getEdgeStyleDefs()
        };
        
        return declarations;
    }

    /**
     * Get the list of compatible renderers for the LaTeX style handler
     * @returns {Array} Array of compatible renderer names
     */
    getCompatibleRenderers() {
        // LaTeX-specific implementation
        return ['latex', 'vector', 'common'];
    }
}

module.exports = LatexStyleHandler;
