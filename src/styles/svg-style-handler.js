const StyleHandler = require('./style-handler');

/**
 * SVG-specific style handler
 * Extends StyleHandler to provide SVG-specific styling capabilities
 */
class SvgStyleHandler extends StyleHandler {
    constructor(options = {}) {
        // Call parent constructor
        super(options);

        // SVG-specific options
        this.useColor = options.useColor !== false;
    }

    /**
     * Get compatible renderers for SVG
     * @returns {Array<string>} Array of compatible renderer names
     */
    getCompatibleRenderers() {
        return ['common', 'svg'];
    }

    /**
     * Convert style properties to SVG attributes
     * @param {Object} style - Style object with properties
     * @returns {Object} Object with SVG attributes
     */
    toSvgAttributes(style) {
        if (!style) return {};

        const attrs = {};

        // Map common properties to SVG attributes
        if (style.fill) attrs.fill = style.fill;
        if (style.stroke) attrs.stroke = style.stroke;
        if (style['stroke-width']) attrs['stroke-width'] = style['stroke-width'];
        if (style.opacity) attrs.opacity = style.opacity;
        if (style['fill-opacity']) attrs['fill-opacity'] = style['fill-opacity'];
        if (style['stroke-opacity']) attrs['stroke-opacity'] = style['stroke-opacity'];

        return attrs;
    }

    /**
     * Process attribute string into SVG attributes
     * Similar to LaTeX processAttributes but for SVG
     * @param {string} attributeStr - Attribute string like "fill=red, stroke=blue"
     * @returns {Object} Processed attributes
     */
    processAttributes(attributeStr) {
        if (!attributeStr) return { svg: {} };

        const svgAttrs = {};

        // Split by comma and process each attribute
        const parts = attributeStr.split(',').map(s => s.trim());

        for (const part of parts) {
            if (!part) continue;

            // Check for key=value pairs
            const eqIndex = part.indexOf('=');
            if (eqIndex > 0) {
                const key = part.substring(0, eqIndex).trim();
                const value = part.substring(eqIndex + 1).trim();
                svgAttrs[key] = value;
            } else {
                // Flag attribute (no value)
                svgAttrs[part] = true;
            }
        }

        return { svg: svgAttrs };
    }

    /**
     * Get page scale configuration
     * @returns {Object} Scale configuration
     */
    getPageScale() {
        // Get page properties using parent's method
        const pageProps = this.getPage();

        // Extract scale values with defaults
        const scale = {
            position: {
                x: 1,
                y: 1
            },
            size: {
                w: 1,
                h: 1
            }
        };

        // Apply scale from page properties if available
        if (pageProps && pageProps.scale) {
            if (pageProps.scale.position) {
                scale.position.x = pageProps.scale.position.x || 1;
                scale.position.y = pageProps.scale.position.y || 1;
            }
            if (pageProps.scale.size) {
                scale.size.w = pageProps.scale.size.w || 1;
                scale.size.h = pageProps.scale.size.h || 1;
            }
        }

        return scale;
    }

    /**
     * Get merged style for a given style stack
     * @param {Object} base - Base style object
     * @param {Object} override - Override style object
     * @returns {Object} Merged style
     */
    getMergedStyle(base, override) {
        if (!base && !override) return {};
        if (!base) return { ...override };
        if (!override) return { ...base };

        // Deep merge for SVG attributes
        const merged = { ...base };

        Object.keys(override).forEach(key => {
            if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
                merged[key] = {
                    ...(merged[key] || {}),
                    ...override[key]
                };
            } else {
                merged[key] = override[key];
            }
        });

        return merged;
    }

    /**
     * Format color value for SVG
     * @param {string} colorValue - Color value (hex, named, etc)
     * @returns {string} SVG-formatted color
     */
    formatColor(colorValue) {
        if (!colorValue) return 'none';

        // Already a valid color format
        if (colorValue.startsWith('#') ||
            colorValue.startsWith('rgb') ||
            colorValue === 'none' ||
            colorValue === 'transparent') {
            return colorValue;
        }

        // Named colors are valid in SVG
        return colorValue;
    }
}

module.exports = SvgStyleHandler;
