class LatexStyleHandler {
    constructor(styleSheet) {
        this.styleSheet = styleSheet;
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
                return `${key}=${value}`;
            })
            .filter(Boolean)
            .join(', ');
            
        return options;
    }
}

module.exports = LatexStyleHandler;
