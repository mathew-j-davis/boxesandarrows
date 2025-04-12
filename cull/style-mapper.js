/**
 * StyleMapper - Maps style attributes from one level of the hierarchy to another
 * This class provides the mechanics for style mapping without imposing a specific hierarchy.
 * Each renderer can define its own mapping rules and priority hierarchy.
 */
class StyleMapper {
    constructor() {
        // Initialize with empty mappings
        this.mappings = {
            // Key is target namespace (e.g., 'tikz', 'latex')
            // Value is an object with source namespace keys and mapping functions
        };
    }

    /**
     * Register a mapping from one style namespace to another
     * @param {string} sourceNamespace - Source style namespace (e.g., 'universal', 'graphical')
     * @param {string} targetNamespace - Target renderer namespace (e.g., 'tikz', 'latex')
     * @param {Function|Object} mapping - Mapping function or dictionary
     */
    registerMapping(sourceNamespace, targetNamespace, mapping) {
        // Initialize target namespace if it doesn't exist
        if (!this.mappings[targetNamespace]) {
            this.mappings[targetNamespace] = {};
        }
        
        // Add the mapping
        this.mappings[targetNamespace][sourceNamespace] = mapping;
    }

    /**
     * Apply mappings to transform a style object according to registered mappings
     * @param {Object} styleObject - Complete style object with hierarchical namespaces
     * @param {string} targetNamespace - Desired output namespace (e.g., 'tikz')
     * @param {Array<string>} sourceHierarchy - Priority order of source namespaces (low to high)
     * @returns {Object} - Transformed style object with attributes mapped to target namespace
     */
    applyMappings(styleObject, targetNamespace, sourceHierarchy) {
        // Start with empty result object
        const result = {};
        
        // First, directly copy any attributes already in the target namespace
        if (styleObject[targetNamespace]) {
            Object.assign(result, styleObject[targetNamespace]);
        }
        
        // Apply mappings in priority order (low to high)
        for (const sourceNamespace of sourceHierarchy) {
            // Skip if source namespace doesn't exist in style or no mapping defined
            if (!styleObject[sourceNamespace] || !this.mappings[targetNamespace]?.[sourceNamespace]) {
                continue;
            }
            
            const mapping = this.mappings[targetNamespace][sourceNamespace];
            const sourceAttrs = styleObject[sourceNamespace];
            
            // Apply mapping based on type
            if (typeof mapping === 'function') {
                // If mapping is a function, call it with source attributes
                const mappedAttrs = mapping(sourceAttrs);
                Object.assign(result, mappedAttrs);
            } 
            else if (typeof mapping === 'object') {
                // If mapping is a dictionary, map each attribute that exists in source
                for (const [sourceAttr, mapFunction] of Object.entries(mapping)) {
                    if (sourceAttr in sourceAttrs) {
                        if (typeof mapFunction === 'function') {
                            // Apply function to transform value
                            const mappedValue = mapFunction(sourceAttrs[sourceAttr]);
                            
                            // If function returns object, merge all properties
                            if (typeof mappedValue === 'object' && !Array.isArray(mappedValue)) {
                                Object.assign(result, mappedValue);
                            } else {
                                result[sourceAttr] = mappedValue;
                            }
                        } 
                        else if (typeof mapFunction === 'object' && typeof sourceAttrs[sourceAttr] === 'string') {
                            // Handle lookup tables for enumerated values
                            const mappedValue = mapFunction[sourceAttrs[sourceAttr]];
                            if (mappedValue !== undefined) {
                                if (typeof mappedValue === 'object' && !Array.isArray(mappedValue)) {
                                    Object.assign(result, mappedValue);
                                } else {
                                    result[sourceAttr] = mappedValue;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return result;
    }

    /**
     * Get a complete resolved style object for a specific renderer
     * @param {Object} styleObject - Complete hierarchical style object
     * @param {string} targetNamespace - Target renderer namespace
     * @param {Array<string>} hierarchy - Hierarchy of style namespaces (low to high priority)
     * @returns {Object} - Resolved style object for the target renderer
     */
    resolveStyle(styleObject, targetNamespace, hierarchy) {
        return this.applyMappings(styleObject, targetNamespace, hierarchy);
    }
}

module.exports = StyleMapper; 