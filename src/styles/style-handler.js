const ObjectUtils = require('../utils/object-utils');

/**
 * Base StyleHandler class for managing style properties across different renderers
 * Provides common functionality for style management while allowing renderer-specific extensions
 */
class StyleHandler {
    /**
     * Create a new StyleHandler
     * @param {Object} options - Configuration options
     * @param {boolean} options.verbose - Enable verbose logging
     */
    constructor(options = {}) {
        this.verbose = options.verbose || false;
        this.log = this.verbose ? console.log.bind(console) : () => {};
        
        // Core style storage
        this.stylesheet = this.getBlankStylesheet();
        
        // Dynamic property collection - map of style name to array of properties
        this.dynamicProperties = new Map();
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

    /**
     * Get blank page configuration
     * @returns {Object} Default page configuration
     */
    getBlankPage() {
        return {
            scale: {
                position: { x: 1, y: 1 },
                size: { w: 1, h: 1 }
            },
            margin: {
                h: 1,
                w: 1
            }
        };
    }

    /**
     * Get blank styles structure
     * @returns {Object} Default styles structure
     */
    getBlankStyles() {
        return {
            node: {},
            edge: {}
        };
    }

    /**
     * Get just the page configuration
     * @returns {Object} Page configuration
     */
    getPage() {
        return this.stylesheet.page;
    }

    /**
     * Get the scale configuration
     * @returns {Object} Scale configuration
     */
    getPageScale() {
        return this.stylesheet.page.scale;
    }

    /**
     * Get the margin configuration
     * @returns {Object} Margin configuration 
     */
    getPageMargin() {
        return this.stylesheet.page.margin;
    }

    /**
     * Helper to safely traverse an object path
     * @param {Object} obj - Object to traverse
     * @param {string[]} pathParts - Path parts to follow
     * @returns {*} Value at the path or undefined
     */
    getValueFromPath(obj, pathParts) {
        if (!obj) return undefined;
        
        return pathParts.reduce((current, part) => {
            return current?.[part];
        }, obj);
    }

    /**
     * Get a style attribute by cascading from the specified style to base
     * @param {string} category - 'node', 'edge', etc.
     * @param {string} styleName - name of the style, or null/undefined for default
     * @param {string} attributePath - dot-separated path to the attribute (e.g., 'node.anchor')
     * @param {any} [defaultValue=null] - value to return if attribute not found
     * @returns {*} The attribute value
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
     * Get complete style object for a category/style, with base cascade
     * @param {string} styleName - name of the style, or null/undefined for default
     * @param {string} styleType - 'node', 'edge', etc.
     * @param {string} generalCategory - 'object', 'label', 'head'
     * @param {string} specificCategory - more refined category like 'label_start', 'head_end'
     * @returns {Object} Complete cascaded style
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

    /**
     * Store a dynamic property in the property collection for a style
     * @param {string} styleName - Style name
     * @param {Object} property - Dynamic property object
     * @returns {Array} The updated properties array for this style
     */
    addDynamicProperty(styleName, property) {
        // Get or create the array for this style
        const styleProperties = this.dynamicProperties.get(styleName) || [];
        
        // Add the property to the array
        styleProperties.push(property);
        
        // Update the map
        this.dynamicProperties.set(styleName, styleProperties);
        
        return styleProperties;
    }

    /**
     * Get all dynamic properties for a style
     * @param {string} styleName - Style name
     * @returns {Array|undefined} The properties array for this style or undefined
     */
    getDynamicPropertiesForStyle(styleName) {
        return this.dynamicProperties.get(styleName);
    }

    /**
     * Get all dynamic properties across all styles
     * @returns {Map} The complete dynamic properties map
     */
    getAllDynamicProperties() {
        return this.dynamicProperties;
    }

    /**
     * Merge dynamic properties from a style record
     * @param {string} styleName - Name of the style
     * @param {Array} properties - Array of dynamic properties
     */
    mergeDynamicProperties(styleName, properties) {
        if (!properties || !Array.isArray(properties)) return;
        
        this.log(`Merging ${properties.length} dynamic properties for style "${styleName}"`);
        
        // Get or create the array for this style
        const styleProperties = this.dynamicProperties.get(styleName) || [];
        
        // Add all properties to the array
        styleProperties.push(...properties);
        
        // Update the map
        this.dynamicProperties.set(styleName, styleProperties);
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
        
        // Process dynamic properties if present
        if (newStyles._dynamicProperties && Array.isArray(newStyles._dynamicProperties)) {
            this.mergeDynamicProperties(newStyles.name || 'default', newStyles._dynamicProperties);
        }
        
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
                this.stylesheet.style[styleName] = ObjectUtils.deepMerge(
                    this.stylesheet.style[styleName] || {},
                    styleData
                );
            }
        }
        
        // Handle page configuration if present
        if (newStyles.page) {
            this.log('Processing page config in mergeStylesheet:', JSON.stringify(newStyles.page));
            
            if (!this.stylesheet.page) {
                this.stylesheet.page = this.getBlankPage();
            }
            
            // Merge page configuration
            this.stylesheet.page = ObjectUtils.deepMerge(
                this.stylesheet.page,
                newStyles.page
            );
        }
    }

    /**
     * Process YAML documents from the style YAML file
     * @param {Array} documents - Array of YAML documents
     * @returns {Array} - Collection of style records
     */
    processYamlDocuments(documents) {
        if (!Array.isArray(documents)) {
            this.log("processYamlDocuments expected an array, received:", documents);
            return [];
        }
        let result = [];

        for (const doc of documents) {
            if (!doc) {
                this.log("Skipping null or undefined document in processYamlDocuments");
                continue;
            }

            this.log('Processing document:', JSON.stringify(doc));

            if (doc.type === 'page') {
                this.log('Merging page document');
                result.push({ page: doc });
            } else if (doc.type === 'style') {
                this.log('Merging style document:', doc.name || 'base');
                const styleName = doc.name || 'base';
                const styleData = { ...doc };
                delete styleData.type;
                delete styleData.name;

                result.push({ style: { [styleName]: styleData } });
            } else {
                this.log(`Unknown document type: ${doc.type}`);
            }
        }

        return result;
    }
}

module.exports = StyleHandler;
