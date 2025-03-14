# Utilities for BoxesAndArrows

This directory contains utility scripts for the BoxesAndArrows project.

## CSV Column Renaming Utilities

These utilities help transition CSV files from the old format to the new format by renaming column headers.

### Prerequisites

Before using these scripts, ensure you have Node.js installed and install the required dependencies:

```bash
npm install csv-parse
```

### Edge CSV Column Renaming

The `rename_edge_csv_columns.js` script renames columns in edge CSV files:

- `start_anchor` → `startAnchor`
- `end_anchor` → `endAnchor`

#### Usage

```bash
node rename_edge_csv_columns.js [options] <path>
```

Options:
- `--dry-run`: Report changes without modifying files
- `-r, --recursive`: Process directories recursively
- `-h, --help`: Show help message

Examples:
```bash
# Process a single file
node rename_edge_csv_columns.js path/to/edges.csv

# Process all CSV files in a directory (dry run)
node rename_edge_csv_columns.js --dry-run path/to/directory

# Process all CSV files in a directory and subdirectories
node rename_edge_csv_columns.js -r path/to/directory
```

### Node CSV Column Renaming

The `rename_node_csv_columns.js` script renames columns in node CSV files:


- `color` → `edge_color`

#### Usage

```bash
node rename_node_csv_columns.js [options] <path>
```

Options:
- `--dry-run`: Report changes without modifying files
- `-r, --recursive`: Process directories recursively
- `-h, --help`: Show help message

Examples:
```bash
# Process a single file
node rename_node_csv_columns.js path/to/nodes.csv

# Process all CSV files in a directory (dry run)
node rename_node_csv_columns.js --dry-run path/to/directory

# Process all CSV files in a directory and subdirectories
node rename_node_csv_columns.js -r path/to/directory
```

## Making Scripts Executable (Unix/Linux/Mac)

To make the scripts directly executable without calling `node` first:

```bash
chmod +x utilities/rename_edge_csv_columns.js
chmod +x utilities/rename_node_csv_columns.js
```

Then you can run them directly:

```bash
./utilities/rename_edge_csv_columns.js path/to/edges.csv
``` 