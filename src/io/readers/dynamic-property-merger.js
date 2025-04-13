/**
 * Handles merging of dynamic properties based on renderer priorities
 */

class DynamicPropertyMerger {

    /**
     * Merge dynamic properties based on chronological order (last one wins)
     * 
     * @param {Array} dynamicProperties - Array of parsed dynamic property objects
     * @param {Array} rendererCompatibility - Array of renderers that are compatible (provided by target renderer)
     * @returns {Array} - Array of merged properties
     */
    static mergeProperties(dynamicProperties, rendererCompatibility) {

        if (!Array.isArray(dynamicProperties) || !Array.isArray(rendererCompatibility)) {
            return [];
        }

        
        // Filter out properties with renderers not in the priority list
        const validProps = dynamicProperties.filter(prop => {
            return rendererCompatibility.includes(prop.renderer);
        });


        let mergedProps = [];

        for (const prop of validProps) {

 
            // clear children is set.
            // Filter existing properties. Remove any property that is a child of the current prop 
            // (i.e., its namePath starts with the current prop's namePath) or is the same property.
            mergedProps = mergedProps.filter(p => {

                // path length is less than prop's path length
                // so it is either a parent or on a different branch
                // it is not a child or the same property

                if (p.namePathArray.length < prop.namePathArray.length) {

                    // we are removing the current property
                    // so we will not need to remove any parents

                    if(prop.clear){
                        return true;
                    }

                    // property is not being removed,
                    // therefore any parent properties must be paths only
                    // they cannot have a simple value

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
                mergedProps.push(prop);
            }
        }

        return mergedProps;
    }
    

    
    /**
     * Process an array of dynamic properties and return merged results
     * 
     * @param {Array} dynamicProperties - Array of dynamic properties
     * @param {Array} rendererPriorities - Array of renderers in increasing priority order
     * @returns {Array} - Merged dynamic properties
     */
    static processDynamicProperties(dynamicProperties, rendererCompatibility) {
        if (!Array.isArray(dynamicProperties)) {
            return [];
        }
        
        // Merge properties
        return this.mergeProperties(dynamicProperties, rendererCompatibility);
    }

    /**
     * Converts merged dynamic properties to a hierarchical structure
     * 
     * @param {Array} mergedProperties - Array of merged dynamic properties
     * @returns {Object} - Hierarchical object with properties organized by namePath
     */
    static toHierarchy(mergedProperties) {
        const hierarchy = {};
        
        for (const prop of mergedProperties) {
            // Removed group path handling
            // const groupArray = prop.group ? prop.group.split('.') : []; 
            let current = hierarchy;
            
            // Navigate or create the path using only namePath
            const namePathArray = prop.namePathArray || (prop.namePath ? prop.namePath.split('.') : []);
            if (namePathArray.length === 0) continue; // Skip if no name path

            // Navigate to the deepest level but one
            for (let i = 0; i < namePathArray.length - 1; i++) {
                const segment = namePathArray[i];
                if (!current[segment] || typeof current[segment] !== 'object') {
                    current[segment] = {}; // Create/overwrite if not an object
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



            // // Check if p's namePath starts with prop's namePath
            // for (let i = 0; i < prop.namePathArray.length; i++){
            //     if (p.namePathArray[i] !== prop.namePathArray[i]){
            //         // Paths diverge, p is not a child or the same property
            //         return true;
            //     }
            // }



            // // Check for exact match (same namePath, same renderer)
            // const exactMatch = mergedProps.find(
            //     p => p.namePath === prop.namePath
            // );

  