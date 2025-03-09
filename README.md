# Boxes and Arrows - Diagram Generator

A data driven diagram generation tool that creates diagrams from text inputs. This tool creates box-and-arrow diagrams with control over positioning, styling, and relationships.

## Features

- Multiple Input Formats: Accept node and edge definitions from CSV, YAML, or mixed files
- Positioning: Position nodes using absolute coordinates or relative to other nodes
- Styling: Customize appearance through style files (JSON/YAML)
- LaTeX/TikZ Output: Generate vector graphics with LaTeX and TikZ
- Relative Positioning: Place elements in relation to each other with control over anchors and offsets
- Edge Customization: Style edges with different path types, waypoints, and arrowheads
- Text Formatting: Control text appearance with style definitions

## Installation

1. Clone the repository:

```
   git clone https://github.com/yourusername/boxesandarrows.git
   cd boxesandarrows
```

2. Install dependencies:
```
   npm install
```

3. Ensure you have LaTeX installed with the required packages:
   - TikZ/PGF
   - xcolor with SVG color names support
   - standalone document class
   - adjustbox
   - sansmathfonts

## Usage

### Basic Example

Generate a simple diagram with nodes and edges:

```bash
node src/index.js -n nodes.csv -e edges.csv -o output/diagram
```

### Full Command-line Options

```
node src/index.js [-n <nodes.csv,nodes.yaml>] [-e <edges.csv,edges.yaml>] [-y <mixed.yaml>] [-m <positions.csv>] [-s <style.json>] [-o <output/diagram>] [-g <grid_spacing>] [--verbose]

  -n, --nodes      Comma-separated list of node files (CSV) or equivalent data in YAML
  -e, --edges      Comma-separated list of edge files (CSV) or equivalent data in YAML
  -y, --yaml       Mixed YAML file containing both nodes and edges
  -m, --map        Position map file (CSV)
  -s, --style      Style file (JSON/YAML)
  -o, --output     Output file path (default: output/diagram)
  -g, --grid       Grid spacing (optional)
  --verbose        Show verbose output
  -r, --renderer   Output renderer type (latex, text) [default: latex]
  -h, --help       Show this help message
```

### Input File Formats

#### Node Definition (CSV)
```csv
name,x,y,width,height,style,label,anchor,label_above,label_below,relative_to,relative_to_anchor,relative_offset_x,relative_offset_y,h_of,h_from,h_to,h_offset,w_of,w_from,w_to,w_offset,shape,type,tikz_object_attributes,color,fillcolor,textcolor,hide_label
node1,0,0,2,1,box,Node 1,center,,,,,,,,,,,,,,,,default,rounded corners=0.2cm,black,white,black,false
node2,2,1,2,1,circle,Node 2,north west,,,,,,,,,,,,,,,,default,draw=thick,blue,lightblue,black,false
node3,,,2,1,box,Node 3,south west,node1,,,,,,,,,,,,,,,default,,red,white,black,false
node4,,,,,,,center,,,node1,north east,1,0,node1,,,,node2,,,,rectangle,default,,green,white,black,false
node5,,,,,,,center,,,,,,,node1.north,node2.south,0.5,node3,,,,rectangle,default,,purple,white,black,false
```

#### Edge Definition (CSV)
```csv
from,to,style,label,path_type,start_direction,end_direction,start_label,end_label,start_arrow,end_arrow,attributes,label_justify,isHtml,tikz_object_attributes,color,label_position,start_label_position,end_label_position,label_segment,start_label_segment,end_label_segment,start_adjust_x,start_adjust_y,end_adjust_x,end_adjust_y,waypoints
node1,node2,arrow,Connection,--,north,south,Start,End,<,>,dashed,center,false,line width=0.04cm,red,0.5,0.2,0.8,,,,-0.2,0.1,0.2,-0.1,
node1,node3,default,Curved,..,.,.,,,,>,,,false,,blue,,,,,,,,,,,s(1,1) c(2,0) e(-1,1)
node2,node4,arrow,,|-,east,west,,,,>,thick,,,,,,,,,,,,,,,
```

#### Mixed YAML File
```yaml
---
type: node
name: node1
x: 0
y: 0
width: 2
height: 1
style: box
label: Node 1
anchor: center
tikz_object_attributes: rounded corners=0.2cm
color: black
fillcolor: white
textcolor: black
---
type: node
name: node2
relative_to: node1
relative_to_anchor: north east
anchor: south west
relative_offset_x: 1
relative_offset_y: 0
width: 2
height: 1
style: circle
label: Node 2
color: blue
fillcolor: lightblue
---
type: edge
from: node1
to: node2
style: arrow
label: Connection
path_type: --
start_direction: north
end_direction: south
start_arrow: <
end_arrow: >
color: red
waypoints: s(1,1) c(2,0) e(-1,1)
```

#### Style File (JSON)
```json
{
  "page": {
    "scale": {
      "position": { "x": 1, "y": 1 },
      "size": { "w": 1, "h": 1 }
    },
    "margin": { "h": 1, "w": 1 }
  },
  "style": {
    "default": {
      "node": {
        "object": {
          "tikz": {
            "shape": "rectangle",
            "draw": "black",
            "fill": "white",
            "rounded corners": "0.005cm",
            "minimum width": "2cm",
            "minimum height": "1cm",
            "line width": "0.02cm"
          }
        }
      },
      "edge": {
        "object": {
          "tikz": {
            "draw": "black",
            "line width": "0.02cm"
          }
        }
      }
    }
  }
}
```

## Relative Positioning and Sizing

Nodes can be positioned and sized relative to other nodes:

```yaml
type: node
name: square1
width: 2
height: 2
x: 0
y: 0
draw: red

---
type: node
name: square2
width: 2
height: 2
relative_to: square1
relative_to_anchor: north east
anchor: south west
relative_offset_x: 1
relative_offset_y: 0
draw: green

---
type: node
name: square3
# Size based on another node's dimensions
h_of: square1
h_offset: 0.5  # Add 0.5 to height
w_of: square2
w_offset: -0.2  # Subtract 0.2 from width
draw: blue

---
type: node
name: square4
# Size based on distance between anchor points
h_from: square1.north
h_to: square2.south
h_offset: 0.1  # Add 0.1 to the calculated height
w_from: square1.west
w_to: square2.east
draw: purple
```

### Relative Positioning
When using `relative_to`, a node's position is calculated based on another node. The `relative_to_anchor` specifies which anchor on the reference node to position from, and `anchor` determines which point on the current node to position. Additional `relative_offset_x` and `relative_offset_y` values can fine-tune the placement.

### Relative Sizing
Nodes can inherit size from other nodes or calculate size based on distances:

- `h_of` / `w_of`: Use height/width directly from another node
- `h_from`, `h_to` / `w_from`, `w_to`: Calculate height/width as distance between anchor points
- `h_offset` / `w_offset`: Add an offset to the calculated dimension

Priority for determining dimensions:
1. Explicit height/width values
2. Reference node dimensions (h_of/w_of)
3. Anchor point distances (h_from-h_to/w_from-w_to)
4. Style defaults

## Architecture

- DiagramBuilder: Main class that orchestrates the diagram creation process
- ReaderManager: Manages reading and processing of input files
- LatexRenderer: Generates LaTeX/TikZ output
- StyleHandler: Processes and applies styling information
- Geometry Utilities: Handle coordinate calculations and transformations

## Contributing

Contributions are welcome. Please submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

