const StyleMapper = require('./style-mapper');

/**
 * LatexStyleMapper - Handles mapping from universal, graphical, and vector style attributes
 * to LaTeX/TikZ specific attributes
 */
class LatexStyleMapper extends StyleMapper {
    constructor() {
        super();
        
        // Define the hierarchy specific to Latex rendering
        this.hierarchy = ['universal', 'graphical', 'vector', 'latex', 'tikz'];
        
        // Initialize with empty mappings (to be populated later)
        this.initializeEmptyMappings();
    }
    
    /**
     * Initialize empty mappings for each level in the hierarchy
     * This ensures the structure exists but doesn't apply any transformations yet
     */
    initializeEmptyMappings() {
        // Empty mappings for TikZ
        this.registerMapping('universal', 'tikz', {});
        this.registerMapping('graphical', 'tikz', {});
        this.registerMapping('vector', 'tikz', {});
        
        // Empty mappings for LaTeX
        this.registerMapping('universal', 'latex', {});
        this.registerMapping('graphical', 'latex', {});
        this.registerMapping('vector', 'latex', {});
    }
    
    /**
     * Resolve style for LaTeX/TikZ rendering
     * @param {Object} styleObject - The style object with hierarchical namespaces
     * @param {string} targetNamespace - Either 'tikz' or 'latex'
     * @returns {Object} - Resolved style object for the specified target
     */
    resolveLatexStyle(styleObject, targetNamespace = 'tikz') {
        return this.resolveStyle(styleObject, targetNamespace, this.hierarchy);
    }
    
    /**
     * Convenience method to resolve TikZ style
     * @param {Object} styleObject - The style object with hierarchical namespaces
     * @returns {Object} - Resolved style object for TikZ
     */
    resolveTikzStyle(styleObject) {
        return this.resolveLatexStyle(styleObject, 'tikz');
    }
    
    /**
     * Convenience method to resolve LaTeX style
     * @param {Object} styleObject - The style object with hierarchical namespaces
     * @returns {Object} - Resolved style object for LaTeX
     */
    resolveLatexFlags(styleObject) {
        return this.resolveLatexStyle(styleObject, 'latex');
    }
}

module.exports = LatexStyleMapper; 