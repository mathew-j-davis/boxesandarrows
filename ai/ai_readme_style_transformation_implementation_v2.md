# Style Transformation Layer: Implementation Guide (v2)

This document outlines the implementation steps for the Style Transformation layer, starting with standalone unit tests using the actual `DynamicProperty` class before integration with the rest of the codebase.

## 1. Overview

The Style Transformation layer converts a flat array of `DynamicProperty` objects into a nested structure expected by the rendering system. Our implementation approach will be:

1. Implement the core `StyleTransformer` class using an efficient top-down approach.
2. Create standalone unit tests using the real `DynamicProperty` class to validate the transformation functionality.
3. Test with various scenarios before integration.
4. Finally integrate with the existing codebase.

## 2. Implementation Steps

### 2.1 Implement StyleTransformer Class

First, we'll create the `StyleTransformer` class using a **top-down approach**. This method directly builds the nested structure within the result object, which is generally more efficient than creating temporary objects for each property and merging them.

Note that the `clear` flag is handled by the `DynamicPropertyMerger` before properties reach this transformer, so we don't need explicit checks for it here. Assigning a value at a specific path will naturally overwrite any previous structure at that path, achieving the desired effect.

```javascript
// src/styles/style-transformer.js
const DynamicProperty = require('../io/models/dynamic-property'); // Ensure path is correct

class StyleTransformer {
    /**
     * Transform dynamic properties into the traditional style format using a top-down approach.
     * Assumes properties have already been merged and filtered (e.g., by DynamicPropertyMerger).
     * Relies on DynamicProperty having `namePathArray` and `groupPathArray`.
     * @param {Array<DynamicProperty>} properties - Array of dynamic properties.
     * @returns {Object} - Transformed style object.
     */
    static transform(properties) {
        const result = {}; // Start with an empty object

        properties.forEach(property => {
            // Defensive check for necessary arrays
            if (!property.namePathArray || property.namePathArray.length === 0) {
                 console.warn("StyleTransformer skipping property due to missing or empty namePathArray:", property);
                 return; // Skip this property
            }

            let current = result;

            // 1. Navigate/create group path
            if (property.groupPathArray && property.groupPathArray.length > 0) {
                for (const part of property.groupPathArray) {
                    // Create object if path part doesn't exist or isn't an object
                    if (!current[part] || typeof current[part] !== 'object') {
                        current[part] = {}; 
                    }
                    current = current[part]; // Descend into the group structure
                }
            }
            // If groupPathArray is empty/null, current remains the root 'result' object

            // 2. Navigate/create name path (except last element)
            const nameParts = property.namePathArray;
            for (let i = 0; i < nameParts.length - 1; i++) {
                const part = nameParts[i];
                 // Create object if path part doesn't exist or isn't an object
                 if (!current[part] || typeof current[part] !== 'object') {
                    current[part] = {};
                }
                current = current[part]; // Descend into the name structure
            }

            // 3. Assign the value at the final leaf of the name path
            const finalNamePart = nameParts[nameParts.length - 1];
            current[finalNamePart] = property.value;
            // This assignment naturally handles the "clear" effect by overwriting
        });

        return result;
    }
}

module.exports = StyleTransformer;
```

### 2.2 Create Unit Tests

Now we'll create unit tests using the real `DynamicProperty` class. The tests remain largely the same, verifying the final structure produced by the `transform` method.

```javascript
// tests/unit/styles/style-transformer.test.js
const StyleTransformer = require('../../../src/styles/style-transformer');
const DynamicProperty = require('../../../src/io/models/dynamic-property'); // Use the real class

describe('StyleTransformer', () => {
    describe('transform (Top-Down Approach)', () => { // Updated describe block name
        it('should transform basic properties into nested structure', () => {
            // Arrange
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.draw',
                    value: '#000000',
                    // Assume namePathArray/groupPathArray are set by constructor or parser
                    namePathArray: ['tikz', 'draw'], 
                    groupPathArray: ['edge', 'object'] 
                }),
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.line width',
                    value: '0.02cm',
                    namePathArray: ['tikz', 'line width'],
                    groupPathArray: ['edge', 'object']
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

        it('should handle properties with dots in namePath correctly', () => {
             // Arrange
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object.tikz', 
                    namePath: 'draw.color',
                    value: '#000000',
                    namePathArray: ['draw', 'color'], 
                    groupPathArray: ['edge', 'object', 'tikz'] 
                }),
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object.tikz',
                    namePath: 'draw.pattern',
                    value: 'dashed',
                    namePathArray: ['draw', 'pattern'],
                    groupPathArray: ['edge', 'object', 'tikz']
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

        it('should overwrite existing structures when a property is set (simulating clear effect)', () => {
            // Arrange
            // Simulate properties processed by DynamicPropertyMerger
            // The final property assignment overwrites previous values/structures at that path.
            const properties = [
                 new DynamicProperty({ // Property that might exist before
                    renderer: '_latex',
                    group: 'edge.object.tikz',
                    namePath: 'draw.color',
                    value: '#ffffff',
                    namePathArray: ['draw', 'color'],
                    groupPathArray: ['edge', 'object', 'tikz']
                }),
                 new DynamicProperty({ // Property that might exist before
                    renderer: '_latex',
                    group: 'edge.object.tikz',
                    namePath: 'draw.pattern',
                    value: 'solid',
                    namePathArray: ['draw', 'pattern'],
                    groupPathArray: ['edge', 'object', 'tikz']
                }),
                new DynamicProperty({ // The property that overwrites
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.draw',
                    value: '#000000',
                    namePathArray: ['tikz', 'draw'],
                    groupPathArray: ['edge', 'object']
                    // clear flag itself is not used by transformer
                })
            ];
            
            // Act
            const result = StyleTransformer.transform(properties);
            
            // Assert: The final assignment of 'tikz.draw' overwrites the nested object structure.
            expect(result).toEqual({
                edge: {
                    object: {
                        tikz: {
                            draw: '#000000' // Simple value overwrites previous structure
                        }
                    }
                }
            });
        });

        it('should handle flag properties correctly', () => {
            // Arrange
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.text.latex.flags',
                    namePath: 'font',
                    value: '\\sffamily',
                    isFlag: true,
                    namePathArray: ['font'],
                    groupPathArray: ['edge', 'text', 'latex', 'flags']
                }),
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.text.latex.flags',
                    namePath: 'size',
                    value: '\\small',
                    isFlag: true,
                    namePathArray: ['size'],
                    groupPathArray: ['edge', 'text', 'latex', 'flags']
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

        it('should handle different data types passed in value', () => {
            // Arrange
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.line width',
                    value: 2,
                    namePathArray: ['tikz', 'line width'],
                    groupPathArray: ['edge', 'object']
                }),
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.dashed',
                    value: true,
                    namePathArray: ['tikz', 'dashed'],
                    groupPathArray: ['edge', 'object']
                }),
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.opacity',
                    value: 0.5,
                    namePathArray: ['tikz', 'opacity'],
                    groupPathArray: ['edge', 'object']
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

        it('should handle properties without a group correctly', () => {
             // Arrange
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: null, // or empty string/array depending on DynamicProperty impl
                    namePath: 'width',
                    value: '10cm',
                    namePathArray: ['width'],
                    groupPathArray: [] // or null
                }),
                new DynamicProperty({
                    renderer: '_latex',
                    group: null,
                    namePath: 'height',
                    value: '5cm',
                    namePathArray: ['height'],
                    groupPathArray: []
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
        
        // Add test case for overlapping paths
        it('should correctly handle properties with overlapping paths', () => {
            const properties = [
                 new DynamicProperty({
                    renderer: '_latex',
                    group: 'a.b',
                    namePath: 'c',
                    value: 1,
                    namePathArray: ['c'],
                    groupPathArray: ['a', 'b']
                }),
                 new DynamicProperty({
                    renderer: '_latex',
                    group: 'a',
                    namePath: 'b.d',
                    value: 2,
                    namePathArray: ['b', 'd'],
                    groupPathArray: ['a']
                }),
                 new DynamicProperty({
                    renderer: '_latex',
                    group: 'a.b.c',
                    namePath: 'e',
                    value: 3,
                    namePathArray: ['e'],
                    groupPathArray: ['a', 'b', 'c']
                }),
            ];

            const result = StyleTransformer.transform(properties);

            expect(result).toEqual({
                a: {
                    b: {
                        c: { e: 3 }, // Note: value 1 for c gets overwritten by object {e: 3}
                        d: 2
                    }
                }
            });
        });
    });
});
```

## 3. Running the Tests

Ensure the real `DynamicProperty` class provides `namePathArray` and `groupPathArray` (or modify the tests/transformer to split the strings if needed). Then run the tests using Jest:

```bash
# Install Jest if not already installed
npm install --save-dev jest

# Run the tests (adjust path if needed)
npx jest tests/unit/styles/style-transformer.test.js
```

## 4. Next Steps

After validating the standalone functionality with unit tests, the next steps will be:

1. **Integrate with `DynamicPropertyMerger`**: Test the flow where properties are first merged and then transformed.
2. **Update the `StyleReader`**: Modify `StyleReader.readFromYaml()` to use the `DynamicPropertyMerger` and then the `StyleTransformer`.
3. **Test with Real YAML Files**: Create test YAML files with dynamic properties and traditional styles to test the full pipeline.
4. **Verify Integration with `LatexStyleHandler`**: Ensure the transformed output merges correctly with traditional styles using `LatexStyleHandler.mergeStylesheet` (which uses `ObjectUtils.deepMerge`).

## 5. Implementation Approach

Our implementation approach follows these principles:

1. **Use Real Components**: Test with the actual `DynamicProperty` class.
2. **Clear Separation of Concerns**: `DynamicPropertyMerger` handles merging and `!clear`. `StyleTransformer` handles structural transformation. `LatexStyleHandler` handles merging the final structure into the stylesheet.
3. **Incremental Integration**: Test components individually before testing the integrated pipeline.
4. **Comprehensive Test Coverage**: Cover all edge cases and special scenarios at each stage.

This approach allows us to build and verify the transformation layer with confidence before integrating it fully. 