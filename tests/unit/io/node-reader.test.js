const NodeReader = require('../../../src/io/readers/node-reader');
const fs = require('fs').promises;
const YamlReader = require('../../../src/io/readers/yaml-reader');

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

describe('NodeReader', () => {
  // Mock data for YAML tests
  const mockYamlContent = `
  type: node
  name: node1
  label: "Node 1"
  x: 10
  y: 20
  width: 5
  height: 3
  style: custom
  tikz_object_attributes: "draw=red, fill=blue, dashed"
  ---
  type: node
  name: node2
  label: "Node 2"
  x: 30
  y: 40
  width: 4
  height: 3
  color: "#FF0000"
  fillcolor: "#00FF00"
  tikz_object_attributes: "rounded corners=3pt"
  ---
  type: edge
  from: node1
  to: node2
  label: "Edge 1-2"
  tikz_object_attributes: "draw=red, dashed"
  `;

  let mockRenderer;
  let mockStyleHandler;
  let mockScale;
  
  beforeEach(() => {
    // Create mock style handler
    mockStyleHandler = {
      getCompleteStyle: jest.fn().mockReturnValue({
        tikz: {
          'shape': 'rectangle',
          'minimum width': '3cm',
          'minimum height': '2cm'
        }
      }),
      processAttributes: jest.fn().mockReturnValue({
        tikz: {
          'draw': 'colorABCDEF',
          'rounded corners': '5pt'
        }
      }),
      registerColor: jest.fn().mockImplementation(color => {
        return color.startsWith('#') ? `color${color.replace('#', '')}` : color;
      })
    };
    
    // Create mock renderer
    mockRenderer = {
      styleHandler: mockStyleHandler,
      getNodeAnchor: jest.fn().mockReturnValue({ x: 0, y: 0 })
    };
    
    // Set up scaling
    mockScale = {
      position: { x: 1, y: 1 },
      size: { w: 1, h: 1 }
    };
  });

  describe('readFromYaml', () => {
    beforeEach(() => {
      // Mock YamlReader to return the documents we'd expect
      YamlReader.readFile.mockResolvedValue([
        {
          type: 'node',
          name: 'node1',
          label: 'Node 1',
          x: 10,
          y: 20,
          width: 5,
          height: 3,
          style: 'custom',
          tikz_object_attributes: 'draw=red, fill=blue, dashed'
        },
        {
          type: 'node',
          name: 'node2',
          label: 'Node 2',
          x: 30,
          y: 40,
          width: 4,
          height: 3,
          color: '#FF0000',
          fillcolor: '#00FF00',
          tikz_object_attributes: 'rounded corners=3pt'
        }
      ]);
    });

    test('should read nodes from YAML file', async () => {
      const nodes = await NodeReader.readFromYaml('test.yaml');
      
      // Verify that YamlReader was called with the correct filter
      expect(YamlReader.readFile).toHaveBeenCalledWith('test.yaml', { 
        filter: expect.any(Function) 
      });
      
      // Check the behavior of the filter function
      const filter = YamlReader.readFile.mock.calls[0][1].filter;
      
      // Test with valid input
      expect(filter({ type: 'node' })).toBeTruthy();
      
      // Test with invalid input
      expect(filter({ type: 'edge' })).toBeFalsy();
      
      // Test with null value - Should evaluate to falsy
      expect(filter(null)).toBeFalsy();
      
      // Check nodes were processed correctly
      expect(nodes).toHaveLength(2);
      expect(nodes[0].name).toBe('node1');
      expect(nodes[1].name).toBe('node2');
      
      expect(nodes[0].label).toBe('Node 1');
      expect(nodes[1].label).toBe('Node 2');
      
      // These will be null now due to changes in processNodeRecord that disable direct position setting
      expect(nodes[0].xUnscaled).toBe(10);
      expect(nodes[1].xUnscaled).toBe(30);
      
      expect(nodes[0].tikz_object_attributes).toBe('draw=red, fill=blue, dashed');
      expect(nodes[1].tikz_object_attributes).toBe('rounded corners=3pt');
    });
    
    test('should handle errors when reading YAML file', async () => {
      YamlReader.readFile.mockRejectedValue(new Error('File not found'));
      
      await expect(NodeReader.readFromYaml('test.yaml'))
        .rejects.toThrow('File not found');
    });
  });
  
  describe('processNodeRecord', () => {
    test('should process node record with position and size', () => {
      const record = {
        name: 'node1',
        label: 'Node 1',
        x: '10',
        y: '20',
        width: '5',
        height: '3'
      };
      
      const node = NodeReader.processNodeRecord(record, mockScale, mockRenderer);
      
      expect(node.name).toBe('node1');
      expect(node.label).toBe('Node 1');
      // These will be null since the code now disables direct position setting
      // We should check unscaled values instead
      expect(node.xUnscaled).toBe(10);
      expect(node.yUnscaled).toBe(20);
      expect(node.widthUnscaled).toBe(5);
      expect(node.heightUnscaled).toBe(3);
    });
    
    test('should process attributes from the tikz_object_attributes field', () => {
      const record = {
        name: 'node1',
        tikz_object_attributes: 'draw=red, fill=blue, dashed'
      };
      
      const node = NodeReader.processNodeRecord(record, mockScale, mockRenderer);
      
      // Instead of checking if the method was called, verify the value is stored in the node
      expect(node.tikz_object_attributes).toBe('draw=red, fill=blue, dashed');
    });
    
    test('should store color attributes correctly', () => {
      const record = {
        name: 'node1',
        color: '#FF0000', 
        fillcolor: '#00FF00',
        textcolor: '#0000FF'
      };
      
      const node = NodeReader.processNodeRecord(record, mockScale, mockRenderer);
      
      // Check that the original colors are preserved
      expect(node.color).toBe('#FF0000');
      expect(node.fillcolor).toBe('#00FF00');
      expect(node.textcolor).toBe('#0000FF');
    });
    
    test('should store style information in node object', () => {
      const record = {
        name: 'node1',
        style: 'custom',
        tikz_object_attributes: 'fill=green'
      };
      
      const node = NodeReader.processNodeRecord(record, mockScale, mockRenderer);
      
      // Verify style information is stored 
      expect(node.style).toBe('custom');
      expect(node.tikz_object_attributes).toBe('fill=green');
    });

    test('should handle relative sizing attributes', () => {
      const record = {
        name: 'node1',
        h_of: 'node2',
        h_offset: '2',
        w_of: 'node3',
        w_offset: '1.5'
      };
      
      const node = NodeReader.processNodeRecord(record);
      
      expect(node.h_of).toBe('node2');
      expect(node.h_offset).toBe(2);
      expect(node.w_of).toBe('node3');
      expect(node.w_offset).toBe(1.5);
    });
  });
}); 