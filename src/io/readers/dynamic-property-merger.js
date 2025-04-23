/**
 * Handles merging of dynamic properties based on renderer priorities
 */

class DynamicPropertyMerger {

    /**
     * Merge dynamic properties based on chronological order (last one wins)
     * 
     * @param {Array} dynamicProperties - Array of parsed dynamic property objects
     * @param {Array} rendererCompatibility - Array of renderers that are compatible (provided by target renderer)
     * @param {Array} [mergedAndFilteredProps=[]] - Optional pre-existing filtered properties to merge with
     * @returns {Array} - Array of merged properties
     */
    static mergePropertiesWithRendererFilter(dynamicProperties, rendererCompatibility, mergedAndFilteredProps = []) {

        if (!Array.isArray(dynamicProperties) || !Array.isArray(rendererCompatibility)) {
            return mergedAndFilteredProps;
        }

        
        // Filter out properties with renderers not in the priority list
        const validProps = dynamicProperties.filter(prop => {
            return rendererCompatibility.includes(prop.renderer);
        });

        // Call the core merging function with filtered properties and existing filtered properties
        return this.mergeProperties(validProps, mergedAndFilteredProps);
    }

    /**
     * Core property merging logic without renderer filtering
     * 
     * @param {Array} properties - Array of parsed dynamic property objects
     * @param {Array} [mergedProps=[]] - Optional pre-existing properties to merge with
     * @returns {Array} - Array of merged properties
     */
    static mergeProperties(properties, mergedProps = []) {
        if (!Array.isArray(properties)) {
            return mergedProps;
        }

        // Use the provided mergedProps array or create a new one
        let result = [...mergedProps];

        for (const prop of properties) {

 

            // Filter existing properties. 
            // Remove any property that is a child of the current prop 
            // (i.e., its namePath starts with the current prop's namePath) or is the same property.
            result = result.filter(p => {

                // If path length is less than prop's path length
                // it is either a parent or on a different branch
                // => it is not a child or the same property

                if (p.namePathArray.length < prop.namePathArray.length) {

                    // if we are removing the current property
                    // we will not need to remove any parents

                    if(prop.clear){
                        return true;
                    }

                    // if property is not being removed,
                    // then parent properties must be paths only
                    // they cannot have a simple value
                    // therefore we need to remove any parent properties with a simple value

                    else{

                        // Check if p's namePath items match 
                        // prop's namePath 
                        // to the depth of p's namePathArray
                        // if they deviate, they are on a different branch
                        // so we will not remove it

                        for (let i = 0; i < p.namePathArray.length; i++){
                            if (p.namePathArray[i] !== prop.namePathArray[i]){
                                // Paths diverge, p is not a parent
                                return true;
                            }
                        }

                        // this is a parent property with a value
                        // we need to clear it

                        return false;
                    }
                }
                

                // whether we are removing the current property or setting it to a new value
                // we need to clear children
                // to maintain the integrity of the property tree

                for (let i = 0; i < prop.namePathArray.length; i++){
                    if (p.namePathArray[i] !== prop.namePathArray[i]){
                        // Paths diverge, p is not a child or the same property
                        return true;
                    }
                }

                // If we reach here, p's namePath starts with or is identical to prop's namePath.
                // Remove it (it's either the property itself being overwritten or a child).
                return false;
            });

            // if we are not clearing, we need to add the property
            if (!prop.clear){
                result.push(prop);
            }
        }

        return result;
    }
    

    
    // /**
    //  * Process an array of dynamic properties and return merged results
    //  * 
    //  * @param {Array} dynamicProperties - Array of dynamic properties
    //  * @param {Array} rendererPriorities - Array of renderers in increasing priority order
    //  * @returns {Array} - Merged dynamic properties
    //  */
    // static processDynamicProperties(dynamicProperties, rendererCompatibility) {
    //     if (!Array.isArray(dynamicProperties)) {
    //         return [];
    //     }
        
    //     // Merge properties
    //     return this.mergePropertiesWithRendererFilter(dynamicProperties, rendererCompatibility);
    // }

    /**
     * Converts merged dynamic properties to a hierarchical structure
     * 
     * This method processes a flat array of dynamic properties and builds
     * a tree structure based on their namePathArray values. It handles:
     * - Regular properties with nested paths
     * - Array indices in paths
     * - Special handling for flag properties in a __flags container
     * 
     * @param {Array} mergedProperties - Array of merged dynamic properties
     * @returns {Object} - Hierarchical object with properties organized by namePath
     */
    static toHierarchy(mergedProperties) {
        const hierarchy = {};

        for (const prop of mergedProperties) {
            // Skip if no name path
            if (!prop.namePathArray || prop.namePathArray.length === 0) continue;
            
            let current = hierarchy;
            
            // Navigate through all segments except the last one to build the nested structure
            // The last segment will be used as the key to store the property's value
            for (let i = 0; i < prop.namePathArray.length - 1; i++) {
                const segment = prop.namePathArray[i];
                const isIndex = prop.isNamePathIndex(i);
                
                // Determine what type the next level should be based on the next segment
                const nextSegment = prop.namePathArray[i + 1];
                const nextIsIndex = prop.isNamePathIndex(i + 1);
                
                if (isIndex) {
                    // Current segment is an index, so the parent should be an array
                    const indexNum = parseInt(segment, 10);
                    
                    // Ensure current is an array if not already
                    if (!Array.isArray(current)) {
                        console.warn(`Expected array but found ${typeof current} for path ${prop.namePathArray.join('.')}`);
                        break;
                    }
                    
                    // Create or ensure the object at this index exists
                    if (current[indexNum] === undefined) {
                        current[indexNum] = nextIsIndex ? [] : {};
                    } else if (nextIsIndex && !Array.isArray(current[indexNum])) {
                        current[indexNum] = [];
                    } else if (!nextIsIndex && typeof current[indexNum] !== 'object') {
                        current[indexNum] = {};
                    }
                    
                    current = current[indexNum];
                } else {
                    // Current segment is a name
                    
                    // Create the object for this segment if it doesn't exist,
                    // or ensure it's the right type based on the next segment
                    if (current[segment] === undefined) {
                        current[segment] = nextIsIndex ? [] : {};
                    } else if (nextIsIndex && !Array.isArray(current[segment])) {
                        current[segment] = [];
                    } else if (!nextIsIndex && typeof current[segment] !== 'object') {
                        current[segment] = {};
                    }
                    
                    current = current[segment];
                }
            }
            
            // Now we're at the parent level where we need to add the property's value
            // using the last segment of the path as the key (or index)
            const lastSegment = prop.namePathArray[prop.namePathArray.length - 1];
            const isLastIndex = prop.isNamePathIndex(prop.namePathArray.length - 1);

            // Special handling for flag properties
            if (prop.isFlag) {
                // Create the __flags container if it doesn't exist
                if (typeof current.__flags !== 'object') {
                    current.__flags = {};
                }
                
                // Add flag to the __flags container
                if (isLastIndex) {
                    const indexNum = parseInt(lastSegment, 10);
                    current.__flags[indexNum] = prop.value;
                } else {
                    current.__flags[lastSegment] = prop.value;
                }
            } else {
                // Regular property (not a flag)
                if (isLastIndex) {
                    // Last segment is an index, so current should be an array
                    const indexNum = parseInt(lastSegment, 10);
                    
                    if (!Array.isArray(current)) {
                        console.warn(`Expected array but found ${typeof current} for path ${prop.namePathArray.join('.')}`);
                        continue;
                    }
                    
                    // Set the value at the specified index
                    current[indexNum] = prop.value;
                } else {
                    // Last segment is a property name, use it as a key
                    current[lastSegment] = prop.value;
                }
            }
        }
        
        return hierarchy;
    }
}

module.exports = DynamicPropertyMerger;