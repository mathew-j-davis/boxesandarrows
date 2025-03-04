const NodeReader = require('../../../src/io/readers/node-reader');

// Mock dependencies
jest.mock('../../../src/io/readers/csv-reader', () => ({
  readFile: jest.fn().mockImplementation(() => Promise.resolve([]))
}));

describe('NodeReader', () => {
  describe('processNodeRecord', () => {
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
        // This is how NodeReader expects processAttributes to behave - return tikz properties directly
        processAttributes: jest.fn().mockReturnValue({
          'draw': 'colorABCDEF',
          'rounded corners': '5pt'
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
      expect(node.x).toBe(10);
      expect(node.y).toBe(20);
      expect(node.width).toBe(5);
      expect(node.height).toBe(3);
    });
    
    test('should process attributes from the attributes field', () => {
      const record = {
        name: 'node1',
        attributes: 'draw=red, fill=blue, dashed'
      };
      
      NodeReader.processNodeRecord(record, mockScale, mockRenderer);
      
      expect(mockStyleHandler.processAttributes).toHaveBeenCalledWith('draw=red, fill=blue, dashed');
    });
    
    test('should process color attributes correctly', () => {
      const record = {
        name: 'node1',
        color: '#FF0000', 
        fillcolor: '#00FF00',
        textcolor: '#0000FF'
      };
      
      // Set up mock return for processAttributes that matches NodeReader's expectations
      mockStyleHandler.processAttributes.mockReturnValue({});
      
      const node = NodeReader.processNodeRecord(record, mockScale, mockRenderer);
      
      // Check that the original colors are preserved
      expect(node.color).toBe('#FF0000');
      expect(node.fillcolor).toBe('#00FF00');
      expect(node.textcolor).toBe('#0000FF');
      
      // Check that colors were directly set on the merged style
      expect(node.mergedStyle.tikz.draw).toBe('#FF0000');
      expect(node.mergedStyle.tikz.fill).toBe('#00FF00');
      expect(node.mergedStyle.tikz.text).toBe('#0000FF');
    });
    
    test('should merge style defaults with attributes', () => {
      const record = {
        name: 'node1',
        style: 'custom',
        attributes: 'fill=green'
      };
      
      // Set up mock return values
      mockStyleHandler.getCompleteStyle.mockReturnValue({
        tikz: { shape: 'rectangle', draw: 'black' }
      });
      mockStyleHandler.processAttributes.mockReturnValue({
        fill: 'green'  // Direct attribute, not nested under tikz
      });
      
      const node = NodeReader.processNodeRecord(record, mockScale, mockRenderer);
      
      // Verify style handler was called with correct params
      expect(mockStyleHandler.getCompleteStyle).toHaveBeenCalledWith('custom', 'node', 'object');
      expect(mockStyleHandler.processAttributes).toHaveBeenCalledWith('fill=green');
      
      // Check merged style (matching how NodeReader actually does the merge)
      expect(node.mergedStyle.tikz.shape).toBe('rectangle');
      expect(node.mergedStyle.tikz.draw).toBe('black');
      expect(node.mergedStyle.tikz.fill).toBe('green');
    });
  });
}); 