/**
 * Handles merging of dynamic properties based on renderer priorities
 */

class DynamicPropertyMerger {
    /**
     * Merge two properties, with the second one taking precedence
     * 
     * @param {Object} existingProp - The existing property
     * @param {Object} newProp - The new property to merge
     * @returns {Object} - The merged property
     */
    static mergeProperty(existingProp, newProp) {
        // Default merge behavior is to override the value
        return {
            ...newProp
        };
    }

    /**
     * Merge dynamic properties based on renderer priorities
     * 
     * @param {Array} dynamicProperties - Array of parsed dynamic property objects
     * @param {Array} rendererPriorities - Array of renderers in increasing priority order (provided by target renderer)
     * @returns {Object} - Map of merged properties by groupPath and name
     */
    static mergeProperties(dynamicProperties, rendererPriorities) {
        // Create a map to store merged properties
        // Key format: `${groupPath || ''}:${name}`
        const mergedProperties = new Map();
        
        // Helper to get priority of a renderer
        const getRendererPriority = (renderer) => {
            // Treat null renderer same as 'common'
            const effectiveRenderer = renderer || 'common';
            const index = rendererPriorities.indexOf(effectiveRenderer);
            return index === -1 ? -1 : index; // Return -1 if not in priority list
        };
        
        // Process each dynamic property in a single pass
        for (const prop of dynamicProperties) {
            // Create a key using groupPath and name
            // If no groupPath, use an empty string (root level)
            const groupPath = prop.group || '';
            const key = `${groupPath}:${prop.name}`;
            
            // Check if we've already seen this property
            if (mergedProperties.has(key)) {
                const existingProp = mergedProperties.get(key);
                const existingPriority = getRendererPriority(existingProp.renderer);
                const newPriority = getRendererPriority(prop.renderer);
                
                // Only override if the new property has equal or higher priority
                if (newPriority >= existingPriority) {
                    // Merge the properties
                    const mergedProp = this.mergeProperty(existingProp, prop);
                    mergedProperties.set(key, mergedProp);
                }
            } else {
                // This is a new property, just add it
                mergedProperties.set(key, { ...prop });
            }
        }
        
        // Convert the map back to an array
        return Array.from(mergedProperties.values());
    }
    
    /**
     * Process an array of dynamic properties and return merged results
     * 
     * @param {Array} dynamicProperties - Array of dynamic properties
     * @param {Array} rendererPriorities - Array of renderers in increasing priority order
     * @returns {Array} - Merged dynamic properties
     */
    static processDynamicProperties(dynamicProperties, rendererPriorities) {
        if (!Array.isArray(dynamicProperties)) {
            return [];
        }
        
        // Merge properties in a single pass
        return this.mergeProperties(dynamicProperties, rendererPriorities);
    }

    /**
     * Converts merged dynamic properties to a hierarchical structure
     * 
     * @param {Array} mergedProperties - Array of merged dynamic properties
     * @returns {Object} - Hierarchical object with properties organized by group path
     */
    static toHierarchy(mergedProperties) {
        const hierarchy = {};
        
        for (const prop of mergedProperties) {
            const groupArray = prop.group ? prop.group.split('.') : [];
            let current = hierarchy;
            
            // Navigate or create the group path
            for (const group of groupArray) {
                if (!current[group]) {
                    current[group] = {};
                }
                current = current[group];
            }
            
            // Add the property at the correct level
            current[prop.name] = prop.value;
        }
        
        return hierarchy;
    }

    /**
     * Process properties with hierarchical names (using dots)
     * Implements the rule that deepest children take priority
     * 
     * @param {Array} properties - Array of properties to process
     * @returns {Array} - Processed properties with hierarchical rules applied
     */
    static processHierarchicalProperties(properties) {
        if (!Array.isArray(properties) || properties.length === 0) {
            return [];
        }

        // Sort properties by path length (deepest first)
        // This ensures that deeper properties override shallower ones
        const sortedProps = [...properties].sort((a, b) => {
            // Compare by path length (deeper paths come first)
            const aPathLength = a.namePathArray.length;
            const bPathLength = b.namePathArray.length;
            
            if (aPathLength !== bPathLength) {
                return bPathLength - aPathLength; // Deeper paths first
            }
            
            // If same depth, maintain original order
            return properties.indexOf(a) - properties.indexOf(b);
        });

        // Track which properties to keep
        const keepProps = new Set();
        
        // Process properties from deepest to shallowest
        for (const prop of sortedProps) {
            // Check if this property should be kept
            let shouldKeep = true;
            
            // Check if any deeper property already overrides this one
            for (const existingProp of keepProps) {
                if (this.isChildPath(existingProp.namePathArray, prop.namePathArray)) {
                    shouldKeep = false;
                    break;
                }
            }
            
            if (shouldKeep) {
                keepProps.add(prop);
            }
        }
        
        // Convert back to array
        return Array.from(keepProps);
    }
    
    /**
     * Check if one path is a child of another
     * 
     * @param {Array} parentPath - The parent path array
     * @param {Array} childPath - The child path array
     * @returns {boolean} - True if childPath is a child of parentPath
     */
    static isChildPath(parentPath, childPath) {
        // Child path must be longer than parent path
        if (childPath.length <= parentPath.length) {
            return false;
        }
        
        // Check if child path starts with parent path
        for (let i = 0; i < parentPath.length; i++) {
            if (parentPath[i] !== childPath[i]) {
                return false;
            }
        }
        
        return true;
    }

}

module.exports = DynamicPropertyMerger;
