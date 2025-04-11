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

            // Check for exact match first
            const exactMatch = mergedProps.find(
                p => {
                    return p.name == prop.name && p.group == prop.group;
                }
            );

            // if prop is a scalar we remove any children
            // scalar cannot have children
            // this is invalid:
            // prop: 1
            //    child:2 

            // therefore
            // prop:
            //      child: 2
            // +
            // prop: 1
            // ->
            // prop:1

            // if prop has !clear tag we remove prop
            // if prop value is object we remove prop and children
            //{
            // prop:
            //      child: 2
            // }
            // +
            // prop: !clear
            // ->
            // {}
            // if prop value is scalar we remove prop 
            //{
            // prop: 1
            // }
            // +
            // prop: !clear
            // ->
            // {}

            // if prop is null we treat this like a scalar

            // prop:
            //      child: 2
            // +
            // prop: null
            // ->
            // prop: null

            // the reason for different handling of null and !clear
            // is that in rendering,
            // the absence of prop: may fall back to default values
            // where as explicit null will remove default values

            // if (
            //     // if the value is null
            //     prop.value === null ||

            //     // the value is a scalar or
            //     (
            //         typeof prop.value !== 'object' ||
            //         Array.isArray(prop.value)
            //     )
                
            // )
            // typeof x === 'object' && !Array.isArray(x) && x !== null
            // // Determine if this is a scalar property
            // const isScalar = !prop.value || typeof prop.value !== 'object' || prop.value === null;
            // // typeof yourVariable === 'object' && yourVariable !== null
            let clearChildren = prop.clearChildren

            // // Automatically set clearChildren = true for scalar values
            // if (isScalar) {
            //     clearChildren = true;
            // }
            
            // no need to clear children, just update or add property
            if (!clearChildren){

                let index = -1;

                if(exactMatch){
                    index = mergedProps.indexOf(exactMatch);
                }
                
                if (index > -1){
                    mergedProps[index] = prop
                }
                else
                {
                    mergedProps.push(prop);
                }

                continue;
            }

            // clear children is set.
            mergedProps = mergedProps.filter(p => {

                // belongs to a different group
                if (p.group != prop.group){
                    return true;
                }
                
                // // belongs to a higher priority renderer
                // if (getRendererPriority(p.renderer) > getRendererPriority(prop.renderer)){
                //     return true;
                // }

                // cant be a child if the name array is less than the parent
                if (p.namePathArray.length < prop.namePathArray.length){
                    return true;
                }

                // at this point we are looking at properties that
                // are in the same group and same or lower priority
                // keep properties that are neither a child nor a previous version of the property
                for (let i = 0; i < prop.namePathArray.length; i++){
                    if (p.namePathArray[i] !== prop.namePathArray[i]){
                        return true;
                    }
                }

                // any remaining properties are children or a previous version of the property 
                // than do not have a higher priority
                // these will be removed
                return false;

            });

            mergedProps.push(prop);
            
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
            const namePathArray = prop.namePath.split('.');
            
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
