const fs = require('fs').promises;
const YamlReader = require('../../../src/io/readers/yaml-reader');
const { Node } = require('../../../src/io/models/node');
const NodeReader = require('../../../src/io/readers/node-reader');

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
  edge_color: "#FF0000"
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
          edge_color: '#FF0000',
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
      expect(nodes[0].x).toBe(10);
      expect(nodes[1].x).toBe(30);
      
      expect(nodes[0].y).toBe(20);
      expect(nodes[1].y).toBe(40);
      
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
        x: '10.5',
        y: '20.3',
        width: '5',
        height: '3'
      };
      
      const node = NodeReader.processNodeRecord(record);
      
      expect(node.name).toBe('node1');
      expect(node.label).toBe('Node 1');
      expect(node.x).toBe(10.5);
      expect(node.y).toBe(20.3);
      expect(node.width).toBe(5);
      expect(node.height).toBe(3);

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
        edge_color: '#FF0000',
        fillcolor: '#00FF00',
        textcolor: '#0000FF'
      };
      
      const node = NodeReader.processNodeRecord(record, mockScale, mockRenderer);
      
      // Check that colors are preserved
      expect(node.edge_color).toBe('#FF0000');
      expect(node.fillcolor).toBe('#00FF00');
      expect(node.textcolor).toBe('#0000FF');
    });
    
    test('should store the original record in the records array', () => {
      const record = {
        name: 'node1',
        label: 'Test Node',
        edge_color: '#FF0000',
        fillcolor: '#00FF00',
        custom_field: 'custom value'
      };
      
      const node = NodeReader.processNodeRecord(record, mockScale, mockRenderer);
      
      // Check that the original record is stored in the records array
      expect(node.records).toBeInstanceOf(Array);
      expect(node.records.length).toBe(1);
      expect(node.records[0]).toEqual(record);
      
      // Verify that custom fields are preserved
      expect(node.records[0].custom_field).toBe('custom value');
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

    test('Node.mergeNodes should combine nodes and append records', () => {
      const record1 = {
        name: 'node1',
        label: 'First Label',
        edge_color: '#FF0000',
        tikz_object_attributes: 'draw=red',
        width: '3',
        height: '2'
      };
      
      const record2 = {
        name: 'node1',
        width: '5',
        height: '3',
        fillcolor: '#00FF00',
        tikz_object_attributes: 'fill=blue'
      };
      
      const node1 = NodeReader.processNodeRecord(record1);
      const node2 = NodeReader.processNodeRecord(record2);
      
      const mergedNode = Node.mergeNodes(node1, node2);
      
      // Check that properties from both nodes are present, with node2 taking priority
      expect(mergedNode.name).toBe('node1');
      // Both records provide a name, but only record1 has a label
      expect(mergedNode.label).toBe('First Label');
      expect(mergedNode.edge_color).toBe('#FF0000'); // From node1 (not overridden)
      expect(mergedNode.fillcolor).toBe('#00FF00');  // From node2
      expect(mergedNode.width).toBe(5);      // From node2 (overrides node1)
      expect(mergedNode.height).toBe(3);     // From node2 (overrides node1)
      
      // Check that tikz_object_attributes are concatenated
      expect(mergedNode.tikz_object_attributes).toBe('draw=red, fill=blue');
      
      // Check that records from both nodes are present
      expect(mergedNode.records).toHaveLength(2);
      expect(mergedNode.records[0]).toEqual(record1);
      expect(mergedNode.records[1]).toEqual(record2);
    });

    test('Node instance merge should combine with another node', () => {
      const record1 = {
        name: 'node1',
        label: 'First Label',
        edge_color: '#FF0000',
        tikz_object_attributes: 'draw=red',
        width: '3',
        height: '2'
      };
      
      const record2 = {
        name: 'node1',
        width: '5',
        height: '3',
        fillcolor: '#00FF00',
        tikz_object_attributes: 'fill=blue'
      };
      
      const node1 = NodeReader.processNodeRecord(record1);
      const node2 = NodeReader.processNodeRecord(record2);
      
      // Merge node2 into node1
      node1.merge(node2);
      
      // Check that properties from both nodes are present, with node2 taking priority
      expect(node1.name).toBe('node1');
      // Both records provide a name, but only record1 has a label
      expect(node1.label).toBe('First Label');
      expect(node1.edge_color).toBe('#FF0000'); // From original (not overridden)
      expect(node1.fillcolor).toBe('#00FF00');  // From node2
      expect(node1.width).toBe(5);      // From node2 (overrides original)
      expect(node1.height).toBe(3);     // From node2 (overrides original)
      
      // Check that tikz_object_attributes are concatenated
      expect(node1.tikz_object_attributes).toBe('draw=red, fill=blue');
      
      // Check that records from both nodes are present
      expect(node1.records).toHaveLength(2);
      expect(node1.records[0]).toEqual(record1);
      expect(node1.records[1]).toEqual(record2);
    });

    test('should handle node with hide_label flag', () => {
      const record = {
        name: 'node1',
        hide_label: true
      };
      
      const node = NodeReader.processNodeRecord(record);
      
      expect(node.name).toBe('node1');
      expect(node.hide_label).toBe(true);
      expect(node.label).toBeUndefined();
    });
  });
}); 