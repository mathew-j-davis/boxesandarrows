# Style Transformation: Design and Implementation

This document presents a consolidated design for transforming dynamic properties into the traditional style format expected by the rendering system.

## 1. Problem Statement

The system currently has two different approaches to handling styles:

1. **Traditional Approach**: Nested JavaScript objects with a hierarchical structure (e.g., `style.base.edge.object.tikz.draw: "#000000"`)
2. **Dynamic Properties Approach**: Flat array of `DynamicProperty` objects created from YAML with custom tags (`!renderer`, `!group`, etc.)

The rendering system expects the traditional format, but we want to support the dynamic properties format for its flexibility and expressiveness. We need a way to transform from the dynamic format to the traditional format.

## 2. Solution: Transformation Layer

We'll implement a transformation layer that converts the flat array of `DynamicProperty` objects into the nested structure expected by the rendering system. This approach:

- Minimizes disruption to existing code
- Allows gradual migration to the new system
- Maintains backward compatibility
- Separates YAML parsing from style application

## 3. Core Transformation Process

### 3.1 Dynamic Property Structure

A `DynamicProperty` object has these key fields:
- `renderer`: The target renderer (e.g., `_latex`)
- `group`: Grouping path (e.g., `edge.object`)
- `namePath`: Property name path (e.g., `tikz.draw`)
- `value`: Property value
- `dataType`: Type of the value (e.g., `string`, `integer`, `float`, `boolean`)
- `isFlag`: Whether this is a flag property
- `clear`: Whether to clear child properties

### 3.2 Transformation Algorithm

1. **Filter Properties by Renderer**: First filter properties by their `renderer` value (typically `_latex`)
2. **Group by Group Path**: Group properties by their `group` path
3. **Create Nested Structure**: Build the nested object structure based on the `group` and `namePath` hierarchies
4. **Set Property Values**: Add property values to the appropriate locations in the nested structure

The transformation directly produces the final structure without creating an intermediate representation with a renderer prefix.

### 3.3 Handling Special Cases

#### Path-Based Properties
Properties with dots in their `namePath` (e.g., `draw.color`) need to be transformed into nested objects.

```yaml
# Input YAML
_latex: !renderer
  edge: !group
    object: !group
      tikz: !group
        draw.color: "#000000"
        draw.pattern: "dashed"

# Dynamic Properties
[
  {renderer: "_latex", group: "edge.object.tikz", namePath: "draw.color", value: "#000000", ...},
  {renderer: "_latex", group: "edge.object.tikz", namePath: "draw.pattern", value: "dashed", ...}
]

# Transformed Output
{
  edge: {
    object: {
      tikz: {
        draw: {
          color: "#000000",
          pattern: "dashed"
        }
      }
    }
  }
}
```

#### Flag Properties
Flags are special properties that are typically used as-is without further processing.

```yaml
# Input YAML
_latex: !renderer
  edge: !group
    text: !group
      latex: !group
        flags: !group
          font: !flag \sffamily
          size: !flag \small

# Dynamic Properties
[
  {renderer: "_latex", group: "edge.text.latex.flags", namePath: "font", value: "\\sffamily", isFlag: true, ...},
  {renderer: "_latex", group: "edge.text.latex.flags", namePath: "size", value: "\\small", isFlag: true, ...}
]

# Transformed Output
{
  edge: {
    text: {
      latex: {
        flags: {
          font: "\\sffamily",
          size: "\\small"
        }
      }
    }
  }
}
```

#### Clear Children
The `clear` flag indicates that child properties of this property should be cleared.

```yaml
# Input YAML
_latex: !renderer
  edge: !group
    object: !group
      tikz: !group
        draw: !clear "#000000"

# Dynamic Properties
[
  {renderer: "_latex", group: "edge.object.tikz", namePath: "draw", value: "#000000", clear: true, ...}
]

# Transformed Output
{
  edge: {
    object: {
      tikz: {
        draw: "#000000"  // Any previous sub-properties of draw are cleared
      }
    }
  }
}
```

### 3.4 Handling Traditional Styles

The system must properly handle traditional styles (without custom tags) alongside styles defined with dynamic properties. These traditional styles have a nested structure directly in the YAML:

```yaml
# Traditional style example
type: style
name: bend_l_50
edge:
  object:
    tikz:
      bend left: "50"
```

When processing YAML files, we need to:
1. Preserve traditional style properties from the document
2. Apply any dynamic properties on top of the traditional styles
3. Merge the two when both are present for the same style

This ensures backward compatibility with existing styles while allowing gradual migration to the dynamic properties approach.

### 3.5 Style Storage in LatexStyleHandler

In the current implementation, the `LatexStyleHandler` maintains a stylesheet object:

```javascript
// In LatexStyleHandler
this.stylesheet = {
  style: {}, // Styles organized by name
  page: {}   // Page configuration
};
```

When styles are processed:
1. Style documents are passed to `LatexStyleHandler.mergeStylesheet()`
2. Styles are organized in a dictionary keyed by style name:
   ```javascript
   this.stylesheet.style = {
     base: { /* base style properties */ },
     bend_l_50: { /* specific style properties */ },
     // Other styles...
   };
   ```
3. Styles are merged using the existing `deepMergeObjects` method in `LatexStyleHandler`

Our transformation process should integrate with this existing structure and leverage the existing deep merge functionality.

### 3.6 Renderer-Specific Transformations

While the StyleTransformer produces a nested structure that matches what the renderer expects, there are renderer-specific transformations that happen when the styles are actually applied to elements. In the case of the LaTeX renderer, these include:

#### Color Handling
The LaTeX renderer requires hex color values to be registered and converted to named colors for use in the LaTeX document:

```javascript
// Original property in transformed structure
tikz: {
  draw: "#000000",
  fill: "#FFFFFF"
}

// After renderer-specific transformation
tikz: {
  draw: "color000000",
  fill: "colorFFFFFF"
}
```

The renderer then generates the necessary color definitions for the LaTeX preamble:

```latex
\definecolor{color000000}{HTML}{000000}
\definecolor{colorFFFFFF}{HTML}{FFFFFF}
```

This transformation is handled by the `LatexStyleHandler.registerColor()` method, which:
1. Takes a hex color (e.g., `#000000`)
2. Registers it in `this.colorDefinitions` Map if not already present
3. Returns a color name (e.g., `color000000`) to use in the TikZ attributes

#### TikZ Attribute String Generation
The nested structure must be converted to a TikZ attribute string for inclusion in the LaTeX commands:

```javascript
// Transformed object structure
tikz: {
  draw: "color000000",
  "line width": "0.02cm",
  dashed: true
}

// Rendered as TikZ attribute string
"draw=color000000, line width=0.02cm, dashed"
```

This is handled by:
- `LatexStyleHandler.tikzifyStyle()`: Converts a style object's tikz property to a string
- `LatexRenderer.generateTikzOptions()`: Converts a general options object to a TikZ attribute string

#### Structured Property Handling
Some properties like `draw` can have sub-properties that are combined in specific ways for TikZ:

```javascript
// Object structure for draw with multiple properties
tikz: {
  draw: {
    color: "color000000",
    pattern: "dashed"
  }
}

// Rendered as TikZ attribute string
"draw=color000000, dashed"
```

This transformation happens at different levels:
1. The `LatexStyleHandler` processes raw TikZ attributes and converts special values like hex colors
2. The `LatexRenderer` resolves styles and applies them to nodes and edges
3. Special property combinations are handled when generating the final TikZ commands

#### Array Handling (Future)
Array handling will be enhanced in future iterations with specialized tags:

```yaml
# Future array handling with specialized tags
names:
- lyn

names: !append
- bob
- kylie
- ina

name: !index
0: Lyn
1: Bob
2: Kylie
3: !clear
```

## 4. Implementation: StyleTransformer Class

```javascript
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
        const { namePath, value, isFlag, clear, dataType } = property;
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
```

## 5. Integration with StyleReader

```javascript
static async readFromYaml(yamlFile) {
    try {
        // Use DynamicPropertyYamlReader to get style and page documents
        const styleDocuments = await DynamicPropertyYamlReader.readFile(yamlFile, {
            filter: doc => doc && (doc.type === 'style' || doc.type === 'page')
        });
        
        // Read dynamic properties from the same file
        const dynamicProperties = await DynamicPropertyYamlReader.loadDynamicProperties(yamlFile);
        
        // Transform and merge
        const transformedStyles = styleDocuments.map(doc => {
            if (doc.type === 'page') {
                // Page configuration doesn't need transformation
                return doc;
            } else if (doc.type === 'style') {
                const styleName = doc.name || 'base';
                
                // Start with a copy of the original style (preserving traditional properties)
                const styleObject = { ...doc };
                delete styleObject.type;
                delete styleObject.name;
                
                // Only apply dynamic property transformation if there are any
                if (dynamicProperties.length > 0) {
                    // Filter properties for this style by renderer
                    const styleProperties = dynamicProperties.filter(
                        prop => prop.renderer === '_latex'
                    );
                    
                    if (styleProperties.length > 0) {
                        // Transform the properties directly to final format
                        const transformedData = StyleTransformer.transform(styleProperties);
                        
                        // Reconstruct style with traditional and dynamic properties
                        return {
                            type: 'style',
                            name: styleName,
                            ...styleObject,  // Traditional properties
                            ...transformedData  // Dynamic properties
                        };
                        
                        // Note: The actual merging will be done by LatexStyleHandler.mergeStylesheet()
                        // which uses its existing deepMergeObjects method
                    }
                }
                
                // If no dynamic properties, return the traditional style as-is
                return doc;
            }
            return doc;
        });
        
        return transformedStyles;
    } catch (error) {
        console.error(`Error reading YAML file ${yamlFile}:`, error);
        throw error;
    }
}
```

## 6. Testing

### 6.1 Unit Tests

```javascript
describe('StyleTransformer', () => {
    describe('transform', () => {
        it('should transform dynamic properties into nested structure without renderer prefix', () => {
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
            const result = StyleTransformer.transform(properties);
            
            // Assert
            expect(result).toEqual({
                'edge': {
                    'object': {
                        'tikz': {
                            'draw': '#000000',
                            'rounded corners': '0.05cm'
                        }
                    }
                }
            });
            // Confirm there's no _latex prefix
            expect(result._latex).toBeUndefined();
        });
        
        it('should handle clear flag correctly', () => {
            // Arrange
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.draw',
                    dataType: 'string',
                    value: '#000000',
                    isFlag: false,
                    clear: true
                })
            ];
            
            const existingObject = {
                'edge': {
                    'object': {
                        'tikz': {
                            'draw': {
                                'color': '#ffffff',
                                'pattern': 'solid'
                            }
                        }
                    }
                }
            };
            
            // Act
            const result = StyleTransformer.transform(properties);
            // Use LatexStyleHandler.deepMergeObjects for the merge
            const latexStyleHandler = new LatexStyleHandler();
            const merged = latexStyleHandler.deepMergeObjects(existingObject, result);
            
            // Assert
            expect(merged.edge.object.tikz.draw).toBe('#000000');
            expect(merged.edge.object.tikz.draw.color).toBeUndefined();
            expect(merged.edge.object.tikz.draw.pattern).toBeUndefined();
        });
        
        it('should properly merge traditional styles with dynamic properties', () => {
            // Arrange
            const traditionalStyle = {
                edge: {
                    object: {
                        tikz: {
                            draw: '#000000',
                            'line width': '0.02cm'
                        }
                    }
                }
            };
            
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.draw',
                    dataType: 'string',
                    value: '#ff0000',
                    isFlag: false
                })
            ];
            
            // Act
            // Transform dynamic properties directly to final format
            const transformedData = StyleTransformer.transform(properties);
            
            // Create the document to send to LatexStyleHandler
            const styleDoc = {
                type: 'style',
                name: 'base',
                ...traditionalStyle,
                ...transformedData
            };
            
            // Act as if we're passing to LatexStyleHandler
            const latexStyleHandler = new LatexStyleHandler();
            latexStyleHandler.mergeStylesheet({ style: { base: styleDoc } });
            
            // Assert
            const finalStyle = latexStyleHandler.stylesheet.style.base;
            expect(finalStyle.edge.object.tikz.draw).toBe('#ff0000'); // Dynamic property overrides traditional
            expect(finalStyle.edge.object.tikz['line width']).toBe('0.02cm'); // Traditional property preserved
        });
        
        it('should handle renderer-specific color transformation', () => {
            // Arrange
            const properties = [
                new DynamicProperty({
                    renderer: '_latex',
                    group: 'edge.object',
                    namePath: 'tikz.draw',
                    dataType: 'string',
                    value: '#ff0000',
                    isFlag: false
                })
            ];
            
            // Act
            const result = StyleTransformer.transform(properties);
            
            // Create a LatexStyleHandler to process the color
            const latexStyleHandler = new LatexStyleHandler();
            
            // Get the value and register color
            const colorValue = result.edge.object.tikz.draw;
            const colorName = latexStyleHandler.registerColor(colorValue);
            
            // Assert
            expect(colorValue).toBe('#ff0000'); // Original hex value is preserved
            expect(colorName).toBe('colorFF0000'); // Transformed to LaTeX color name
            expect(latexStyleHandler.colorDefinitions.has('colorFF0000')).toBe(true);
            
            // Check the LaTeX color definition
            const definitions = latexStyleHandler.getColorDefinitions();
            expect(definitions).toContain('\\definecolor{colorFF0000}{HTML}{FF0000}');
        });
    });
});
```

### 6.2 Integration Test

```javascript
test('Dynamic properties style should produce expected output', () => {
    // Run command to generate diagram with dynamic properties style
    const command = 'node src/index.js -y examples/dynamic-properties-test.yaml -s examples/style-latex-ab-dynamic.yaml -o output/diagram-with-dynamic-properties';
    
    runCommand(command);
    
    // Get output file path
    const outputPath = path.join(outputDir, 'diagram-with-dynamic-properties.tex');
    expect(fs.existsSync(outputPath)).toBe(true);
    
    // Compare with reference
    const referencePath = path.join(referenceDir, 'reference-dynamic-properties.tex');
    compareWithReference(outputPath, referencePath);
});

test('Traditional style should work alongside dynamic properties', () => {
    // Run command to generate diagram with mixed style file
    const command = 'node src/index.js -y examples/dynamic-properties-test.yaml -s examples/style-latex-mixed.yaml -o output/diagram-with-mixed-style';
    
    runCommand(command);
    
    // Get output file path
    const outputPath = path.join(outputDir, 'diagram-with-mixed-style.tex');
    expect(fs.existsSync(outputPath)).toBe(true);
    
    // Compare output - should match dynamic properties reference
    const referencePath = path.join(referenceDir, 'reference-dynamic-properties.tex');
    compareWithReference(outputPath, referencePath);
});
```

## 7. Implementation Plan

1. Create `StyleTransformer` class
   - Implement core transformation logic
   - Add handling for special cases (clear, etc.)
   - Implement direct transformation to final format without intermediate step

2. Update `StyleReader.readFromYaml` method
   - Integrate with `DynamicPropertyYamlReader`
   - Preserve traditional style properties
   - Transform dynamic properties directly to final format
   - Combine traditional and dynamic properties in the output document

3. Add unit tests for `StyleTransformer`
   - Test basic transformation
   - Test special cases
   - Test merging traditional and dynamic styles
   - Test edge cases

4. Run integration tests
   - Verify end-to-end functionality
   - Compare output with reference files
   - Test files with both traditional and dynamic styles

## 8. Future Enhancements

- Array handling with special operations (`!append`, `!index`)
- Optimizations for large style files (caching, etc.)
- Enhanced error reporting and validation
- Runtime property manipulation API
- Refactor `LatexStyleHandler.mergeStylesheet` and deep merge functionality for reuse 
- Improved handling of structured properties (e.g., converting `draw: { color, pattern }` to combined TikZ syntax)
- Support for other renderers beyond LaTeX 