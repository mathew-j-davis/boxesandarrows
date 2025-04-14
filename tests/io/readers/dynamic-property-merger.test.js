const assert = require('assert');
const DynamicPropertyMerger = require('../../../src/io/readers/dynamic-property-merger');
const DynamicProperty = require('../../../src/io/models/dynamic-property');

describe('DynamicPropertyMerger', () => {
    describe('toHierarchy', () => {
        
        it('should convert simple properties to a hierarchy', () => {
            // Arrange
            const properties = [
                new DynamicProperty({ renderer: 'common', namePath: 'color', namePathArray: ['color'], value: 'red' }),
                new DynamicProperty({ renderer: 'common', namePath: 'size', namePathArray: ['size'], value: 10 })
            ];
            
            // Act
            const result = DynamicPropertyMerger.toHierarchy(properties);
            
            // Assert
            assert.deepStrictEqual(result, {
                color: 'red',
                size: 10
            });
        });
        
        it('should handle nested properties', () => {
            // Arrange
            const properties = [
                new DynamicProperty({ renderer: 'common', namePath: 'font.family', namePathArray: ['font', 'family'], value: 'Arial' }),
                new DynamicProperty({ renderer: 'common', namePath: 'font.size', namePathArray: ['font', 'size'], value: 12 })
            ];
            
            // Act
            const result = DynamicPropertyMerger.toHierarchy(properties);
            
            // Assert
            assert.deepStrictEqual(result, {
                font: {
                    family: 'Arial',
                    size: 12
                }
            });
        });
        
        it('should handle mixed nesting levels', () => {
            // Arrange
            const properties = [
                new DynamicProperty({ renderer: 'common', namePath: 'color', namePathArray: ['color'], value: 'blue' }),
                new DynamicProperty({ renderer: 'common', namePath: 'border.width', namePathArray: ['border', 'width'], value: 1 }),
                new DynamicProperty({ renderer: 'common', namePath: 'border.style', namePathArray: ['border', 'style'], value: 'solid' })
            ];
            
            // Act
            const result = DynamicPropertyMerger.toHierarchy(properties);
            
            // Assert
            assert.deepStrictEqual(result, {
                color: 'blue',
                border: {
                    width: 1,
                    style: 'solid'
                }
            });
        });
        
        it('should handle array indices in paths', () => {
            // Arrange
            const properties = [
                new DynamicProperty({ 
                    renderer: 'common', 
                    namePath: 'points.0.x', 
                    namePathArray: ['points', '0', 'x'],
                    namePathTypes: ['name', 'index', 'name'],
                    value: 10 
                }),
                new DynamicProperty({ 
                    renderer: 'common', 
                    namePath: 'points.0.y', 
                    namePathArray: ['points', '0', 'y'],
                    namePathTypes: ['name', 'index', 'name'],
                    value: 20 
                }),
                new DynamicProperty({ 
                    renderer: 'common', 
                    namePath: 'points.1.x', 
                    namePathArray: ['points', '1', 'x'],
                    namePathTypes: ['name', 'index', 'name'],
                    value: 30 
                }),
                new DynamicProperty({ 
                    renderer: 'common', 
                    namePath: 'points.1.y', 
                    namePathArray: ['points', '1', 'y'],
                    namePathTypes: ['name', 'index', 'name'],
                    value: 40 
                })
            ];
            
            // Act
            const result = DynamicPropertyMerger.toHierarchy(properties);
            
            // Assert
            assert.deepStrictEqual(result, {
                points: [
                    { x: 10, y: 20 },
                    { x: 30, y: 40 }
                ]
            });
        });
        
        it('should place flag properties in a __flags container', () => {
            // Arrange
            const properties = [
                new DynamicProperty({ 
                    renderer: 'common', 
                    namePath: 'font.size', 
                    namePathArray: ['font', 'size'], 
                    value: 12,
                    isFlag: false
                }),
                new DynamicProperty({ 
                    renderer: 'latex', 
                    namePath: 'font.bold', 
                    namePathArray: ['font', 'bold'], 
                    value: '\\textbf',
                    isFlag: true
                })
            ];
            
            // Act
            const result = DynamicPropertyMerger.toHierarchy(properties);
            
            // Assert
            assert.deepStrictEqual(result, {
                font: {
                    size: 12,
                    __flags: {
                        bold: '\\textbf'
                    }
                }
            });
        });
        
        it('should handle flags at root level', () => {
            // Arrange
            const properties = [
                new DynamicProperty({ 
                    renderer: 'common', 
                    namePath: 'color', 
                    namePathArray: ['color'], 
                    value: 'red',
                    isFlag: false
                }),
                new DynamicProperty({ 
                    renderer: 'latex', 
                    namePath: 'bold', 
                    namePathArray: ['bold'], 
                    value: '\\textbf',
                    isFlag: true
                })
            ];
            
            // Act
            const result = DynamicPropertyMerger.toHierarchy(properties);
            
            // Assert
            assert.deepStrictEqual(result, {
                color: 'red',
                __flags: {
                    bold: '\\textbf'
                }
            });
        });
        
        it('should handle flags in arrays', () => {
            // Arrange
            const properties = [
                new DynamicProperty({ 
                    renderer: 'common', 
                    namePath: 'items.0.name', 
                    namePathArray: ['items', '0', 'name'],
                    namePathTypes: ['name', 'index', 'name'],
                    value: 'Item 1',
                    isFlag: false
                }),
                new DynamicProperty({ 
                    renderer: 'latex', 
                    namePath: 'items.0.emphasis', 
                    namePathArray: ['items', '0', 'emphasis'],
                    namePathTypes: ['name', 'index', 'name'],
                    value: '\\emph',
                    isFlag: true
                }),
                new DynamicProperty({ 
                    renderer: 'common', 
                    namePath: 'items.1.name', 
                    namePathArray: ['items', '1', 'name'],
                    namePathTypes: ['name', 'index', 'name'],
                    value: 'Item 2',
                    isFlag: false
                })
            ];
            
            // Act
            const result = DynamicPropertyMerger.toHierarchy(properties);
            
            // Assert
            assert.deepStrictEqual(result, {
                items: [
                    { 
                        name: 'Item 1',
                        __flags: {
                            emphasis: '\\emph'
                        }
                    },
                    { 
                        name: 'Item 2' 
                    }
                ]
            });
        });
        
        it('should handle sparse arrays', () => {
            // Arrange
            const properties = [
                new DynamicProperty({ 
                    renderer: 'common', 
                    namePath: 'items.0', 
                    namePathArray: ['items', '0'],
                    namePathTypes: ['name', 'index'],
                    value: 'First',
                    isFlag: false
                }),
                new DynamicProperty({ 
                    renderer: 'common', 
                    namePath: 'items.5', 
                    namePathArray: ['items', '5'],
                    namePathTypes: ['name', 'index'],
                    value: 'Last',
                    isFlag: false
                })
            ];
            
            // Act
            const result = DynamicPropertyMerger.toHierarchy(properties);
            
            // Assert
            const expected = {
                items: ['First', , , , , 'Last']  // Sparse array with empty slots
            };
            assert.deepStrictEqual(result, expected);
            assert.strictEqual(result.items[0], 'First');
            assert.strictEqual(result.items[5], 'Last');
            assert.strictEqual(result.items.length, 6);
        });
        
        it('should handle invalid or malformed paths gracefully', () => {
            // Arrange
            const properties = [
                new DynamicProperty({ 
                    renderer: 'common', 
                    namePath: '',  // Empty path
                    namePathArray: [],
                    value: 'test'
                }),
                // This is a malformed path - trying to set an array index on a scalar
                new DynamicProperty({ 
                    renderer: 'common', 
                    namePath: 'scalar.0', 
                    namePathArray: ['scalar', '0'],
                    namePathTypes: ['name', 'index'],
                    value: 'will not be set'
                }),
                // Valid property that should still work
                new DynamicProperty({ 
                    renderer: 'common', 
                    namePath: 'valid', 
                    namePathArray: ['valid'],
                    value: 'this works'
                })
            ];
            
            // Act - Should not throw
            const result = DynamicPropertyMerger.toHierarchy(properties);
            
            // Assert
            assert.strictEqual(result.valid, 'this works');
            // The scalar.0 path will cause a warning but shouldn't crash
            assert.strictEqual(typeof result.scalar, 'object');
        });
    });
});
