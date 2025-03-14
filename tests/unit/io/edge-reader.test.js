const EdgeReader = require('../../../src/io/readers/edge-reader');
const fs = require('fs').promises;
const YamlReader = require('../../../src/io/readers/yaml-reader');
const { Direction } = require('../../../src/geometry/direction');

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
    
    // Set up a more realistic scaling object
    mockScale = {
      position: { x: 2, y: 2 },  // Position scaling factor
      size: { w: 1.5, h: 1.5 }   // Size scaling factor
    };
    
    // Mock nodes map for edge processing
    mockNodes = new Map();
    // Add nodes with positions and dimensions for connection point calculations
    // Important: Include both scaled and unscaled values
    mockNodes.set('node1', { 
      name: 'node1', 
      x: 20,                   // Scaled position (10 * position.x)
      y: 40,                   // Scaled position (20 * position.y)
      xUnscaled: 10,           // Unscaled position
      yUnscaled: 20,           // Unscaled position
      width: 7.5,              // Scaled width (5 * size.w)
      height: 4.5,             // Scaled height (3 * size.h)
      widthUnscaled: 5,        // Unscaled width
      heightUnscaled: 3,       // Unscaled height
      anchorVector: { x: 0, y: 0 }  // Center anchor by default
    });
    mockNodes.set('node2', { 
      name: 'node2', 
      x: 60,                   // Scaled position (30 * position.x)
      y: 40,                   // Scaled position (20 * position.y)
      xUnscaled: 30,           // Unscaled position
      yUnscaled: 20,           // Unscaled position
      width: 7.5,              // Scaled width (5 * size.w)
      height: 4.5,             // Scaled height (3 * size.h)
      widthUnscaled: 5,        // Unscaled width
      heightUnscaled: 3,       // Unscaled height
      anchorVector: { x: 0, y: 0 }  // Center anchor by default
    });
    mockNodes.set('node3', { 
      name: 'node3', 
      x: 60,                   // Scaled position (30 * position.x)
      y: 80,                   // Scaled position (40 * position.y)
      xUnscaled: 30,           // Unscaled position
      yUnscaled: 40,           // Unscaled position
      width: 7.5,              // Scaled width (5 * size.w)
      height: 4.5,             // Scaled height (3 * size.h)
      widthUnscaled: 5,        // Unscaled width
      heightUnscaled: 3,       // Unscaled height
      anchorVector: { x: 0, y: 0 }  // Center anchor by default
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
          w: 5, 
          h: 5,
          width: 5,
          height: 5,
          xUnscaled: 10,
          yUnscaled: 20,
          widthUnscaled: 5,
          heightUnscaled: 5,
          anchorVector: { x: 0, y: 0 }
        }],
        ['node2', { 
          name: 'node2', 
          x: 30, 
          y: 20, 
          w: 5, 
          h: 5,
          width: 5,
          height: 5,
          xUnscaled: 30,
          yUnscaled: 20,
          widthUnscaled: 5,
          heightUnscaled: 5,
          anchorVector: { x: 0, y: 0 }
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
          w: 5, 
          h: 5,
          width: 5,
          height: 5,
          xUnscaled: 10,
          yUnscaled: 10,
          widthUnscaled: 5,
          heightUnscaled: 5,
          anchorVector: { x: 0, y: 0 }
        }],
        ['rectangle', { 
          name: 'rectangle', 
          x: 10, 
          y: 30, 
          shape: 'rectangle', 
          w: 10, 
          h: 5,
          width: 10,
          height: 5,
          xUnscaled: 10,
          yUnscaled: 30,
          widthUnscaled: 10,
          heightUnscaled: 5,
          anchorVector: { x: 0, y: 0 }
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
      const startNode = { x: 10, y: 20, width: 5, height: 3 };
      const endNode = { x: 30, y: 20, width: 5, height: 3 };
      
      const result = EdgeReader.setConnectionDirections(startNode, endNode, 'auto', 'auto');
      
      expect(result.startAnchor).toBe('east');
      expect(result.endAnchor).toBe('west');
    });
    
    test('should auto-calculate directions for vertical placement', () => {
      const startNode = { x: 20, y: 10, width: 5, height: 3 };
      const endNode = { x: 20, y: 30, width: 5, height: 3 };
      
      const result = EdgeReader.setConnectionDirections(startNode, endNode, '.', '.');
      
      expect(result.startAnchor).toBe('north');
      expect(result.endAnchor).toBe('south');
    });
    
    test('should honor explicit directions', () => {
      const startNode = { x: 10, y: 20, width: 5, height: 3 };
      const endNode = { x: 30, y: 20, width: 5, height: 3 };
      
      const result = EdgeReader.setConnectionDirections(startNode, endNode, 'south', 'north');
      
      expect(result.startAnchor).toBe('south');
      expect(result.endAnchor).toBe('north');
    });
    
    test('should auto-calculate one direction and honor the other explicit direction', () => {
      const startNode = { x: 10, y: 20, width: 5, height: 3 };
      const endNode = { x: 30, y: 20, width: 5, height: 3 };
      
      const result = EdgeReader.setConnectionDirections(startNode, endNode, 'south', 'auto');
      
      expect(result.startAnchor).toBe('south');
      expect(result.endAnchor).toBe('west');
    });
  });
}); 