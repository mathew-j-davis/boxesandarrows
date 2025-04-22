# Style Loading Sequence Analysis

## Overview

This document analyzes the sequence of operations that occur when loading styles from YAML files, starting from `DiagramBuilder.loadData()` and tracing through the entire style loading and transformation process.

## Text-Based Sequence Diagram

```
DiagramBuilder.loadData(stylePaths, nodePaths, edgePaths, positionFile, mixedYamlFile)
│
├─► ReaderManager.processStyleFiles(styleFiles, styleHandler)
│   │
│   ├─► For each style file:
│   │   │
│   │   ├─► If file extension is .json:
│   │   │   └─► StyleReader.readFromJson(file)
│   │   │       └─► Return style object
│   │   │
│   │   └─► If file extension is .yaml or .yml:
│   │       └─► StyleReader.readFromYaml(file)
│   │           │
│   │           └─► DynamicPropertyYamlReader.readFile(yamlFile, { 
│   │               │   filter: doc => doc && (doc.type === 'style' || doc.type === 'page') 
│   │               │ })
│   │               │
│   │               └─► DynamicPropertyYamlReader.loadFromYaml(content, options)
│   │                   │
│   │                   ├─► Create custom schema with tags (!renderer, !flag, !clear)
│   │                   │
│   │                   ├─► Parse YAML with custom schema
│   │                   │
│   │                   └─► Transform documents to extract dynamic properties
│   │                       │
│   │                       └─► Return transformed documents with _dynamicProperties array
│   │
│   └─► Return array of style records
│
├─► For each style record:
│   └─► styleHandler.mergeStylesheet(styleRecord)
│       │
│       ├─► If styleRecord has _dynamicProperties:
│       │   └─► styleHandler.mergeDynamicProperties(styleRecord.name || 'default', styleRecord._dynamicProperties)
│       │       │
│       │       ├─► Get existing properties for this style
│       │       │
│       │       ├─► Append new properties to existing ones
│       │       │
│       │       └─► Update the dynamicProperties map
│       │
│       ├─► If styleRecord has style section:
│       │   └─► For each style name and style data:
│       │       └─► Deep merge style data into stylesheet.style[styleName]
│       │
│       └─► If styleRecord has page section:
│           └─► Deep merge page configuration into stylesheet.page
│
└─► Continue with node and edge processing...
```

## YAML File Structure

A typical YAML file with page and style elements might look like:

```yaml
---
type: page
name: default
scale:
  position: { x: 1, y: 1 }
  size: { w: 1, h: 1 }
margin:
  h: 1
  w: 1
---
type: style
name: default
node:
  object:
    tikz:
      draw: "#000000"
      "line width": "0.02cm"
  text:
    latex:
      flags:
        font: "\\sffamily"
        size: "\\small"
edge:
  object:
    tikz:
      draw: "#000000"
      "line width": "0.01cm"
  text:
    latex:
      flags:
        font: "\\sffamily"
        size: "\\tiny"
---
type: style
name: custom
_latex: !renderer
  node:
    object:
      tikz:
        draw: "#FF0000"
        "line width": "0.03cm"
    text:
      latex:
        flags:
          font: "\\bfseries"
```

## Key Observations

1. **Document Separation**: YAML files can contain multiple documents separated by `---`, each with a different type (page or style).

2. **Dynamic Properties**: The `_latex: !renderer` syntax indicates a dynamic property section that will be processed differently from traditional styles.

3. **Merging Process**: 
   - Traditional styles are merged using `ObjectUtils.deepMerge()`
   - Dynamic properties are stored in a separate map and processed by `DynamicPropertyMerger`

4. **Style Handler**: The `StyleHandler` class maintains both the traditional stylesheet structure and the dynamic properties collection.

5. **Renderer-Specific Processing**: The `LatexStyleHandler` extends `StyleHandler` to add LaTeX-specific functionality like color registration and TikZ option generation.

## Next Steps

1. **Analyze Dynamic Property Transformation**: Examine how dynamic properties are transformed into the traditional style format.

2. **Test Hybrid Approach**: Verify that both traditional and dynamic property styles work correctly together.

3. **Optimize Merging**: Consider improvements to the merging process for better performance and clarity.

4. **Enhance Error Handling**: Add more robust error handling for edge cases in the style loading process. 