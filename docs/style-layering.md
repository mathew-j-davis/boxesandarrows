# Style Layering

## Overview

The diagram builder supports **graceful style layering** where you can specify multiple style files that merge together. This allows you to:

1. Define base styles in a shared file
2. Create specialized versions by adding override/extension files
3. Avoid duplicating common style definitions

## How It Works

### Accumulating Properties

Two special properties **accumulate** (concatenate) rather than replace when multiple style files are loaded:

- `svg_definitions` - SVG `<defs>` content (markers, gradients, patterns, etc.)
- `svg_styles` - CSS rules for styling diagram elements

All other properties (page config, scale, margin, etc.) follow **last-one-wins** semantics.

### Usage

Specify multiple style files using comma-separated paths:

```bash
node src/index.js -n nodes.csv -e edges.csv \
  -s base-style.json,override-style.json \
  -r svg -o output/diagram
```

Or in `builds.csv` (quote commands containing commas):

```csv
name,command,enabled
my-diagram,"node ../src/index.js -s base.json,override.json -o output",true
```

## Example

### Base Style File: `simplified-style.json`

```json
{
  "page": {
    "background": "white",
    "scale": { "position": { "x": 20, "y": 20 } }
  },
  "svg_definitions": "<marker id=\"arrow\">...</marker>",
  "svg_styles": "rect { rx: 8; ry: 8; }\n.node-current rect { fill: #29B6CC; }"
}
```

### Override File: `harness-reveal-style.json`

```json
{
  "page": {},
  "svg_styles": "\n/* Override for harness reveal */\n.node-current .node-label { fill: #ffffff !important; }"
}
```

### Resulting Merged Styles

The merged SVG will contain:

```css
/* From base (simplified-style.json) */
rect { rx: 8; ry: 8; }
.node-current rect { fill: #29B6CC; }

/* From override (harness-reveal-style.json) */
/* Override for harness reveal */
.node-current .node-label { fill: #ffffff !important; }
```

## Use Cases

### 1. Progressive Disclosure Diagrams

Create multiple versions of the same diagram with different levels of detail:

```csv
simplified,"node src/index.js -s base.json -o simplified",true
detailed,"node src/index.js -s base.json,detail-reveal.json -o detailed",true
```

### 2. Theme Variations

Maintain one base diagram structure with multiple color schemes:

```bash
-s diagram.json,theme-light.json
-s diagram.json,theme-dark.json
-s diagram.json,theme-high-contrast.json
```

### 3. Presentation Modes

Highlight different aspects of the same diagram:

```bash
-s architecture.json,highlight-security.json
-s architecture.json,highlight-performance.json
```

## Implementation Details

### Merge Algorithm

1. **For accumulating properties** (`svg_definitions`, `svg_styles`):
   - All occurrences are collected from all style files
   - Concatenated with newline separators
   - Later files append to (rather than replace) earlier ones

2. **For regular properties** (scale, margin, colors, etc.):
   - Last occurrence wins
   - Properties with the same path replace earlier ones
   - Child properties are cleared when parent is replaced

### CSS Override Best Practices

When creating override files, use `!important` to ensure your rules take precedence over earlier definitions:

```css
/* Override example */
.node-current .node-label {
  fill: #ffffff !important;
  fill-opacity: 0.941 !important;
}
```

### SVG Definitions Merging

SVG definitions with the same `id` will exist multiple times in the output. Browsers use the first definition encountered, so later files cannot override earlier ones. To override an SVG definition:

1. Don't include it in the base file
2. Include it only in the override file
3. Or use unique IDs per style variant

## Configuration File Format

Both base and override files use the same JSON structure:

```json
{
  "page": {
    "background": "white",
    "scale": { "position": { "x": 20, "y": 20 } },
    "margin": { "w": 1, "h": 1 },
    "normalize_viewbox": true
  },
  "svg_definitions": "...SVG defs content...",
  "svg_styles": "...CSS rules...",
  "style": {
    "base": { /* base object styles */ },
    "highlight": { /* custom style */ }
  }
}
```

Override files can omit any sections they don't need to modify.

## Order Matters

Files are processed left-to-right:

```bash
-s first.json,second.json,third.json
```

- `svg_styles` from all three files concatenate: first + second + third
- Regular properties: third wins over second wins over first
- CSS cascade: later rules can override earlier ones (use `!important` if needed)

## Troubleshooting

### Styles Not Applying

- Check that override file is listed **after** base file
- Use `!important` in CSS rules to ensure override
- Verify comma-separated path syntax is correct
- Quote the entire command in `builds.csv` if it contains commas

### Duplicate Definitions

- Accumulating properties (`svg_definitions`, `svg_styles`) are meant to concatenate
- If you see unexpected duplicates, check that files aren't being loaded twice
- Each file should be listed only once in the `-s` argument

### CSV Build File Issues

Commands containing commas must be quoted:

```csv
❌ Wrong: name,command -s base.json,override.json,true
✅ Right: name,"command -s base.json,override.json",true
```

## See Also

- [Style System Overview](./styling.md)
- [Page Configuration](./page-config.md)
- [SVG Renderer](./svg-renderer.md)
