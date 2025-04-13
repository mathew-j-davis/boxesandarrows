# Style Handling: Transformation Layer Approach

This document outlines the chosen approach for integrating the new dynamic property style format (produced by `DynamicPropertyYamlReader`) with the existing style processing logic (`LatexStyleHandler`).

## Problem

-   The `DynamicPropertyYamlReader` parses YAML with custom tags (`!renderer`, `!group`, etc.) into a flat array of `DynamicProperty` objects, each with a `renderer`, `group`, `namePath`, `value`, etc.
-   The existing `LatexStyleHandler` (and associated renderer code) expects styles defined as nested JavaScript objects (e.g., `style.base.edge.object.tikz`).
-   A direct integration would require rewriting `LatexStyleHandler` to understand the flat dynamic property structure, which is a significant change.

## Chosen Solution: Approach 3 - Transformation Layer

-   **Create a `StyleTransformer` class.**
-   This class will be responsible for converting the flat array of `DynamicProperty` objects back into the nested object structure expected by `LatexStyleHandler`.
-   The `StyleReader` will use `DynamicPropertyYamlReader` to read the YAML and then use `StyleTransformer` to convert the result before passing it to `LatexStyleHandler`.

## Transformation Logic (`StyleTransformer`)

-   Group incoming dynamic properties by `renderer`.
-   Within each renderer group, reconstruct the nested object structure based on the `group` and `namePath` properties.
-   Handle path-based properties (e.g., `draw.color` becoming nested under `draw`).
-   Ensure correct handling of different property types (scalar, flag, clear, array - though array/clear handling might be deferred).

## Rationale

-   **Minimal Disruption:** The core logic of `LatexStyleHandler` and the renderer remains largely unchanged in the initial phase.
-   **Gradual Migration:** Allows the system to support both old and new style formats during transition.
-   **Backward Compatibility:** Existing style YAML files (without custom tags) should still be processable (though `DynamicPropertyYamlReader` handles this).
-   **Decoupling:** Separates the concern of YAML parsing/tag handling from the concern of style application.

## Detailed Design

### 1. `StyleTransformer` Class

```javascript
class StyleTransformer {
    /**
     * Transform dynamic properties into the old style format
     * @param {Array} properties - Array of dynamic properties
     * @returns {Object} - Transformed style object
     */
    static transformToOldFormat(properties) {
        const result = {};

        // Group properties by renderer
        const rendererGroups = {};
        properties.forEach(property => {
            if (!rendererGroups[property.renderer]) {
                rendererGroups[property.renderer] = [];
            }
            rendererGroups[property.renderer].push(property);
        });

        // Process each renderer group
        Object.entries(rendererGroups).forEach(([renderer, props]) => {
            result[renderer] = this.processRendererProperties(props);
        });

        return result;
    }

    /**
     * Process properties for a renderer
     * @param {Array} properties - Array of dynamic properties for a renderer
     * @returns {Object} - Transformed style object for the renderer
     */
    static processRendererProperties(properties) {
        const result = {};

        // Group properties by group path
        const groupGroups = {};
        properties.forEach(property => {
            const groupPath = property.group || '';
            if (!groupGroups[groupPath]) {
                groupGroups[groupPath] = [];
            }
            groupGroups[groupPath].push(property);
        });

        // Process each group
        Object.entries(groupGroups).forEach(([groupPath, props]) => {
            if (groupPath === '') {
                // Properties without a group go directly into the result
                props.forEach(property => {
                    this.addPropertyToObject(result, property.namePath, property.value, property.isFlag, property.clear);
                });
            } else {
                // Properties with a group go into a nested object
                const groupParts = groupPath.split('.');
                let current = result;

                // Create the nested structure
                for (let i = 0; i < groupParts.length - 1; i++) {
                    const part = groupParts[i];
                    if (!current[part]) {
                        current[part] = {};
                    }
                    current = current[part];
                }

                // Add properties to the last group
                const lastGroup = groupParts[groupParts.length - 1];
                if (!current[lastGroup]) {
                    current[lastGroup] = {};
                }

                props.forEach(property => {
                    this.addPropertyToObject(current[lastGroup], property.namePath, property.value, property.isFlag, property.clear);
                });
            }
        });

        return result;
    }

    /**
     * Add a property to an object, handling path-based properties
     * @param {Object} obj - Object to add the property to
     * @param {string} namePath - Property name path
     * @param {*} value - Property value
     * @param {boolean} isFlag - Whether this is a flag property
     * @param {boolean} clear - Whether to clear child properties
     */
    static addPropertyToObject(obj, namePath, value, isFlag, clear) {
        // Handle path-based properties (e.g., draw.color)
        const parts = namePath.split('.');
        
        // Convert the final value based on isFlag
        const processedValue = isFlag ? 
            // For flags, typically just use the value as a flag name
            value : 
            // For regular properties, use the value directly
            value;
        
        if (parts.length === 1) {
            // Simple property
            if (clear && typeof obj[namePath] === 'object') {
                // If clear is true and property exists as object,
                // replace it entirely with the new value
                obj[namePath] = processedValue;
            } else {
                obj[namePath] = processedValue;
            }
        } else {
            // Path-based property
            let current = obj;
            
            // Create the nested structure
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = {};
                }
                current = current[part];
            }
            
            // Add the property to the last part
            const lastPart = parts[parts.length - 1];
            
            // Handle clear for nested properties
            if (clear && typeof current[lastPart] === 'object') {
                // Replace the entire object with the new value
                current[lastPart] = processedValue;
            } else {
                current[lastPart] = processedValue;
            }
        }
    }
}
```

### 2. Update `StyleReader`

```javascript
static async readFromYaml(yamlFile) {
    try {
        // Use DynamicPropertyYamlReader to get documents with 'style' and 'page' types
        const styles = await DynamicPropertyYamlReader.readFile(yamlFile, {
            filter: doc => doc && (doc.type === 'style' || doc.type === 'page')
        });

        // Transform dynamic properties into the old format
        const transformedStyles = styles.map(style => {
            if (style.type === 'page') {
                // Page configuration doesn't need transformation
                return style;
            } else if (style.type === 'style') {
                // Transform style definition
                const styleName = style.name || 'base';
                // *** NOTE: Assumes dynamic properties are attached to the style doc ***
                // *** Adjust this if DynamicPropertyYamlReader.readFile returns properties differently ***
                const dynamicProperties = style._dynamicProperties || []; 

                // Transform the properties
                const transformedData = StyleTransformer.transformToOldFormat(dynamicProperties);

                // Reconstruct the style object in the old format
                const transformedStyle = {
                    type: 'style',
                    name: styleName,
                    ...transformedData // Spread the transformed nested structure
                };
                return transformedStyle;
            }
            return style; // Return other document types unchanged
        });

        return transformedStyles;
    } catch (error) {
        console.error(`Error reading YAML file ${yamlFile}:`, error);
        throw error;
    }
}
```
*Note: The `StyleReader` snippet includes a comment highlighting a potential assumption about how dynamic properties are returned by `DynamicPropertyYamlReader.readFile`. This might need adjustment based on the actual implementation.* 

## Next Steps (Implementation Plan)

1.  Implement the `StyleTransformer` class with the transformation logic.
2.  Update `StyleReader.readFromYaml` to invoke the `StyleTransformer` after reading styles with `DynamicPropertyYamlReader`.
3.  Run integration tests (`dynamic-properties-integration.test.js`) to verify the solution.
4.  Add unit tests for `StyleTransformer`.

## Additional Implementation Details and Considerations

### Enhanced Property Object Handling

```javascript
static addPropertyToObject(obj, namePath, value, isFlag, clear) {
    // Handle path-based properties (e.g., draw.color)
    const parts = namePath.split('.');
    
    // Convert the final value based on isFlag
    const processedValue = isFlag ? 
        // For flags, typically just use the value as a flag name
        value : 
        // For regular properties, use the value directly
        value;
        
    if (parts.length === 1) {
        // Simple property
        if (clear && typeof obj[namePath] === 'object') {
            // If clear is true and property exists as object,
            // replace it entirely with the new value
            obj[namePath] = processedValue;
        } else {
            obj[namePath] = processedValue;
        }
    } else {
        // Path-based property
        let current = obj;
        
        // Create the nested structure
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        }
        
        // Add the property to the last part
        const lastPart = parts[parts.length - 1];
        
        // Handle clear for nested properties
        if (clear && typeof current[lastPart] === 'object') {
            // Replace the entire object with the new value
            current[lastPart] = processedValue;
        } else {
            current[lastPart] = processedValue;
        }
    }
}
```

### Integration with DynamicPropertyYamlReader

When integrating with `DynamicPropertyYamlReader`, we need to consider how it returns data:

```javascript
static async readFromYaml(yamlFile) {
    try {
        // Get the raw documents first
        const stylesDocuments = await DynamicPropertyYamlReader.readFile(yamlFile, {
            filter: doc => doc && (doc.type === 'style' || doc.type === 'page')
        });
        
        // For style documents, process any dynamic properties 
        // This step varies based on how DynamicPropertyYamlReader returns its data
        const dynamicProperties = await DynamicPropertyYamlReader.loadDynamicProperties(yamlFile);
        
        // Transform styles with the dynamic properties
        const transformedStyles = stylesDocuments.map(style => {
            if (style.type === 'page') {
                // Page configuration doesn't need transformation
                return style;
            } else if (style.type === 'style') {
                const styleName = style.name || 'base';
                
                // Filter properties for this style
                const styleProperties = dynamicProperties.filter(
                    prop => prop.renderer === '_latex' && (
                        !prop.namePath.includes('.') || 
                        prop.namePath.startsWith(styleName + '.')
                    )
                );
                
                // Transform the properties
                const transformedData = StyleTransformer.transformToOldFormat(styleProperties);
                
                // Reconstruct the style object
                const transformedStyle = {
                    type: 'style',
                    name: styleName,
                    ...transformedData // Spread the transformed structure
                };
                return transformedStyle;
            }
            return style;
        });
        
        return transformedStyles;
    } catch (error) {
        console.error(`Error reading YAML file ${yamlFile}:`, error);
        throw error;
    }
}
```

### Type Conversion Handling

Add proper type conversion based on the `dataType` field:

```javascript
static convertValueByType(value, dataType) {
    if (value === null || value === undefined) {
        return value;
    }
    
    switch (dataType) {
        case 'integer':
            return parseInt(value, 10);
        case 'float':
            return parseFloat(value);
        case 'boolean':
            return Boolean(value);
        case 'string':
        default:
            return String(value);
    }
}
```

### Array Handling

Handle array values appropriately:

```javascript
static addPropertyToObject(obj, property) {
    const { namePath, value, isFlag, clear, dataType } = property;
    const parts = namePath.split('.');
    
    // Convert value based on type
    const processedValue = isFlag ? 
        value : 
        this.convertValueByType(value, dataType);
    
    // Handle array values
    if (dataType === 'array' && Array.isArray(value)) {
        // For arrays, we need special handling
        if (parts.length === 1) {
            obj[namePath] = value; // Arrays are kept as-is
        } else {
            // Path-based array property
            let current = obj;
            
            // Create the nested structure
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = {};
                }
                current = current[part];
            }
            
            // Add the array to the last part
            const lastPart = parts[parts.length - 1];
            current[lastPart] = value;
        }
        return;
    }
    
    // Handle regular values (existing code)...
}
```

### Testing Strategy

For proper testing of the `StyleTransformer`:

1. **Unit Tests** for isolated transformation logic:
   - Test transforming dynamic properties with various structures
   - Test handling of edge cases (null values, empty arrays, etc.)
   - Test type conversions
   - Test merging behavior

2. **Integration Tests** (already planned):
   - Verify end-to-end workflow with real YAML input
   - Compare output with expected nested structure

A sample unit test approach:

```javascript
describe('StyleTransformer', () => {
    describe('transformToOldFormat', () => {
        it('should transform flat dynamic properties into nested structure', () => {
            // Arrange
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.draw',
                    dataType: 'string',
                    value: '#000000',
                    isFlag: false
                }),
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.rounded corners',
                    dataType: 'string',
                    value: '0.05cm',
                    isFlag: false
                })
            ];
            
            // Act
            const result = StyleTransformer.transformToOldFormat(properties);
            
            // Assert
            expect(result).toEqual({
                '_latex': {
                    'edge': {
                        'object': {
                            'tikz': {
                                'draw': '#000000',
                                'rounded corners': '0.05cm'
                            }
                        }
                    }
                }
            });
        });
        
        // Additional tests...
    });
});
```

### Implementation Considerations

1. **Error Handling**:
   - Add detailed error handling in the transformer
   - Consider reporting warnings for unprocessable properties

2. **Performance**:
   - For large style files, this transformation might be expensive
   - Consider caching transformed results if styles are reused

3. **Documentation**:
   - Document the transformation process clearly
   - Add examples of input/output formats

4. **Logging**:
   - Add verbose logging for debugging transformation issues 