# Testing the YAML Functionality

This document contains test commands to verify the new YAML functionality, particularly the `-y` parameter for mixed YAML files.

## Available Test Files

- `examples/test-nodes.yaml`: Contains 4 nodes with different styles and positions
- `examples/test-edges.yaml`: Contains 4 edges connecting the nodes
- `examples/test-mixed.yaml`: Contains a mix of 4 nodes and 4 edges in the same file
- `examples/test-positions.csv`: Contains position updates for some nodes

## Test Commands

### 1. Test nodes-only file
```bash
node src/index.js -n examples/test-nodes.yaml -o output/test-nodes --verbose
```
This tests that nodes are properly loaded from a YAML file.

### 2. Test nodes with edges
```bash
node src/index.js -n examples/test-nodes.yaml -e examples/test-edges.yaml -o output/test-nodes-edges --verbose
```
This tests loading nodes and edges from separate YAML files.

### 3. Test mixed file
```bash
node src/index.js -y examples/test-mixed.yaml -o output/test-mixed --verbose
```
This tests the new `-y` parameter, which loads a mixed YAML file containing both nodes and edges.

### 4. Test with position updates
```bash
node src/index.js -n examples/test-nodes.yaml -e examples/test-edges.yaml -m examples/test-positions.csv -o output/test-with-positions --verbose
```
This tests that position updates are properly applied from the position file and that edges use the updated positions.

### 5. Test everything together
```bash
node src/index.js -n examples/test-nodes.yaml -e examples/test-edges.yaml -y examples/test-mixed.yaml -m examples/test-positions.csv -o output/test-all --verbose
```
This tests loading nodes and edges from all sources, with position updates.

### 6. Test grid option
```bash
node src/index.js -y examples/test-mixed.yaml -o output/test-grid -g 1 --verbose
```
This tests the grid option, which adds a grid to the diagram with spacing of 1 unit.

## Expected Behavior

When using the `-y` parameter with mixed YAML files, the application should:

1. Process all nodes first (from both dedicated node files and the mixed YAML file)
2. Apply position updates if specified
3. Process all edges (from both dedicated edge files and the mixed YAML file)

The verbose output should show the processing steps in this order.

## Creating and Viewing Output

All commands use the `-o` parameter to specify the output file path. The output will be a PDF file at the specified path.

For example, after running the first command, you can find the output at `output/test-nodes.pdf`. 