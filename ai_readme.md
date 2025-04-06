# BoxesAndArrows AI Assistant Guide

## Project Overview
BoxesAndArrows is a diagram generator that creates node-based diagrams using LaTeX and TikZ. It's designed to generate high-quality, reproducible diagrams from data files, making it ideal for:
- Technical documentation
- Academic papers
- System architecture diagrams
- Flow charts
- Relationship diagrams
- Any diagram that can be represented as nodes and edges

The core philosophy is separation of concerns:
- Content (nodes and edges) is defined in data files (CSV/YAML/JSON)
- Styling is defined separately in style files
- Layout and positioning can be either explicit or reference-based
- Output is generated as LaTeX/TikZ code for high-quality vector graphics

## Core Concepts

### Nodes
- Fundamental building blocks of diagrams
- Can be positioned absolutely or relative to other nodes
- Have dimensions (width/height) that can be explicit or calculated
- Support anchors (north, south, east, west, etc.) for edge connections
- Can be styled individually or through style inheritance

### Edges
- Connect nodes to represent relationships
- Can connect to specific node anchors
- Support various styles (lines, arrows, etc.)
- Can have labels and decorations
- Automatically route between nodes

### Reference-Based Positioning
Nodes can be positioned:
- Using absolute coordinates
- Relative to other nodes using:
  - Reference node
  - Anchor points
  - Offsets
  - Scale factors
This allows for flexible, maintainable layouts that automatically adjust.

### Style System
Hierarchical style system that allows:
- Base styles for consistent defaults
- Named styles for reusable configurations
- Individual overrides for specific elements
- Style inheritance and composition
- Separation of content from presentation

### Input Format Support
- CSV: Simple tabular data, good for basic node/edge definitions
- YAML: Rich hierarchical data, good for complex structures
- JSON: Programmatic generation, good for tool integration

### TikZ Integration
- Generates TikZ code for LaTeX integration
- Supports full TikZ feature set
- Produces vector graphics
- Maintains typographical consistency with LaTeX documents

## Key Concepts

### Dynamic Properties

#### Updated Naming Convention (New Format)
Properties starting with underscore follow this naming convention:
```
_{renderer}_{group}_{type}_{name}    # Full pattern
_{renderer}___{type}_{name}          # No group (double underscore)
____{type}_{name}                   # No renderer or group (triple underscore)
```

This format places the renderer first, followed by the group, datatype, and name.

#### Hierarchical Groups
Groups support a hierarchical structure using dots:
```
_{renderer}_{group.subgroup.subsubgroup}_{type}_{name}
```

For example:
```
_latex_tikz.font.style_string_family: "serif"
```

This creates a nested hierarchy in the final output structure:
```javascript
{
  tikz: {
    font: {
      style: {
        family: "serif"
      }
    }
  }
}
```

#### Empty and Null Groups
- Empty group (`__`) creates a property at the root level
- The empty group is represented as an empty string in the parsed property: `groupPath: ''`
- The group array for an empty group is an empty array: `groupArray: []`

#### Valid Types
- string
- float
- number
- integer
- boolean
- flag (special type that uses string datatype with flag=true)

#### Valid Renderers
- common (default when renderer is empty)
- vector
- svg
- latex

#### Examples:
```
_latex_tikz_float_rotation: 90.5     # Renderer=latex, group=tikz, type=float, name=rotation
_latex__string_title: "Hello"        # Renderer=latex, no group, type=string, name=title
___float_rotation: 90               # No renderer (defaults to common), no group, type=float, name=rotation
_latex_tikz.font.style_string_family: "serif"  # Hierarchical group with multiple levels
```

#### Special Handling for Null and Undefined Values
- When `value === null`, `datatype` is set to `null`
- When `value === undefined`, `datatype` is set to `undefined`
- This preserves the original null/undefined state without attempting type conversion

#### Renderer Equivalence
- Properties with `renderer: null` and `renderer: 'common'` are treated as equivalent
- Properties with more specific renderers take priority over common ones during merging

### Dynamic Property Merger
The DynamicPropertyMerger handles combining properties from different sources:

1. Properties are uniquely identified by their `groupPath` and `name` combination
2. When duplicate properties are found, the one with the higher renderer priority wins
3. Properties are merged in a single pass for efficiency
4. The merger can convert flat properties into a hierarchical structure using `toHierarchy()`

### Record Merging
When merging records:
- undefined values don't override existing values
- null values override existing values
- empty strings ('') don't override existing values
- dynamic properties are collected in a 'dynamic' array without deduplication

### File Structure

#### /src/io/
- readers/
  - csv-reader.js: Handles CSV file parsing
  - yaml-reader.js: Handles YAML file parsing
  - node-reader.js: Processes node records
  - edge-reader.js: Processes edge records
  - style-reader.js: Processes style records
  - value-parser.js: Parses values based on type
  - dynamic-property-parser.js: Handles dynamic property naming convention
  - dynamic-property-merger.js: Merges dynamic properties based on renderer priorities

#### /src/geometry/
- position.js: Handles node positioning and calculations
- direction.js: Handles directional calculations and anchor naming
- dimensions.js: Handles size and scaling calculations

### Testing
Tests are organized in three categories:
- /tests/io/: Tests for file reading and parsing
- /tests/unit/: Unit tests for individual components
- /tests/integration/: Integration tests for full workflows

### Value Parsing
Values are parsed according to their type:
- string: String conversion
- float: parseFloat
- integer: parseInt(x, 10)
- number: Number conversion
- boolean: Boolean conversion
- flag: String conversion with flag=true
- undefined/null: Preserved as is

### Style System
Styles can be defined in JSON or YAML and follow a hierarchical structure:
- Base styles
- Default styles
- Named styles
- Node/Edge specific styles

### Important Conventions
1. Dynamic properties must use explicit double/triple underscores for missing renderer/group
2. Names in dynamic properties can contain underscores
3. CSV empty cells are treated as undefined (don't override)
4. CSV "NULL" values are treated as null (do override)
5. YAML null, empty value, and ~ are all treated as null
6. In YAML, dynamic properties can be represented hierarchically instead of using the underscore notation