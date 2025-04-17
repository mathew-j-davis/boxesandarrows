# Style Transformation Layer: Implementation Guide

This document outlines the implementation steps for the Style Transformation layer, starting with standalone unit tests before integration with the rest of the codebase.

## 1. Overview

The Style Transformation layer converts a flat array of `DynamicProperty` objects into a nested structure expected by the rendering system. Our implementation approach will be:

1. Start with standalone unit tests that validate the transformation functionality
2. Implement the core `StyleTransformer` class
3. Test with various scenarios before integration
4. Finally integrate with the existing codebase

## 2. Implementation Steps

### 2.1 Create StyleTransformer Class

First, we'll create a standalone `StyleTransformer` class with the core transformation functionality:

```javascript
// src/styles/style-transformer.js
class StyleTransformer {
    /**
     * Transform dynamic properties into the traditional style format
     * @param {Array} properties - Array of dynamic properties (already filtered by renderer)
     * @returns {Object} - Transformed style object
     */
    static transform(properties) {
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
                    this.addPropertyToObject(result, property);
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
                    this.addPropertyToObject(current[lastGroup], property);
                });
            }
        });

        return result;
    }

    /**
     * Add a property to an object, handling path-based properties
     * @param {Object} obj - Object to add the property to
     * @param {Object} property - The dynamic property object
     */
    static addPropertyToObject(obj, property) {
        const { namePath, value, isFlag, clear } = property;
        const parts = namePath.split('.');
        
        // Note: Values are already converted to the correct data type
        // by the DynamicPropertyParser, so no conversion is needed here

        if (parts.length === 1) {
            // Simple property
            if (clear && typeof obj[namePath] === 'object') {
                // If clear is true and property exists as object,
                // replace it entirely with the new value
                obj[namePath] = value;
            } else {
                obj[namePath] = value;
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
                current[lastPart] = value;
            } else {
                current[lastPart] = value;
            }
        }
    }
}

module.exports = StyleTransformer;
```

### 2.2 Create a Simple DynamicProperty Class for Testing

Before we integrate with the real `DynamicProperty` class, we'll create a simple implementation for testing:

```javascript
// tests/mocks/dynamic-property.js
class DynamicProperty {
    constructor({
        renderer,
        group,
        namePath,
        value,
        dataType = 'string',
        isFlag = false,
        clear = false
    }) {
        this.renderer = renderer;
        this.group = group;
        this.namePath = namePath;
        this.value = value;
        this.dataType = dataType;
        this.isFlag = isFlag;
        this.clear = clear;
    }
}

module.exports = DynamicProperty;
```

### 2.3 Create Unit Tests

Now we'll create unit tests for the `StyleTransformer` class:

```javascript
// tests/unit/styles/style-transformer.test.js
const StyleTransformer = require('../../../src/styles/style-transformer');
const DynamicProperty = require('../../mocks/dynamic-property');

describe('StyleTransformer', () => {
    describe('transform', () => {
        it('should transform basic properties into nested structure', () => {
            // Arrange
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.draw',
                    value: '#000000'
                }),
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.line width',
                    value: '0.02cm'
                })
            ];
            
            // Act
            const result = StyleTransformer.transform(properties);
            
            // Assert
            expect(result).toEqual({
                edge: {
                    object: {
                        tikz: {
                            draw: '#000000',
                            'line width': '0.02cm'
                        }
                    }
                }
            });
        });

        it('should handle properties with dots in namePath', () => {
            // Arrange
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object.tikz',
                    namePath: 'draw.color',
                    value: '#000000'
                }),
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object.tikz',
                    namePath: 'draw.pattern',
                    value: 'dashed'
                })
            ];
            
            // Act
            const result = StyleTransformer.transform(properties);
            
            // Assert
            expect(result).toEqual({
                edge: {
                    object: {
                        tikz: {
                            draw: {
                                color: '#000000',
                                pattern: 'dashed'
                            }
                        }
                    }
                }
            });
        });

        it('should handle the clear flag', () => {
            // Arrange
            // First create an object with nested properties
            const existingObj = {
                edge: {
                    object: {
                        tikz: {
                            draw: {
                                color: '#ffffff',
                                pattern: 'solid'
                            }
                        }
                    }
                }
            };
            
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.draw',
                    value: '#000000',
                    clear: true
                })
            ];
            
            // Act
            const result = StyleTransformer.transform(properties);
            
            // Create a deep merge function for testing
            const deepMerge = (target, source) => {
                for (const key in source) {
                    if (typeof source[key] === 'object' && source[key] !== null && 
                        typeof target[key] === 'object' && target[key] !== null) {
                        deepMerge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
                return target;
            };
            
            // Merge the result with the existing object
            const merged = deepMerge(JSON.parse(JSON.stringify(existingObj)), result);
            
            // Assert
            expect(merged.edge.object.tikz.draw).toBe('#000000');
            expect(merged.edge.object.tikz.draw.color).toBeUndefined();
            expect(merged.edge.object.tikz.draw.pattern).toBeUndefined();
        });

        it('should handle flag properties', () => {
            // Arrange
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.text.latex.flags',
                    namePath: 'font',
                    value: '\\sffamily',
                    isFlag: true
                }),
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.text.latex.flags',
                    namePath: 'size',
                    value: '\\small',
                    isFlag: true
                })
            ];
            
            // Act
            const result = StyleTransformer.transform(properties);
            
            // Assert
            expect(result).toEqual({
                edge: {
                    text: {
                        latex: {
                            flags: {
                                font: '\\sffamily',
                                size: '\\small'
                            }
                        }
                    }
                }
            });
        });

        it('should handle different data types', () => {
            // Arrange
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.line width',
                    value: 2,
                    dataType: 'integer'
                }),
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.dashed',
                    value: true,
                    dataType: 'boolean'
                }),
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.opacity',
                    value: 0.5,
                    dataType: 'float'
                })
            ];
            
            // Act
            const result = StyleTransformer.transform(properties);
            
            // Assert
            expect(result).toEqual({
                edge: {
                    object: {
                        tikz: {
                            'line width': 2,
                            'dashed': true,
                            'opacity': 0.5
                        }
                    }
                }
            });
        });

        it('should handle properties without a group', () => {
            // Arrange
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    namePath: 'width',
                    value: '10cm'
                }),
                new DynamicProperty({
                    renderer: '_latex',
                    namePath: 'height',
                    value: '5cm'
                })
            ];
            
            // Act
            const result = StyleTransformer.transform(properties);
            
            // Assert
            expect(result).toEqual({
                width: '10cm',
                height: '5cm'
            });
        });
    });
});
```

## 3. Running the Tests

To run these tests independently, we'll use Jest:

```bash
# Install Jest if not already installed
npm install --save-dev jest

# Run the tests
npx jest tests/unit/styles/style-transformer.test.js
```

## 4. Next Steps

After validating the standalone functionality with unit tests, the next steps will be:

1. **Create Integration Tests**: Test the interaction with `DynamicPropertyYamlReader`
2. **Update the StyleReader**: Modify `StyleReader.readFromYaml()` to use the transformer
3. **Test with Real YAML Files**: Create test YAML files with dynamic properties
4. **Implement LaTeX Color Handling**: Test the integration with `LatexStyleHandler.registerColor()`

## 5. Testing with Real Style Scenarios

For more comprehensive testing, we should create test files that represent real-world style scenarios:

### Basic Style Test
Test a simple style with a few properties:

```javascript
const properties = [
    new DynamicProperty({
        renderer: '_latex',
        group: 'edge.object',
        namePath: 'tikz.draw',
        value: '#000000'
    }),
    new DynamicProperty({
        renderer: '_latex',
        group: 'edge.object',
        namePath: 'tikz.line width',
        value: '0.02cm'
    })
];
```

### Comprehensive Style Test
Test a more complex style with nested properties, flags, and various data types:

```javascript
const properties = [
    // Basic properties
    new DynamicProperty({
        renderer: '_latex',
        group: 'node.object',
        namePath: 'tikz.draw',
        value: '#000000'
    }),
    
    // Nested properties
    new DynamicProperty({
        renderer: '_latex',
        group: 'node.object.tikz',
        namePath: 'fill.color',
        value: '#ffffff'
    }),
    
    // Flag properties
    new DynamicProperty({
        renderer: '_latex',
        group: 'node.text.latex.flags',
        namePath: 'font',
        value: '\\sffamily',
        isFlag: true
    }),
    
    // Properties with clear
    new DynamicProperty({
        renderer: '_latex',
        group: 'edge.object',
        namePath: 'tikz.draw',
        value: '#ff0000',
        clear: true
    }),
    
    // Different data types
    new DynamicProperty({
        renderer: '_latex',
        group: 'page',
        namePath: 'width',
        value: 10,
        dataType: 'integer'
    }),
    new DynamicProperty({
        renderer: '_latex',
        group: 'page',
        namePath: 'showGrid',
        value: true,
        dataType: 'boolean'
    })
];
```

## 6. Implementation Approach

Our implementation approach follows these principles:

1. **Standalone Testing First**: Validate the core functionality before integration
2. **Incremental Integration**: Add integration with one component at a time
3. **Comprehensive Test Coverage**: Test all edge cases and special scenarios
4. **Clear Separation of Concerns**: Keep transformation logic separate from YAML parsing and style application

This approach allows us to develop and test the transformation layer independently before integrating it with the rest of the codebase. 