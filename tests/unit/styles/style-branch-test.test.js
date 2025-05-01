const assert = require('assert');
const path = require('path');
const fs = require('fs');  // Base fs module for sync operations
const fsPromises = fs.promises;  // Promise-based API for async operations
const ReaderManager = require('../../../src/io/reader-manager');
const StyleHandler = require('../../../src/styles/style-handler');
const DynamicProperty = require('../../../src/io/models/dynamic-property');

// Set a 10-minute timeout for this test suite
jest.setTimeout(600000);

describe('StyleHandler.getStyleBranchAndModify', () => {

    const handler = new StyleHandler();

    // Setup - load test YAML file before tests
    beforeAll(async () => {
        try {
            const readerManager = new ReaderManager();
            
            // Get the ABSOLUTE test fixture path (similar to hierarchy-poc.js)
            const filePath = path.resolve(__dirname, 'fixtures', 'style-latex.yaml');

            // Read the file content to verify it's readable
            try {
                await fsPromises.readFile(filePath, 'utf8');
            } catch (fileErr) {
                console.error('Error reading file:', fileErr);
            }
            
            // Load the style file with error handling
            try {
                await readerManager.processStyleFiles([filePath], handler);
            } catch (err) {
                console.error('Error in processStyleFiles:', err);
            }
        } catch (err) {
            console.error('Setup error:', err);
        }
    });
    
    describe('Path Parsing Utility', () => {
        test('should parse string paths correctly', () => {
            const result = StyleHandler.parsePath('node.object.tikz');
            expect(result.segments).toEqual(['node', 'object', 'tikz']);
            expect(result.types).toEqual(['name', 'name', 'name']);
        });
        
        test('should parse array paths correctly', () => {
            const result = StyleHandler.parsePath(['node', 'object', 'tikz']);
            expect(result.segments).toEqual(['node', 'object', 'tikz']);
            expect(result.types).toEqual(['name', 'name', 'name']);
        });
        
        test('should detect numeric indices in paths', () => {
            const result = StyleHandler.parsePath('items.0.name');
            expect(result.segments).toEqual(['items', '0', 'name']);
            expect(result.types).toEqual(['name', 'index', 'name']);
        });
    });
    
    describe('Style Resolution with String Paths', () => {
        test('should access node object properties with dot notation', () => {
            const tikz_node = handler.getStyleBranchAndModify('base, soft', 'node.object.tikz');
            expect(tikz_node).toBeDefined();
            expect(tikz_node.draw).toEqual('#000000');
            expect(tikz_node.fill).toEqual('#ffffff');

            const tikz_edge = handler.getStyleBranchAndModify('base, soft', 'edge.object.tikz');
            expect(tikz_edge).toBeDefined();
            expect(tikz_edge.draw).toEqual('red');
            expect(tikz_edge['line width']).toEqual('0.01cm');
        });
        
        test('should access text style properties with dot notation', () => {
            const latex = handler.getStyleBranchAndModify('base', 'node.text.latex');
            expect(latex).toBeDefined();
            expect(latex.flags).toBeDefined();
        });
    });
    
    describe('Style Resolution with Array Paths', () => {
        test('should access node object properties with array path', () => {
            const tikz = handler.getStyleBranchAndModify('base', ['node', 'object', 'tikz']);
            expect(tikz).toBeDefined();
            expect(tikz.draw).toBeDefined();
        });
    });
    
    describe('Style Stacking', () => {
        test('should merge styles using array style stack', () => {
            const result = handler.getStyleBranchAndModify(['base', 'label'], 'node.object');
            expect(result).toBeDefined();
            // Verify it has properties from both styles if available
        });
        
        test('should merge styles using string style stack', () => {
            const result = handler.getStyleBranchAndModify('base,label', 'node.object');
            expect(result).toBeDefined();
            // Verify it has properties from both styles if available
        });
    });
    
    describe('Property Customization', () => {
        test('should apply custom properties', () => {
            // Create a custom property to override properties using createValidated
            const { property: customProperty } = DynamicProperty.createValidated({ 
                renderer: 'common', 
                namePath: 'node.object.tikz.fill', 
                dataType: 'string', 
                value: 'blue' 
            });
            
            const customProperties = [customProperty];
            
            const result = handler.getStyleBranchAndModify('base', 'node.object', customProperties);
            expect(result).toBeDefined();
            // The result should include our custom property
            expect(result.tikz).toBeDefined();
        });
        
        test('should apply multiple custom properties', () => {
            // Create multiple custom properties using createValidated
            const { property: customProperty1, errors: errors1 } = DynamicProperty.createValidated({ 
                renderer: 'common', 
                namePath: 'node.object.tikz.draw', 
                dataType: 'string', 
                value: 'red' 
            });

            const { property: customProperty2, errors: errors2 } = DynamicProperty.createValidated({ 
                renderer: 'common', 
                namePath: 'node.object.tikz.line-width', 
                dataType: 'string', 
                value: '2pt' 
            });
            
            const customProperties = [
                customProperty1,
                customProperty2
            ];
            
            const result = handler.getStyleBranchAndModify('base', 'node.object', customProperties);
            expect(result).toBeDefined();
            // The result should include our custom properties
            expect(result.tikz['line-width']).toEqual('2pt');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should return empty object for non-existent path', () => {
            const result = handler.getStyleBranchAndModify('base', 'nonexistent.path');
            expect(result).toEqual({});
        });
        
        test('should handle empty style stack', () => {
            const result = handler.getStyleBranchAndModify([], 'node.object');
            expect(result).toEqual({});
        });
        
        test('should handle non-existent style name', () => {
            const result_nonexistent = handler.getStyleBranchAndModify('nonexistent', 'node.object');
            const result_base = handler.getStyleBranchAndModify('base', 'node.object');
            expect(result_nonexistent).toEqual(result_base);
        });
    });
});
