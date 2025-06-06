const EdgeReader = require('../../../src/io/readers/edge-reader');
const fs = require('fs').promises;
const YamlReader = require('../../../src/io/readers/yaml-reader');
const { Direction } = require('../../../src/geometry/direction');
const { PositionType } = require('../../../src/geometry/position');

// Mock dependencies
jest.mock('../../../src/io/readers/csv-reader', () => ({
  readFile: jest.fn().mockImplementation(() => Promise.resolve([]))
}));

jest.mock('../../../src/io/readers/yaml-reader', () => ({
  readFile: jest.fn()
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

describe('EdgeReader', () => {
  // Mock data for YAML tests
  const mockYamlContent = `
  type: edge
  from: node1
  to: node2
  label: "Edge 1-2"
  style: "custom"
  tikz_object_attributes: "draw=red, dashed"
  ---
  type: edge
  from: node2
  to: node3
  label: "Edge 2-3"
  start_arrow: "none"
  end_arrow: "latex"
  color: "#0000FF"
  ---
  type: node
  name: node4
  label: "This should be filtered out"
  `;

  let mockNodes;
  let mockScale;
  let mockStyleHandler;
  
  beforeEach(() => {
    // Create mock style handler
    mockStyleHandler = {
      getCompleteStyle: jest.fn().mockReturnValue({
        tikz: {
          'line width': '1pt',
          'draw': 'black'
        }
      }),
      processAttributes: jest.fn().mockReturnValue({
        tikz: {
          'draw': 'red',
          'dashed': true
        }
      })
    };
    

    mockScale = {
      position: { x: 1, y: 1},  // Position scaling factor
      size: { w: 1, h: 1 }   // Size scaling factor
    };
    
    // Mock nodes map for edge processing
    mockNodes = new Map();
    // Add nodes with positions and dimensions for connection point calculations
    mockNodes.set('node1', { 
      name: 'node1', 
      width: 5,        // Unscaled width
      height: 3,       // Unscaled height

      anchorVector: { x: 0, y: 0 },  // Center anchor by default
      position: {
        xUnscaled: 10,
        yUnscaled: 20,
        xScaled: 10,
        yScaled: 20,
        positionType: PositionType.COORDINATES
      },
      dimensions: {
        widthUnscaled: 5,
        heightUnscaled: 3,
        widthScaled: 5,
        heightScaled: 3
      }
    });
    mockNodes.set('node2', { 
      name: 'node2', 
      width: 5,        // Unscaled width
      height: 3,       // Unscaled height

      anchorVector: { x: 0, y: 0 },  // Center anchor by default
      position: {
        xUnscaled: 30,
        yUnscaled: 20,
        xScaled: 30,
        yScaled: 20,
        positionType: PositionType.COORDINATES
      },
      dimensions: {
        widthUnscaled: 5,
        heightUnscaled: 3,
        widthScaled: 5,
        heightScaled: 3
      }
    });
    mockNodes.set('node3', { 
      name: 'node3', 
      x: 30, 
      y: 40, 
      width: 5,
      height: 3,
      anchorVector: { x: 0, y: 0 },
      position: {
        xUnscaled: 30,
        yUnscaled: 40,
        xScaled: 30,
        yScaled: 40,
        positionType: PositionType.COORDINATES
      },
      dimensions: {
        widthUnscaled: 5,
        heightUnscaled: 3,
        widthScaled: 5,
        heightScaled: 3
      }
    });
  });

  describe('readFromYaml', () => {
    beforeEach(() => {
      // Mock YamlReader to return the documents we'd expect
      YamlReader.readFile.mockResolvedValue([
        {
          type: 'edge',
          from: 'node1',
          to: 'node2',
          label: 'Edge 1-2',
          style: 'custom',
          tikz_object_attributes: 'draw=red, dashed'
        },
        {
          type: 'edge',
          from: 'node2',
          to: 'node3',
          label: 'Edge 2-3',
          start_arrow: 'none',
          end_arrow: 'latex',
          color: '#0000FF'
        }
      ]);
    });

    test('should read edges from YAML file', async () => {
      const edges = await EdgeReader.readFromYaml('test.yaml');
      
      // Verify that YamlReader was called with the correct filter
      expect(YamlReader.readFile).toHaveBeenCalledWith('test.yaml', { 
        filter: expect.any(Function) 
      });
      
      // Check the behavior of the filter function
      const filter = YamlReader.readFile.mock.calls[0][1].filter;
      
      // Test with valid input
      expect(filter({ type: 'edge' })).toBeTruthy();
      
      // Test with invalid input
      expect(filter({ type: 'node' })).toBeFalsy();
      
      // Test with null value - Should evaluate to falsy
      expect(filter(null)).toBeFalsy();
      
      // Check edges were processed correctly
      expect(edges).toHaveLength(2);
      expect(edges[0].from).toBe('node1');
      expect(edges[0].to).toBe('node2');
      expect(edges[0].label).toBe('Edge 1-2');
      expect(edges[0].tikz_object_attributes).toBe('draw=red, dashed');
      
      expect(edges[1].from).toBe('node2');
      expect(edges[1].to).toBe('node3');
      expect(edges[1].label).toBe('Edge 2-3');
      expect(edges[1].start_arrow).toBe('none');
      expect(edges[1].end_arrow).toBe('latex');
      expect(edges[1].color).toBe('#0000FF');
    });
    
    test('should handle errors when reading YAML file', async () => {
      YamlReader.readFile.mockRejectedValue(new Error('File not found'));
      
      await expect(EdgeReader.readFromYaml('test.yaml'))
        .rejects.toThrow('File not found');
    });
  });
  
  describe('processEdgeRecord', () => {
    test('should process edge record correctly', () => {
      const record = {
        from: 'node1',
        to: 'node2',
        label: 'Edge 1-2',
        style: 'custom',
        tikz_object_attributes: 'draw=red, dashed',
        start_anchor: 'east',    // Explicitly set anchor
        end_anchor: 'west'      // Explicitly set anchor
      };
      
      const edge = EdgeReader.processEdgeRecord(record, mockNodes, mockScale, mockStyleHandler);
      
      expect(edge.from).toBe(mockNodes.get('node1'));
      expect(edge.to).toBe(mockNodes.get('node2'));
      expect(edge.label).toBe('Edge 1-2');
      expect(edge.tikz_object_attributes).toBe('draw=red, dashed');
      
      // Check that explicit anchors are preserved
      expect(edge.start_anchor).toBe('east');
      expect(edge.end_anchor).toBe('west');
    });
    
    test('should handle explicit anchors', () => {
      const record = {
        from: 'node1',
        to: 'node2',
        start_anchor: 'north',
        end_anchor: 'south'
      };
      
      const edge = EdgeReader.processEdgeRecord(record, mockNodes, mockScale, mockStyleHandler);
      
      expect(edge.start_anchor).toBe('north');
      expect(edge.end_anchor).toBe('south');
    });
    
    test('should skip edge if nodes not found', () => {
      const record = {
        from: 'nonexistent1',
        to: 'nonexistent2'
      };
      
      const edge = EdgeReader.processEdgeRecord(record, mockNodes, mockScale, mockStyleHandler);
      
      expect(edge).toBe(null);
    });
    
    test('should set default values for missing fields', () => {
      const record = {
        from: 'node1',
        to: 'node2'
      };
      
      const edge = EdgeReader.processEdgeRecord(record, mockNodes, mockScale, mockStyleHandler);
      
      expect(edge.label).toBeUndefined();
      expect(edge.style).toBe('default');
      expect(edge.path_type).toBe('to');
    });
    
    test('should store and apply color attributes', () => {
      const record = {
        from: 'node1',
        to: 'node2',
        color: '#FF0000'
      };
      
      mockStyleHandler.processAttributes.mockReturnValue({
        tikz: {}
      });
      
      const edge = EdgeReader.processEdgeRecord(record, mockNodes, mockScale, mockStyleHandler);
      
      expect(edge.mergedStyle.tikz.draw).toBe('#FF0000');
    });
    
    test('should merge style defaults with attributes', () => {
      const record = {
        from: 'node1',
        to: 'node2',
        style: 'custom',
        tikz_object_attributes: 'draw=green, dotted'
      };
      
      mockStyleHandler.getCompleteStyle.mockReturnValue({
        tikz: { 'line width': '2pt', draw: 'black' }
      });
      
      mockStyleHandler.processAttributes.mockReturnValue({
        tikz: { draw: 'green', dotted: true }
      });
      
      const edge = EdgeReader.processEdgeRecord(record, mockNodes, mockScale, mockStyleHandler);
      
      expect(mockStyleHandler.getCompleteStyle).toHaveBeenCalledWith('custom', 'edge', 'object');
      expect(mockStyleHandler.processAttributes).toHaveBeenCalledWith('draw=green, dotted');
      
      expect(edge.mergedStyle.tikz['line width']).toBe('2pt');
      expect(edge.mergedStyle.tikz.draw).toBe('green');
      expect(edge.mergedStyle.tikz.dotted).toBe(true);
    });

    test('should process explicit connection directions', () => {
      // Set up test data
      const record = {
        from: 'node1',
        to: 'node2',
        start_anchor: 'east',    // Explicitly set anchor
        end_anchor: 'west'      // Explicitly set anchor
      };
      
      const mockNodes = new Map([
        ['node1', { 
          name: 'node1', 
          x: 10, 
          y: 20, 
          width: 5,
          height: 5,
          anchorVector: { x: 0, y: 0 },
          position: {
            xUnscaled: 10,
            yUnscaled: 20,
            xScaled: 10,
            yScaled: 20,
            positionType: PositionType.COORDINATES
          },
          dimensions: {
            widthUnscaled: 5,
            heightUnscaled: 5,
            widthScaled: 5,
            heightScaled: 5
          }
        }],
        ['node2', { 
          name: 'node2', 
          x: 30, 
          y: 20, 
          width: 5,
          height: 5,
          anchorVector: { x: 0, y: 0 },
          position: {
            xUnscaled: 30,
            yUnscaled: 20,
            xScaled: 30,
            yScaled: 20,
            positionType: PositionType.COORDINATES
          },
          dimensions: {
            widthUnscaled: 5,
            heightUnscaled: 5,
            widthScaled: 5,
            heightScaled: 5
          }
        }]
      ]);
      
      const scale = {
        position: { x: 1, y: 1 },
        size: { w: 1, h: 1 }
      };
      
      const edge = EdgeReader.processEdgeRecord(record, mockNodes, scale);
      
      expect(edge).toBeDefined();
      expect(edge.start_anchor).toBe('east');
      expect(edge.end_anchor).toBe('west');
      // ... other assertions ...
    });

    test('should handle different node shapes correctly', () => {
      // Set up test data
      const record = {
        from: 'circle',
        to: 'rectangle',
        start_anchor: 'north',
        end_anchor: 'south'
      };
      
      const mockNodes = new Map([
        ['circle', { 
          name: 'circle', 
          x: 10, 
          y: 10, 
          shape: 'circle', 
          width: 5,
          height: 5,
          anchorVector: { x: 0, y: 0 },
          position: {
            xUnscaled: 10,
            yUnscaled: 10,
            xScaled: 10,
            yScaled: 10,
            positionType: PositionType.COORDINATES
          },
          dimensions: {
            widthUnscaled: 5,
            heightUnscaled: 5,
            widthScaled: 5,
            heightScaled: 5
          }
        }],
        ['rectangle', { 
          name: 'rectangle', 
          x: 10, 
          y: 30, 
          shape: 'rectangle', 
          width: 10,
          height: 5,
          anchorVector: { x: 0, y: 0 },
          position: {
            xUnscaled: 10,
            yUnscaled: 30,
            xScaled: 10,
            yScaled: 30,
            positionType: PositionType.COORDINATES
          },
          dimensions: {
            widthUnscaled: 10,
            heightUnscaled: 5,
            widthScaled: 10,
            heightScaled: 5
          }
        }]
      ]);
      
      const scale = {
        position: { x: 1, y: 1 },
        size: { w: 1, h: 1 }
      };
      
      const edge = EdgeReader.processEdgeRecord(record, mockNodes, scale);
      
      expect(edge).toBeDefined();
      expect(edge.start_anchor).toBe('north');
      expect(edge.end_anchor).toBe('south');
      // ... other assertions ...
    });
  });

  describe('setConnectionDirections', () => {
    test('should auto-calculate directions for horizontal placement', () => {
      // Create mock nodes
      const startNode = {
        name: 'start',
        position: {
          xUnscaled: 0,
          yUnscaled: 0,
          xScaled: 0,
          yScaled: 0,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      
      const endNode = {
        name: 'end',
        position: {
          xUnscaled: 20,
          yUnscaled: 0,
          xScaled: 20,
          yScaled: 0,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      
      const result = EdgeReader.setConnectionDirections(startNode, endNode, 'auto', 'auto');
      
      expect(result.startAnchor).toBe('east');
      expect(result.endAnchor).toBe('west');
    });
    
    test('should auto-calculate directions for vertical placement', () => {
      // Create mock nodes
      const startNode = {
        name: 'start',
        position: {
          xUnscaled: 0,
          yUnscaled: 0,
          xScaled: 0,
          yScaled: 0,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      
      const endNode = {
        name: 'end',
        position: {
          xUnscaled: 0,
          yUnscaled: 20,
          xScaled: 0,
          yScaled: 20,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      
      const result = EdgeReader.setConnectionDirections(startNode, endNode, '.', '.');
      
      expect(result.startAnchor).toBe('north');
      expect(result.endAnchor).toBe('south');
    });
    
    test('should honor explicit directions', () => {
      const startNode = {
        name: 'start',
        position: {
          xUnscaled: 0,
          yUnscaled: 0,
          xScaled: 0,
          yScaled: 0,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      
      const endNode = {
        name: 'end',
        position: {
          xUnscaled: 20,
          yUnscaled: 0,
          xScaled: 20,
          yScaled: 0,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      
      const result = EdgeReader.setConnectionDirections(startNode, endNode, 'south', 'north');
      
      expect(result.startAnchor).toBe('south');
      expect(result.endAnchor).toBe('north');
    });
    
    test('should auto-calculate one direction and honor the other explicit direction', () => {
      // Create mock nodes
      const startNode = {
        name: 'start',
        position: {
          xUnscaled: 0,
          yUnscaled: 0,
          xScaled: 0,
          yScaled: 0,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      
      const endNode = {
        name: 'end',
        position: {
          xUnscaled: -20,
          yUnscaled: 20,
          xScaled: -20,
          yScaled: 20,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      
      const result = EdgeReader.setConnectionDirections(startNode, endNode, 'north', 'auto');
      
      expect(result.endAnchor).toBe('south east');
      

    });

    // Add a new test to understand directional calculation
    test('should calculate correct directions based on relative positions', () => {
      // Test various relative positions to see what directions are calculated
      
      // Position 1: End node directly to the right
      const startNode1 = { 
        position: {
          xUnscaled: 0,
          yUnscaled: 0,
          xScaled: 0,
          yScaled: 0,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      const endNode1 = { 
        position: {
          xUnscaled: 50,
          yUnscaled: 0,
          xScaled: 50,
          yScaled: 0,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      const result1 = EdgeReader.setConnectionDirections(startNode1, endNode1, 'auto', 'auto');
      //console.log(`Right: End at (${endNode1.position.xScaled}, ${endNode1.position.yScaled}) results in start=${result1.startAnchor}, end=${result1.endAnchor}`);
      expect(result1.startAnchor).toBe('east');
      expect(result1.endAnchor).toBe('west');
      
      // Position 2: End node directly to the left
      const startNode2 = { 
        position: {
          xUnscaled: 0,
          yUnscaled: 0,
          xScaled: 0,
          yScaled: 0,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      const endNode2 = { 
        position: {
          xUnscaled: -50,
          yUnscaled: 0,
          xScaled: -50,
          yScaled: 0,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      const result2 = EdgeReader.setConnectionDirections(startNode2, endNode2, 'auto', 'auto');
      //console.log(`Left: End at (${endNode2.position.xScaled}, ${endNode2.position.yScaled}) results in start=${result2.startAnchor}, end=${result2.endAnchor}`);
      expect(result2.startAnchor).toBe('west');
      expect(result2.endAnchor).toBe('east');
      
      // Position 3: End node directly above
      const startNode3 = { 
        position: {
          xUnscaled: 0,
          yUnscaled: 0,
          xScaled: 0,
          yScaled: 0,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      const endNode3 = { 
        position: {
          xUnscaled: 0,
          yUnscaled: 50,
          xScaled: 0,
          yScaled: 50,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      const result3 = EdgeReader.setConnectionDirections(startNode3, endNode3, 'auto', 'auto');
      expect(result3.startAnchor).toBe('north');
      expect(result3.endAnchor).toBe('south');
      
      // Position 4: End node directly below
      const startNode4 = { 
        position: {
          xUnscaled: 0,
          yUnscaled: 0,
          xScaled: 0,
          yScaled: 0,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      const endNode4 = { 
        position: {
          xUnscaled: 0,
          yUnscaled: -50,
          xScaled: 0,
          yScaled: -50,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      const result4 = EdgeReader.setConnectionDirections(startNode4, endNode4, 'auto', 'auto');
      expect(result4.startAnchor).toBe('south');
      expect(result4.endAnchor).toBe('north');
      
      // Position 5: End node to the upper left (diagonal)
      const startNode5 = { 
        position: {
          xUnscaled: 0,
          yUnscaled: 0,
          xScaled: 0,
          yScaled: 0,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      const endNode5 = { 
        position: {
          xUnscaled: -20,
          yUnscaled: 20,
          xScaled: -20,
          yScaled: 20,
          positionType: PositionType.COORDINATES
        },
        dimensions: {
          widthUnscaled: 10,
          heightUnscaled: 10,
          widthScaled: 10,
          heightScaled: 10
        }
      };
      const result5 = EdgeReader.setConnectionDirections(startNode5, endNode5, 'auto', 'auto');
      expect(result5.startAnchor).toBe('north west');
      expect(result5.endAnchor).toBe('south east');
    });
  });
}); 