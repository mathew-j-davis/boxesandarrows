const DynamicPropertyMerger = require('../../src/io/readers/dynamic-property-merger');

// Helper function to create a property with namePathArray - removed group parameter
function createProperty(renderer, namePath, dataType, value, isFlag = false, clear = false) {
    return {
        renderer,
        namePath,
        dataType,
        value,
        isFlag,
        clear,
        namePathArray: namePath ? namePath.split('.') : []
    };
}

describe('DynamicPropertyMerger', () => {
    // Define compatible renderers for testing
    const rendererCompatibility = ['common', 'vector', 'latex'];
    
    test('should merge simple properties correctly', () => {
        const properties = [
            createProperty('common', 'prop1', 'string', 'value1'),
            createProperty('vector', 'prop2', 'string', 'value2'),
            createProperty('latex', 'prop3', 'string', 'value3')
        ];
        
        const merged = DynamicPropertyMerger.mergePropertiesWithRendererFilter(properties, rendererCompatibility);
        
        expect(merged.length).toBe(3);
        expect(merged[0].value).toBe('value1');
        expect(merged[1].value).toBe('value2');
        expect(merged[2].value).toBe('value3');
    });
    
    test('should handle exact match with chronological ordering', () => {
        const properties = [
            createProperty('common', 'prop', 'string', 'common value'),
            createProperty('vector', 'prop', 'string', 'vector value'),
            createProperty('latex',  'prop', 'string', 'latex value')
        ];
        
        const merged = DynamicPropertyMerger.mergePropertiesWithRendererFilter(properties, rendererCompatibility);
        
        // Last one in the array wins
        expect(merged.length).toBe(1);
        expect(merged[0].renderer).toBe('latex');
        expect(merged[0].value).toBe('latex value');
    });
    
    test('should handle exact match with chronological ordering regardless of renderer', () => {
        const properties = [
            createProperty('latex', 'prop', 'string', 'latex value'),
            createProperty('vector', 'prop', 'string', 'vector value'),
            createProperty('common', 'prop', 'string', 'common value')
        ];
        
        const merged = DynamicPropertyMerger.mergePropertiesWithRendererFilter(properties, rendererCompatibility);
        
        // Last one wins, regardless of renderer type
        expect(merged.length).toBe(1);
        expect(merged[0].renderer).toBe('common');
        expect(merged[0].value).toBe('common value');
    });
    
    test('should remove parent property when child added', () => {
        const properties = [
            createProperty('vector', 'parent', 'string', 'parent value'),
            createProperty('vector', 'parent.child1', 'string', 'child1 value'),
            createProperty('vector', 'parent.child2', 'string', 'child2 value')
        ];
        
        const merged = DynamicPropertyMerger.mergePropertiesWithRendererFilter(properties, rendererCompatibility);
        
        expect(merged.length).toBe(2);
        expect(merged[0].namePath).toBe('parent.child1');
        expect(merged[0].value).toBe('child1 value');
    });
    
    test('should remove parent property when child added, regardless of renderer', () => {
        const properties = [
            createProperty('common', 'parent', 'string', 'parent value'),
            createProperty('vector', 'parent.child1', 'string', 'child1 value'),
            createProperty('latex',  'parent.child2', 'string', 'child2 value')
        ];
        
        const merged = DynamicPropertyMerger.mergePropertiesWithRendererFilter(properties, rendererCompatibility);
        
        expect(merged.length).toBe(2);
        expect(merged.find(p => p.namePath === 'parent')).toBeFalsy();
        expect(merged.find(p => p.namePath === 'parent.child1')).toBeTruthy();
        expect(merged.find(p => p.namePath === 'parent.child2')).toBeTruthy();
    });
    
    test('should keep different properties separate', () => {
        const properties = [
            createProperty('vector', 'prop.sibling', 'string', 'value'),
            createProperty('vector', 'prop.sibling', 'string', 'value'),
            createProperty('vector', 'prop.child', 'string', 'child'),
            createProperty('vector', 'prop.child', 'string', 'child')
        ];
        
        const merged = DynamicPropertyMerger.mergePropertiesWithRendererFilter(properties, rendererCompatibility);
        
        expect(merged.length).toBe(2);
        
   
        expect(merged).toBeTruthy();
        expect(merged.length).toBe(2);
        expect(merged[0].namePath).toBe('prop.sibling');
        expect(merged[1].namePath).toBe('prop.child');
        
    });
    
    test('should remove children and not add value when clear=true', () => {
        const properties = [
            // Add properties in a mixed order to test the algorithm thoroughly
            createProperty('common', 'a.b.c.d', 'string', 'abcd common'),
            createProperty('vector', 'a.b', 'string', '', false, true),
        ];
        
        const merged = DynamicPropertyMerger.mergePropertiesWithRendererFilter(properties, rendererCompatibility);
        

        
        expect(merged.length).toBe(0);
    });
    
    test('should not remove siblings when clear=true', () => {
        const properties = [
            createProperty('common', 'thing.subthing.flavor', 'string', 'vanilla'),
            createProperty('latex', 'thing.subthing.crunchiness', 'string', 'high'),
            createProperty('vector', 'thing.subthing.flavor', 'string', '', false, true)
        ];
        
        const merged = DynamicPropertyMerger.mergePropertiesWithRendererFilter(properties, rendererCompatibility);
        
        // The vector renderer's thing.subthing property with clear=true
        // should remove all children
        expect(merged.length).toBe(1);
        
        const biscuitProp = merged.find(p => p.namePath === 'thing.subthing.crunchiness');
        expect(biscuitProp).toBeTruthy();
        expect(biscuitProp.value).toBe('high');
        
    });
    
    test('should handle null values correctly with clear', () => {
        const properties = [
            createProperty('vector', 'prop1', 'string', 'value'),
            createProperty('vector', 'prop1.child', 'string', 'child value'),
            createProperty('vector', 'prop1', 'string', null, false, true)
        ];
        
        const merged = DynamicPropertyMerger.mergePropertiesWithRendererFilter(properties, rendererCompatibility);
        
        // With clear=true, null value clears children
        expect(merged.length).toBe(0);
    });
    
    test('should filter renderers not in compatibility list', () => {
        const properties = [
            createProperty('common', 'prop1', 'string', 'common'),
            createProperty('unknown', 'prop2', 'string', 'unknown'),
            createProperty('vector', 'prop3', 'string', 'vector')
        ];
        
        const merged = DynamicPropertyMerger.mergePropertiesWithRendererFilter(properties, rendererCompatibility);
        
        // Should exclude 'unknown' renderer
        expect(merged.length).toBe(2);
        expect(merged.find(p => p.renderer === 'unknown')).toBeFalsy();
    });
    
    test('should use chronological order when same property appears multiple times', () => {
        // Add properties in sequence to test last-one-wins
        const properties = [
            createProperty('common', 'prop', 'string', 'common value'),
            createProperty('vector', 'prop.child', 'string', 'vector child'),
            createProperty('vector', 'prop', 'string', 'vector value'),
            createProperty('latex', 'prop', 'string', 'latex value'),
        ];
        
        const merged = DynamicPropertyMerger.mergePropertiesWithRendererFilter(properties, rendererCompatibility);
        
        // Last definition of 'prop' (latex) wins and has clear=true
        expect(merged.length).toBe(1);
        expect(merged[0].renderer).toBe('latex');
        expect(merged[0].value).toBe('latex value');
    });

});