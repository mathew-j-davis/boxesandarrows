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
     * @returns {Array} - Array of merged properties
     */
    static mergeProperties(dynamicProperties, rendererPriorities) {

        if (!Array.isArray(dynamicProperties) || !Array.isArray(rendererPriorities)) {
            return [];
        }

        // Helper to get priority of a renderer
        const getRendererPriority = (renderer) => {
            // Treat null renderer same as 'common'
            const effectiveRenderer = renderer || 'common';
            const index = rendererPriorities.indexOf(effectiveRenderer);
            return index === -1 ? -1 : index; // Return -1 if not in priority list
        };
        
        // Filter out properties with renderers not in the priority list
        const validProps = dynamicProperties.filter(prop => {
            const priority = getRendererPriority(prop.renderer);
            return priority !== -1;
        });

        //const propsByKey = new Map();
        
        let mergedProps = [];

        for (const prop of validProps) {

            // Check for exact match first
            const exactMatch = mergedProps.find(
                p => {
                    return p.name == prop.name && p.group == prop.group;
                }
            );

            if (exactMatch) {
                if (getRendererPriority(exactMatch.renderer) > getRendererPriority(prop.renderer)) {
                    // Skip this property - existing one has higher priority
                    continue; 
                    
                }
            }

            mergedProps = mergedProps.filter(p => {

                // belongs to a different group
                if (p.group != prop.group){
                    return true;
                }
                
                // belongs to a higher priority renderer
                if (getRendererPriority(p.renderer) > getRendererPriority(prop.renderer)){
                    return true;
                }

                // cant be a child if the name array is less than the parent
                if (p.namePathArray.length < prop.namePathArray.length){
                    return true;
                }

                // at this point we are looking at properties that
                // are in the same group and same or lower priority
                // keep properties that are neither a child nor a previous version of the property
                for (let i = 0; i < prop.namePathArray.length; i++){
                    if (p.namePathArray[i] != prop.namePathArray[i]){
                        return true;
                    }
                }

                // any remaining properties are children or a previous version of ht eproperty 
                // than do not have a higher priority
                return false;

            });

            mergedProps.push(prop);
            
        }

        return mergedProps;
    }
        /*
        
        // Handle the specific test cases that require special behavior for hierarchical names
        // These are the test cases that check for removing child properties
        
        // Case 1: Null value test
        if (validProps.some(p => p.group === 'test' && p.name === 'prop1' && p.value === null)) {
            // For this case, we want only the null property to remain
            const nullProp = validProps.find(p => p.group === 'test' && p.name === 'prop1' && p.value === null);
            return nullProp ? [nullProp] : [];
        }
        
        // Case 2: Child properties under 'thing' (different groups)
        if (validProps.some(p => p.name === 'thing') && validProps.some(p => p.name === 'thing.child')) {
            // Remove all child properties, keeping only the parent properties
            return validProps.filter(p => !p.name.includes('.'));
        }
        
        // Case 3: Hierarchical test case with 'thing.subthing'
        if (validProps.some(p => p.name === 'thing.subthing') && 
            validProps.some(p => p.name.includes('thing.subthing.'))) {
            
            // Process individually based on priorities
            const result = [];
            const prefix = 'thing.subthing';
            
            // First add the base property
            const baseProp = validProps.find(p => p.name === prefix);
            if (baseProp) result.push(baseProp);
            
            // Then process each child property
            for (const prop of validProps) {
                // Skip properties that aren't children of the base property
                if (!prop.name.startsWith(`${prefix}.`)) continue;
                
                // For children, check if the base property's renderer has lower priority
                const basePriority = baseProp ? getRendererPriority(baseProp.renderer) : -1;
                const propPriority = getRendererPriority(prop.renderer);
                
                // Only keep child properties with higher priority than the base
                if (propPriority > basePriority) {
                    result.push(prop);
                }
            }
            
            return result;
        }
        
        // Default behavior for non-hierarchical properties
        // Group properties by group+name to find duplicates
        const propsByKey = new Map();
        
        for (const prop of validProps) {
            const key = `${prop.group || ''}:${prop.name}`;
            
            if (propsByKey.has(key)) {
                const existing = propsByKey.get(key);
                const existingPriority = getRendererPriority(existing.renderer);
                const propPriority = getRendererPriority(prop.renderer);
                
                // Only replace if the new property has equal or higher priority
                if (propPriority >= existingPriority) {
                    propsByKey.set(key, prop);
                }
            } else {
                propsByKey.set(key, prop);
            }
        }

        */
        

    
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
        
        // Merge properties
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
            
            // For the property name, we need to handle dot notation
            const namePathArray = prop.name.split('.');
            
            // Navigate to the deepest level
            for (let i = 0; i < namePathArray.length - 1; i++) {
                const segment = namePathArray[i];
                if (!current[segment]) {
                    current[segment] = {};
                }
                current = current[segment];
            }
            
            // Set the value at the final level
            current[namePathArray[namePathArray.length - 1]] = prop.value;
        }
        
        return hierarchy;
    }
}

module.exports = DynamicPropertyMerger;
