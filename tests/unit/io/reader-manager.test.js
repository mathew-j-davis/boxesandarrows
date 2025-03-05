const ReaderManager = require('../../../src/io/reader-manager');
const NodeReader = require('../../../src/io/readers/node-reader');
const EdgeReader = require('../../../src/io/readers/edge-reader');
const NodeYamlReader = require('../../../src/io/readers/node-yaml-reader');
const EdgeYamlReader = require('../../../src/io/readers/edge-yaml-reader');

// Mock readers
jest.mock('../../../src/io/readers/node-reader');
jest.mock('../../../src/io/readers/edge-reader');
jest.mock('../../../src/io/readers/node-yaml-reader');
jest.mock('../../../src/io/readers/edge-yaml-reader');

describe('ReaderManager', () => {
  let readerManager;
  let mockRenderer;
  let mockScale;
  
  beforeEach(() => {
    // Create mock style handler
    const mockStyleHandler = {
      getCompleteStyle: jest.fn(),
      processAttributes: jest.fn(),
      registerColor: jest.fn()
    };
    
    // Create mock renderer
    mockRenderer = {
      styleHandler: mockStyleHandler
    };
    
    // Create reader manager
    readerManager = new ReaderManager(mockRenderer);
    
    // Set up scale information
    mockScale = {
      position: { x: 1, y: 1 },
      size: { w: 1, h: 1 }
    };
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  describe('processNodeFiles', () => {
    test('should process CSV node files', async () => {
      // Set up mock response
      NodeReader.readFromCsv.mockResolvedValue([
        { name: 'node1', x: 10, y: 20 },
        { name: 'node2', x: 30, y: 40 }
      ]);
      
      const nodes = await readerManager.processNodeFiles(['nodes.csv'], mockScale);
      
      expect(NodeReader.readFromCsv).toHaveBeenCalledWith('nodes.csv', mockScale, mockRenderer);
      expect(nodes.size).toBe(2);
      expect(nodes.get('node1')).toBeDefined();
      expect(nodes.get('node2')).toBeDefined();
      expect(nodes.get('node1').x).toBe(10);
    });
    
    test('should process YAML node files', async () => {
      // Set up mock response
      NodeYamlReader.readFromYaml.mockResolvedValue([
        { name: 'node1', x: 10, y: 20 },
        { name: 'node2', x: 30, y: 40 }
      ]);
      
      const nodes = await readerManager.processNodeFiles(['nodes.yaml'], mockScale);
      
      expect(NodeYamlReader.readFromYaml).toHaveBeenCalledWith('nodes.yaml', mockScale, mockRenderer);
      expect(nodes.size).toBe(2);
      expect(nodes.get('node1')).toBeDefined();
      expect(nodes.get('node2')).toBeDefined();
    });
    
    test('should process both CSV and YAML node files', async () => {
      // Set up mock responses
      NodeReader.readFromCsv.mockResolvedValue([
        { name: 'node1', x: 10, y: 20 }
      ]);
      
      NodeYamlReader.readFromYaml.mockResolvedValue([
        { name: 'node2', x: 30, y: 40 }
      ]);
      
      const nodes = await readerManager.processNodeFiles(['nodes.csv', 'nodes.yaml'], mockScale);
      
      expect(nodes.size).toBe(2);
      expect(nodes.get('node1')).toBeDefined();
      expect(nodes.get('node2')).toBeDefined();
    });
    
    test('should handle duplicate node names by merging properties', async () => {
      // Set up test data
      const node1 = { name: 'node1', label: 'Node 1', x: 10, y: 20, tikz_object_attributes: 'draw=red' };
      const node2 = { name: 'node1', label: 'Updated Node 1', height: 5, tikz_object_attributes: 'fill=blue' };
      
      // Mock return values
      NodeReader.readFromCsv.mockResolvedValueOnce([node1]);
      NodeYamlReader.readFromYaml.mockResolvedValueOnce([node2]);
      
      // Process nodes
      await readerManager.processNodeFiles(['nodes.csv', 'nodes.yaml'], mockScale);
      
      // Verify results
      const mergedNode = readerManager.getNode('node1');
      expect(mergedNode).toBeDefined();
      expect(mergedNode.name).toBe('node1');
      expect(mergedNode.label).toBe('Updated Node 1'); // YAML value takes priority
      expect(mergedNode.x).toBe(10); // Original value preserved
      expect(mergedNode.y).toBe(20); // Original value preserved
      expect(mergedNode.height).toBe(5); // YAML value added
      expect(mergedNode.tikz_object_attributes).toBe('draw=red, fill=blue'); // Attributes merged
    });
    
    test('should ignore unsupported file formats', async () => {
      const nodes = await readerManager.processNodeFiles(['nodes.json'], mockScale);
      
      expect(nodes.size).toBe(0);
      expect(NodeReader.readFromCsv).not.toHaveBeenCalled();
      expect(NodeYamlReader.readFromYaml).not.toHaveBeenCalled();
    });
    
    test('should return empty array for empty input', async () => {
      const nodes = await readerManager.processNodeFiles([], mockScale);
      
      expect(nodes.size).toBe(0);
      expect(NodeReader.readFromCsv).not.toHaveBeenCalled();
      expect(NodeYamlReader.readFromYaml).not.toHaveBeenCalled();
    });
  });
  
  describe('processEdgeFiles', () => {
    test('should process CSV edge files', async () => {
      // Add a node to the map first
      readerManager.nodes.set('node1', { name: 'node1' });
      readerManager.nodes.set('node2', { name: 'node2' });
      
      // Set up mock response
      EdgeReader.readFromCsv.mockResolvedValue([
        { from: 'node1', to: 'node2' }
      ]);
      
      const edges = await readerManager.processEdgeFiles(['edges.csv'], mockScale);
      
      expect(EdgeReader.readFromCsv).toHaveBeenCalledWith('edges.csv', readerManager.nodes, mockScale, mockRenderer);
      expect(edges.length).toBe(1);
      expect(edges[0].from).toBe('node1');
      expect(edges[0].to).toBe('node2');
    });
    
    test('should process YAML edge files', async () => {
      // Add a node to the map first
      readerManager.nodes.set('node1', { name: 'node1' });
      readerManager.nodes.set('node2', { name: 'node2' });
      
      // Set up mock response
      EdgeYamlReader.readFromYaml.mockResolvedValue([
        { from: 'node1', to: 'node2' }
      ]);
      
      const edges = await readerManager.processEdgeFiles(['edges.yaml'], mockScale);
      
      expect(EdgeYamlReader.readFromYaml).toHaveBeenCalledWith('edges.yaml', mockScale, readerManager.nodes, mockRenderer);
      expect(edges.length).toBe(1);
      expect(edges[0].from).toBe('node1');
      expect(edges[0].to).toBe('node2');
    });
    
    test('should process both CSV and YAML edge files', async () => {
      // Add a node to the map first
      readerManager.nodes.set('node1', { name: 'node1' });
      readerManager.nodes.set('node2', { name: 'node2' });
      
      // Set up mock responses
      EdgeReader.readFromCsv.mockResolvedValue([
        { from: 'node1', to: 'node2' }
      ]);
      
      EdgeYamlReader.readFromYaml.mockResolvedValue([
        { from: 'node2', to: 'node1' }
      ]);
      
      const edges = await readerManager.processEdgeFiles(['edges.csv', 'edges.yaml'], mockScale);
      
      expect(edges.length).toBe(2);
    });
    
    test('should ignore unsupported file formats', async () => {
      // Add a node to the map first
      readerManager.nodes.set('node1', { name: 'node1' });
      
      const edges = await readerManager.processEdgeFiles(['edges.json'], mockScale);
      
      expect(edges.length).toBe(0);
      expect(EdgeReader.readFromCsv).not.toHaveBeenCalled();
      expect(EdgeYamlReader.readFromYaml).not.toHaveBeenCalled();
    });
    
    test('should return empty array for empty input', async () => {
      const edges = await readerManager.processEdgeFiles([], mockScale);
      
      expect(edges.length).toBe(0);
      expect(EdgeReader.readFromCsv).not.toHaveBeenCalled();
    });
    
    test('should not process edges if no nodes are loaded', async () => {
      const edges = await readerManager.processEdgeFiles(['edges.csv'], mockScale);
      
      expect(edges.length).toBe(0);
      expect(EdgeReader.readFromCsv).not.toHaveBeenCalled();
    });
  });
  
  describe('helper methods', () => {
    test('getNodes should return all nodes', () => {
      readerManager.nodes.set('node1', { name: 'node1' });
      readerManager.nodes.set('node2', { name: 'node2' });
      
      const nodes = readerManager.getNodes();
      
      expect(nodes).toBe(readerManager.nodes);
      expect(nodes.size).toBe(2);
    });
    
    test('getEdges should return all edges', () => {
      readerManager.edges = [{ from: 'node1', to: 'node2' }];
      
      const edges = readerManager.getEdges();
      
      expect(edges).toBe(readerManager.edges);
      expect(edges.length).toBe(1);
    });
    
    test('getNode should return a specific node', () => {
      readerManager.nodes.set('node1', { name: 'node1' });
      
      const node = readerManager.getNode('node1');
      
      expect(node).toBeDefined();
      expect(node.name).toBe('node1');
    });
    
    test('getNode should return undefined for non-existent node', () => {
      const node = readerManager.getNode('non-existent');
      
      expect(node).toBeUndefined();
    });
  });
}); 