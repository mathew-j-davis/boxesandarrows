const fs = require('fs').promises;
const path = require('path');
const NodeYamlReader = require('../../../src/io/readers/node-yaml-reader');
const EdgeYamlReader = require('../../../src/io/readers/edge-yaml-reader');

// Mock yaml data
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

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

describe('YAML Readers', () => {
  let mockRenderer;
  let mockScale;
  let mockNodes;
  
  beforeEach(() => {
    // Create mock style handler
    const mockStyleHandler = {
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
    
    // Mock nodes map for edge processing
    mockNodes = new Map();
    mockNodes.set('node1', { name: 'node1', x: 10, y: 20, width: 5, height: 3 });
    mockNodes.set('node2', { name: 'node2', x: 30, y: 40, width: 4, height: 3 });
    
    // Mock the readFile method
    fs.readFile.mockResolvedValue(mockYamlContent);
  });
  
  describe('NodeYamlReader', () => {
    test('should read nodes from YAML file', async () => {
      const nodes = await NodeYamlReader.readFromYaml('test.yaml', mockScale, mockRenderer);
      
      expect(nodes).toHaveLength(2);
      expect(nodes[0].name).toBe('node1');
      expect(nodes[1].name).toBe('node2');
      
      expect(nodes[0].label).toBe('Node 1');
      expect(nodes[1].label).toBe('Node 2');
      
      expect(nodes[0].x).toBe(10);
      expect(nodes[1].x).toBe(30);
      
      expect(nodes[0].tikz_object_attributes).toBe('draw=red, fill=blue, dashed');
      expect(nodes[1].tikz_object_attributes).toBe('rounded corners=3pt');
    });
    
    test('should handle errors when reading YAML file', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));
      
      await expect(NodeYamlReader.readFromYaml('test.yaml', mockScale, mockRenderer))
        .rejects.toThrow('File not found');
    });
  });
  
  describe('EdgeYamlReader', () => {
    test('should read edges from YAML file', async () => {
      // Mock EdgeReader.processEdgeRecord to return a valid edge object
      const EdgeReader = require('../../../src/io/readers/edge-reader');
      
      // Preserve the original implementation
      const originalProcessEdgeRecord = EdgeReader.processEdgeRecord;
      
      // Mock the processEdgeRecord method
      EdgeReader.processEdgeRecord = jest.fn().mockImplementation((record, scale, nodes, renderer) => {
        return {
          from: record.from,
          to: record.to,
          label: record.label,
          tikz_object_attributes: record.tikz_object_attributes
        };
      });
      
      try {
        const edges = await EdgeYamlReader.readFromYaml('test.yaml', mockScale, mockNodes, mockRenderer);
        
        expect(edges).toHaveLength(1);
        expect(edges[0].from).toBe('node1');
        expect(edges[0].to).toBe('node2');
        expect(edges[0].label).toBe('Edge 1-2');
        expect(edges[0].tikz_object_attributes).toBe('draw=red, dashed');
      } finally {
        // Restore the original implementation
        EdgeReader.processEdgeRecord = originalProcessEdgeRecord;
      }
    });
    
    test('should handle errors when reading YAML file', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));
      
      await expect(EdgeYamlReader.readFromYaml('test.yaml', mockScale, mockNodes, mockRenderer))
        .rejects.toThrow('File not found');
    });
  });
}); 