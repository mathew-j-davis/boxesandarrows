const ReaderManager = require('../../../src/io/reader-manager');
const NodeReader = require('../../../src/io/readers/node-reader');
const EdgeReader = require('../../../src/io/readers/edge-reader');
const StyleReader = require('../../../src/io/readers/style-reader');
const { Node } = require('../../../src/io/models/node');

// Mock readers
jest.mock('../../../src/io/readers/node-reader');
jest.mock('../../../src/io/readers/edge-reader');
jest.mock('../../../src/io/readers/style-reader');

describe('ReaderManager', () => {
  let readerManager;
  let mockStyleHandler;
  let mockScale;
  
  beforeEach(() => {
    // Create mock style handler
    mockStyleHandler = {
      getCompleteStyle: jest.fn(),
      processAttributes: jest.fn(),
      registerColor: jest.fn(),
      mergeStylesheet: jest.fn(),
      processPageAndStyleDocuments: jest.fn(),
      getPageScale: jest.fn().mockReturnValue({
        position: { x: 1, y: 1 },
        size: { w: 1, h: 1 }
      })
    };
    
    // Create reader manager
    readerManager = new ReaderManager();
    
    // Set up scale information
    mockScale = {
      position: { x: 1, y: 1 },
      size: { w: 1, h: 1 }
    };
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  describe('processNodeFiles', () => {
    test('should process CSV node files and collect raw records without merging', async () => {
      // Set up mock response
      NodeReader.readRecordsFromCsv = jest.fn().mockResolvedValue([
        { name: 'node1', x: 10, y: 20 },
        { name: 'node2', x: 30, y: 40 }
      ]);
      
      const nodeRecords = await readerManager.processNodeFiles(['nodes.csv']);
      
      expect(NodeReader.readRecordsFromCsv).toHaveBeenCalledWith('nodes.csv');
      expect(nodeRecords.length).toBe(2);
      expect(nodeRecords[0].name).toBe('node1');
      expect(nodeRecords[1].name).toBe('node2');
      expect(readerManager.allNodeRecords.length).toBe(2);
      
      // The nodes map should still be empty at this point
      expect(readerManager.nodes.size).toBe(0);
    });
    
    test('should process YAML node files and collect raw records without merging', async () => {
      // Set up mock response
      NodeReader.readRecordsFromYaml = jest.fn().mockResolvedValue([
        { name: 'node1', x: 10, y: 20 },
        { name: 'node2', x: 30, y: 40 }
      ]);
      
      const nodeRecords = await readerManager.processNodeFiles(['nodes.yaml']);
      
      expect(NodeReader.readRecordsFromYaml).toHaveBeenCalledWith('nodes.yaml');
      expect(nodeRecords.length).toBe(2);
      expect(nodeRecords[0].name).toBe('node1');
      expect(nodeRecords[1].name).toBe('node2');
      expect(readerManager.allNodeRecords.length).toBe(2);
      
      // The nodes map should still be empty at this point
      expect(readerManager.nodes.size).toBe(0);
    });
    
    test('should process both CSV and YAML node files and collect all raw records', async () => {
      // Set up mock responses
      NodeReader.readRecordsFromCsv = jest.fn().mockResolvedValue([
        { name: 'node1', x: 10, y: 20 }
      ]);
      
      NodeReader.readRecordsFromYaml = jest.fn().mockResolvedValue([
        { name: 'node2', x: 30, y: 40 }
      ]);
      
      const nodeRecords = await readerManager.processNodeFiles(['nodes.csv', 'nodes.yaml']);
      
      expect(nodeRecords.length).toBe(2);
      expect(nodeRecords[0].name).toBe('node1');
      expect(nodeRecords[1].name).toBe('node2');
      expect(readerManager.allNodeRecords.length).toBe(2);
      
      // The nodes map should still be empty at this point
      expect(readerManager.nodes.size).toBe(0);
    });
    
    test('should collect duplicate node records without merging them', async () => {
      // Set up test data
      const node1 = { name: 'node1', label: 'Node 1', x: 10, y: 20, tikz_object_attributes: 'draw=red' };
      const node2 = { name: 'node1', label: 'Updated Node 1', height: 5, tikz_object_attributes: 'fill=blue' };
      
      // Mock return values
      NodeReader.readRecordsFromCsv = jest.fn().mockResolvedValueOnce([node1]);
      NodeReader.readRecordsFromYaml = jest.fn().mockResolvedValueOnce([node2]);
      
      // Process nodes
      const nodeRecords = await readerManager.processNodeFiles(['nodes.csv', 'nodes.yaml']);
      
      // Verify results - both records should be in the collection
      expect(nodeRecords.length).toBe(2);
      expect(nodeRecords[0].name).toBe('node1');
      expect(nodeRecords[1].name).toBe('node1');
      expect(readerManager.allNodeRecords.length).toBe(2);
      expect(readerManager.allNodeRecords[0].label).toBe('Node 1');
      expect(readerManager.allNodeRecords[1].label).toBe('Updated Node 1');
      
      // The nodes map should still be empty at this point
      expect(readerManager.nodes.size).toBe(0);
    });
    
    test('should return empty array for empty input', async () => {
      const nodeRecords = await readerManager.processNodeFiles([]);
      
      expect(nodeRecords.length).toBe(0);
      expect(readerManager.allNodeRecords.length).toBe(0);
      expect(NodeReader.readRecordsFromCsv).not.toHaveBeenCalled();
      expect(NodeReader.readRecordsFromYaml).not.toHaveBeenCalled();
    });
  });
  
  describe('mergeNodeRecords', () => {
    test('should merge raw node records', async () => {
      // Set up test data
      const record1 = { name: 'node1', label: 'Node 1', x: 10, y: 20, tikz_object_attributes: 'draw=red' };
      const record2 = { name: 'node2', label: 'Node 2', x: 30, y: 40 };
      
      // Add to allNodeRecords
      readerManager.allNodeRecords = [record1, record2];
      
      // Merge records
      const mergedRecords = readerManager.mergeNodeRecords();
      
      // Verify results
      expect(mergedRecords.size).toBe(2);
      expect(mergedRecords.get('node1')).toBeDefined();
      expect(mergedRecords.get('node2')).toBeDefined();
      expect(mergedRecords.get('node1').label).toBe('Node 1');
      expect(mergedRecords.get('node2').label).toBe('Node 2');
      
      // The nodes map should still be empty at this point
      expect(readerManager.nodes.size).toBe(0);
    });
    
    test('should merge duplicate node records', async () => {
      // Set up test data
      const record1 = { name: 'node1', label: 'Node 1', x: 10, y: 20, tikz_object_attributes: 'draw=red' };
      const record2 = { name: 'node1', label: 'Updated Node 1', height: 5, tikz_object_attributes: 'fill=blue' };
      
      // Add to allNodeRecords
      readerManager.allNodeRecords = [record1, record2];
      
      // Merge records
      const mergedRecords = readerManager.mergeNodeRecords();
      
      // Verify results
      expect(mergedRecords.size).toBe(1); // Only 1 record after merging
      const mergedRecord = mergedRecords.get('node1');
      expect(mergedRecord).toBeDefined();
      expect(mergedRecord.label).toBe('Updated Node 1'); // Second record's value takes priority
      expect(mergedRecord.x).toBe(10); // Original value preserved
      expect(mergedRecord.y).toBe(20); // Original value preserved
      expect(mergedRecord.height).toBe(5); // Second record's value added
      // Tikz attributes should be merged
      expect(mergedRecord.tikz_object_attributes).toBe('draw=red, fill=blue');
      
      // The nodes map should still be empty at this point
      expect(readerManager.nodes.size).toBe(0);
    });
    
    test('should handle empty allNodeRecords', async () => {
      // Ensure allNodeRecords is empty
      readerManager.allNodeRecords = [];
      
      // Merge records
      const mergedRecords = readerManager.mergeNodeRecords();
      
      // Verify results
      expect(mergedRecords.size).toBe(0);
      expect(readerManager.nodes.size).toBe(0);
    });
  });
  
  describe('createNodesFromRecords', () => {
    beforeEach(() => {
      // Mock NodeReader.processNodeRecord
      NodeReader.processNodeRecord = jest.fn().mockImplementation((record) => {
        // Create a new Node with the record properties
        return new Node(record);
      });
    });
    
    afterEach(() => {
      // Restore mocks
      jest.restoreAllMocks();
    });
    
    test('should create Node objects from merged records', () => {
      // Set up test data
      const mergedRecords = new Map();
      mergedRecords.set('node1', { name: 'node1', label: 'Node 1', x: 10, y: 20 });
      mergedRecords.set('node2', { name: 'node2', label: 'Node 2', x: 30, y: 40 });
      
      // Create nodes
      const nodes = readerManager.createNodesFromRecords(mergedRecords);
      
      // Verify NodeReader.processNodeRecord was called for each record
      expect(NodeReader.processNodeRecord).toHaveBeenCalledTimes(2);
      expect(NodeReader.processNodeRecord).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'node1', label: 'Node 1' })
      );
      expect(NodeReader.processNodeRecord).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'node2', label: 'Node 2' })
      );
      
      // Verify results
      expect(nodes.size).toBe(2);
      expect(nodes.get('node1')).toBeDefined();
      expect(nodes.get('node2')).toBeDefined();
      expect(nodes.get('node1').name).toBe('node1');
      expect(nodes.get('node1').label).toBe('Node 1');
      expect(nodes.get('node2').name).toBe('node2');
      expect(nodes.get('node2').label).toBe('Node 2');
    });
    
    test('should handle empty merged records', () => {
      // Set up test data
      const mergedRecords = new Map();
      
      // Create nodes
      const nodes = readerManager.createNodesFromRecords(mergedRecords);
      
      // Verify results
      expect(nodes.size).toBe(0);
      expect(NodeReader.processNodeRecord).not.toHaveBeenCalled();
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
      
      // Mock EdgeReader.processEdgeRecord
      EdgeReader.processEdgeRecord = jest.fn().mockImplementation((record) => {
        return {
          from: record.from,
          to: record.to
        };
      });
      
      const edges = await readerManager.processEdgeFiles(['edges.csv'], mockStyleHandler);
      
      expect(EdgeReader.readFromCsv).toHaveBeenCalledWith('edges.csv');
      expect(EdgeReader.processEdgeRecord).toHaveBeenCalled();
      expect(edges.length).toBe(1);
      expect(edges[0].from).toBe('node1');
      expect(edges[0].to).toBe('node2');
    });
    
    test('should process YAML edge files', async () => {
      // Add a node to the map first
      readerManager.nodes.set('node1', { name: 'node1' });
      readerManager.nodes.set('node2', { name: 'node2' });
      
      // Set up mock response
      EdgeReader.readFromYaml.mockResolvedValue([
        { from: 'node1', to: 'node2' }
      ]);
      
      // Mock EdgeReader.processEdgeRecord
      EdgeReader.processEdgeRecord = jest.fn().mockImplementation((record) => {
        return {
          from: record.from,
          to: record.to
        };
      });
      
      const edges = await readerManager.processEdgeFiles(['edges.yaml'], mockStyleHandler);
      
      expect(EdgeReader.readFromYaml).toHaveBeenCalledWith('edges.yaml');
      expect(EdgeReader.processEdgeRecord).toHaveBeenCalled();
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
      
      EdgeReader.readFromYaml.mockResolvedValue([
        { from: 'node2', to: 'node1' }
      ]);
      
      // Mock EdgeReader.processEdgeRecord
      EdgeReader.processEdgeRecord = jest.fn().mockImplementation((record) => {
        return {
          from: record.from,
          to: record.to
        };
      });
      
      const edges = await readerManager.processEdgeFiles(['edges.csv', 'edges.yaml'], mockStyleHandler);
      
      expect(EdgeReader.processEdgeRecord).toHaveBeenCalled();
      expect(edges.length).toBe(2);
    });
    
    test('should return empty array for empty input', async () => {
      const edges = await readerManager.processEdgeFiles([], mockStyleHandler);
      
      expect(edges.length).toBe(0);
      expect(EdgeReader.readFromCsv).not.toHaveBeenCalled();
    });
    
    test('should not process edges if no nodes are loaded', async () => {
      const edges = await readerManager.processEdgeFiles(['edges.csv'], mockStyleHandler);
      
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