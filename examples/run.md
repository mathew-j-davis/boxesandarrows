# Boxes and Arrows Example Commands

This document contains various example commands you can run to test different features of the Boxes and Arrows diagram generator.

## Format Compatibility Tests

These commands demonstrate format compatibility between CSV, YAML, and JSON files. All of these commands should produce identical output.

### Basic CSV with JSON Styles (Reference)
```bash
node src/index.js -n examples/nodes.csv -e examples/edges.csv -m examples/map.csv -s examples/style-latex.json -o output/diagram-from-csv-data-and-json-styles
```
This is our reference command that uses CSV files for nodes and edges with JSON styles.

### CSV with YAML Styles
```bash
node src/index.js -n examples/nodes.csv -e examples/edges.csv -m examples/map.csv -s examples/style-latex.yaml -o output/diagram-from-csv-data-and-yaml-styles
```
This demonstrates using YAML format for styles instead of JSON. The output should be identical to the reference.

### YAML Nodes with CSV Edges
```bash
node src/index.js -n examples/nodes.yaml -e examples/edges.csv -m examples/map.csv -s examples/style-latex.json -o output/diagram-from-yaml-nodes-csv-edges-and-json-styles
```
This demonstrates using YAML for nodes with CSV for edges. The output should be identical to the reference.

### CSV Nodes with YAML Edges
```bash
node src/index.js -n examples/nodes.csv -e examples/edges.yaml -m examples/map.csv -s examples/style-latex.json -o output/diagram-from-csv-nodes-yaml-edges-and-json-styles
```
This demonstrates using CSV for nodes with YAML for edges. The output should be identical to the reference.

### Single Mixed YAML File
```bash
node src/index.js -y examples/mixed.yaml -m examples/map.csv -o output/diagram-from-mixed-yaml
```
This demonstrates using a single YAML file that combines nodes, edges, and styles all in one document. The `-y` flag tells the program to read everything from this one file. The output should be identical to the reference.

## Creating the Mixed YAML File
To create the mixed YAML file, you can concatenate the individual YAML files:
```bash
cat examples/nodes.yaml examples/edges.yaml examples/style-latex.yaml > examples/mixed.yaml
```

## Feature-Specific Examples

These commands demonstrate specific features of the Boxes and Arrows tool. Each one produces unique output.

### Relative Sizing Example
```bash
node src/index.js -n examples/nodes-with-relative-sizing.yaml -o output/nodes-with-relative-sizing -s examples/style-latex.yaml
```
This example demonstrates how nodes can specify their dimensions relative to other nodes using properties like `w_of`, `h_of`, etc.

### Relative Positioning Example
```bash
node src/index.js -n examples/relative-nodes.yaml -o output/relative-nodes -s examples/style-latex.yaml
```
This example demonstrates positioning nodes relative to other nodes using properties like `relative_to` and offsets.


```
node src/index.js -y examples/new-relative-positioning.yaml -s examples/style-latex.json -o output/new-relative-positioning
```

## Automated Testing

The examples above have automated tests in `tests/integration/format-consistency.test.js` that:

1. Run each command
2. Generate the output files
3. Compare the output against reference files to ensure consistency

### Running the Tests

You can run the tests using:

```bash
# Run all integration tests
npx jest tests/integration

# Run just the format consistency tests
npx jest tests/integration/format-consistency.test.js
```

### How the Tests Work

- **Format Compatibility Tests**: All five format variations are compared against a single reference file, since they should produce identical output.
- **Feature-Specific Tests**: Each feature test has its own separate reference file, since they produce unique output.

On the first run, reference files are created. On subsequent runs, the output is compared against those references.

```bash
node src/index.js -n examples/nodes-with-relative-sizing.yaml -o output/nodes-with-relative-sizing -s examples/latex-style.yaml
```

```bash
node src/index.js -n examples/relative-nodes.yaml -o output/relative-nodes -s examples/latex-style.yaml
```
