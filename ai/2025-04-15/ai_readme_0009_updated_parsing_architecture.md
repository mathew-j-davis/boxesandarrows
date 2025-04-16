# Updated Unified Parsing Architecture

## Analysis Phase

This document provides an updated architecture diagram for the unified parsing approach, highlighting the different processing paths for YAML and JSON files.

### Architecture Overview



```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│  YAML Files ●────▶│ YAML Parser     ●────▶│ Parse Custom    ●────▶│                     │
└─────────────┘     └─────────────────┘     │ Tags            │     │                     │
                                            └─────────────────┘     │                     │
                                                                    │  Intermediate Form  │
┌─────────────┐     ┌─────────────────┐                             │                     │
│  JSON Files ●────▶│ JSON Parser     ●────────────────────────────▶│                     │
└─────────────┘     └─────────────────┘                             └──────────●──────────┘
                                                                               │
                                                                               ▼
                                                                    ┌─────────────────────┐     ┌─────────────────┐
                                                                    │  Common Converter   ●────▶│ Dynamic         │
                                                                    │  to Dynamic Props   │     │ Properties      │
                                                                    └─────────────────────┘     └─────────────────┘
```

### Processing Differences

1. **YAML Files**:
   - Require two distinct processing steps:
   - Step 1: YAML Parser converts YAML syntax to JavaScript objects
   - Step 2: Custom Tag Parser interprets the special tags like `!renderer` and `!clear`
   - Only then is the intermediate form ready for conversion to dynamic properties

2. **JSON Files**:
   - Already in a format close to the intermediate form
   - Only require basic JSON parsing
   - No special tag processing step needed
   - Can directly proceed to dynamic property conversion

### Key Processing Components

#### YAML Processing Path
```javascript
// Step 1: Parse YAML with custom schema
const yamlData = DynamicPropertyYamlReader.readYaml(content);

// Step 2: Transform document with dynamic property extraction
const transformedData = DynamicPropertyYamlReader.transformDocument(yamlData);
```

#### JSON Processing Path
```javascript
// Single Step: Parse JSON (already in intermediate form)
const jsonData = JSON.parse(content);

// Directly convert to dynamic properties
const transformedData = DynamicPropertyYamlReader.transformDocument(jsonData);
```

### Implementation Benefits

This architecture highlights that:

1. The `transformDocument` method can be used for both formats
2. JSON requires less preprocessing than YAML
3. The intermediate form serves as the standardization point
4. The dynamic property conversion is format-agnostic

This approach maximizes code reuse while respecting the inherent differences between the two formats.
