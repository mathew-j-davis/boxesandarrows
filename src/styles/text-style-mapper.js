const StyleMapper = require('./style-mapper');

/**
 * TextStyleMapper - Handles mapping from universal style attributes
 * to text-grid specific attributes
 */
class TextStyleMapper extends StyleMapper {
    constructor() {
        super();
        
        // Define the hierarchy specific to text rendering
        // Text rendering doesn't use the graphical/vector levels
        this.hierarchy = ['universal', 'text', 'textgrid'];
        
        // Initialize with empty mappings (to be populated later)
        this.initializeEmptyMappings();
    }
    
    /**
     * Initialize empty mappings for each level in the hierarchy
     * This ensures the structure exists but doesn't apply any transformations yet
     */
    initializeEmptyMappings() {
        // Empty mappings for text grid
        this.registerMapping('universal', 'textgrid', {});
        this.registerMapping('text', 'textgrid', {});
    }
    
    /**
     * Resolve style for text rendering
     * @param {Object} styleObject - The style object with hierarchical namespaces
     * @returns {Object} - Resolved style object for text grid rendering
     */
    resolveTextStyle(styleObject) {
        return this.resolveStyle(styleObject, 'textgrid', this.hierarchy);
    }
}

module.exports = TextStyleMapper; 