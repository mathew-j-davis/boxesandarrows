const DynamicPropertyMerger = require('../../src/io/readers/dynamic-property-merger');
const DynamicPropertyParser = require('../../src/io/readers/dynamic-property-parser');

describe('DynamicPropertyMerger', () => {
    // Define test renderer priorities (as would be provided by the latex renderer)
    const rendererPriorities = ['common', 'vector', 'latex'];
    
    test('should merge properties based on renderer priorities', () => {
        // Sample dynamic properties
        const dynamicProperties = [
            DynamicPropertyParser.parse('_common_label_string_font', 'Arial'),
            DynamicPropertyParser.parse('_vector_label_string_font', 'Helvetica'),
            DynamicPropertyParser.parse('_latex_label_string_font', 'Computer Modern'),
            DynamicPropertyParser.parse('_common_object_float_margin', 5),
            DynamicPropertyParser.parse('_latex__float_margin', 10), // No group
            DynamicPropertyParser.parse('___boolean_visible', true)  // No renderer or group
        ];
        
        // Merge the properties
        const mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        // Check that the correct properties were kept
        const fontProp = mergedProperties.find(p => p.name === 'font' && p.group === 'label');
        expect(fontProp).toBeTruthy();
        expect(fontProp.renderer).toBe('latex');
        expect(fontProp.value).toBe('Computer Modern');
        
        // Check property with no group
        const marginProp = mergedProperties.find(p => p.name === 'margin' && p.group === '');
        expect(marginProp).toBeTruthy();
        expect(marginProp.renderer).toBe('latex');
        expect(marginProp.value).toBe(10);
        
        // Check property with no renderer or group
        const visibleProp = mergedProperties.find(p => p.name === 'visible' && p.group === '');
        expect(visibleProp).toBeTruthy();
        expect(visibleProp.renderer).toBe('common');
        expect(visibleProp.value).toBe(true);
    });

    test('should treat common renderer and null renderer as equivalent', () => {
        // Create properties with matching names but different renderers
        let dynamicProperties = [
            DynamicPropertyParser.parse('_common__string_font', 'Arial'),     // Has common renderer, no group
            DynamicPropertyParser.parse('___string_font', 'Helvetica')        // No renderer, no group
        ];
        
        let mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        // Only one of them should exist since they should be treated the same
        expect(mergedProperties.length).toBe(1);
        expect(mergedProperties[0].value).toBe('Helvetica'); // The last one should win
        
        // Now test in reverse order
        dynamicProperties = [
            DynamicPropertyParser.parse('___string_font', 'Helvetica'),       // No renderer
            DynamicPropertyParser.parse('_common__string_font', 'Arial')      // Common renderer
        ];
        
        mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        // Again, only one property should be in the result
        expect(mergedProperties.length).toBe(1);
        expect(mergedProperties[0].value).toBe('Arial'); // The last one should win
        
        // Both should lose to a higher priority renderer
        dynamicProperties = [
            DynamicPropertyParser.parse('___string_font', 'Helvetica'),       // No renderer
            DynamicPropertyParser.parse('_common__string_font', 'Arial'),     // Common renderer
            DynamicPropertyParser.parse('_vector__string_font', 'Sans')       // Vector renderer (higher priority)
        ];
        
        mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        // Should have only kept the vector renderer version
        expect(mergedProperties.length).toBe(1);
        expect(mergedProperties[0].renderer).toBe('vector');
        expect(mergedProperties[0].value).toBe('Sans');
    });
    
    test('should process dynamic properties directly', () => {
        // Create a dynamic properties array
        const dynamicProperties = [
            DynamicPropertyParser.parse('_common_label_string_font', 'Arial'),
            DynamicPropertyParser.parse('_vector_label_string_font', 'Helvetica'),
            DynamicPropertyParser.parse('_latex_object_float_margin', 10)
        ];
        
        const mergedProperties = DynamicPropertyMerger.processDynamicProperties(dynamicProperties, rendererPriorities);
        
        expect(mergedProperties).toBeTruthy();
        expect(Array.isArray(mergedProperties)).toBe(true);
        
        // Check that properties are correctly merged
        const fontProp = mergedProperties.find(p => p.name === 'font' && p.group === 'label');
        expect(fontProp.value).toBe('Helvetica');
        
        const marginProp = mergedProperties.find(p => p.name === 'margin' && p.group === 'object');
        expect(marginProp.value).toBe(10);
    });
    
    test('should handle hierarchical group paths', () => {
        const dynamicProperties = [
            DynamicPropertyParser.parse('_latex_font.style_string_family', 'serif'),
            DynamicPropertyParser.parse('_latex_font.style_boolean_bold', true),
            DynamicPropertyParser.parse('_latex_font.style.weight_integer_thickness', 700)
        ];
        
        const mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        expect(mergedProperties.length).toBe(3);
        
        const familyProp = mergedProperties.find(p => p.name === 'family');
        expect(familyProp.group).toBe('font.style');
        
        const weightProp = mergedProperties.find(p => p.name === 'thickness');
        expect(weightProp.group).toBe('font.style.weight');
    });
    
    test('should convert merged properties to hierarchical structure', () => {
        const dynamicProperties = [
            DynamicPropertyParser.parse('_latex_font.style_string_family', 'serif'),
            DynamicPropertyParser.parse('_latex_font.style_boolean_bold', true),
            DynamicPropertyParser.parse('_latex_font.style.weight_integer_thickness', 700),
            DynamicPropertyParser.parse('_latex__float_margin', 10),
            DynamicPropertyParser.parse('___string_title', 'My Diagram')
        ];
        
        const mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        const hierarchy = DynamicPropertyMerger.toHierarchy(mergedProperties);
        
        // Check the hierarchy structure
        expect(hierarchy.font.style.family).toBe('serif');
        expect(hierarchy.font.style.bold).toBe(true);
        expect(hierarchy.font.style.weight.thickness).toBe(700);
        expect(hierarchy.margin).toBe(10);
        expect(hierarchy.title).toBe('My Diagram');
    });
    
    test('should handle empty or invalid input', () => {
        // Null input
        expect(DynamicPropertyMerger.processDynamicProperties(null, rendererPriorities)).toEqual([]);
        
        // Not an array
        expect(DynamicPropertyMerger.processDynamicProperties({}, rendererPriorities)).toEqual([]);
        
        // Empty array
        expect(DynamicPropertyMerger.processDynamicProperties([], rendererPriorities)).toEqual([]);
    });
    
    test('should process hierarchical properties with deepest children taking priority', () => {
        // Create properties with hierarchical names
        const dynamicProperties = [
            DynamicPropertyParser.parse('_string_latex__draw', 'solid'),
            DynamicPropertyParser.parse('_string_latex__draw.color', 'red'),
            DynamicPropertyParser.parse('_string_latex__draw.pattern', 'dashed'),
            DynamicPropertyParser.parse('_string_latex__draw.pattern.color', 'blue'),
            DynamicPropertyParser.parse('_float_latex__draw.width', 2),
            DynamicPropertyParser.parse('_float_latex__draw.pattern.width', 1)
        ];
        
        // Process the hierarchical properties
        const processedProperties = DynamicPropertyMerger.processHierarchicalProperties(dynamicProperties);
        
        // Should have 4 properties (draw.color, draw.pattern.color, draw.width, draw.pattern.width)
        // draw and draw.pattern are overridden by their children
        expect(processedProperties.length).toBe(4);
        
        // Check that the correct properties were kept
        const drawColorProp = processedProperties.find(p => p.name === 'draw.color');
        expect(drawColorProp).toBeTruthy();
        expect(drawColorProp.value).toBe('red');
        
        const drawPatternColorProp = processedProperties.find(p => p.name === 'draw.pattern.color');
        expect(drawPatternColorProp).toBeTruthy();
        expect(drawPatternColorProp.value).toBe('blue');
        
        const drawWidthProp = processedProperties.find(p => p.name === 'draw.width');
        expect(drawWidthProp).toBeTruthy();
        expect(drawWidthProp.value).toBe(2);
        
        const drawPatternWidthProp = processedProperties.find(p => p.name === 'draw.pattern.width');
        expect(drawPatternWidthProp).toBeTruthy();
        expect(drawPatternWidthProp.value).toBe(1);
        
        // Check that the parent properties were removed
        const drawProp = processedProperties.find(p => p.name === 'draw');
        expect(drawProp).toBeFalsy();
        
        const drawPatternProp = processedProperties.find(p => p.name === 'draw.pattern');
        expect(drawPatternProp).toBeFalsy();
    });
    
    test('should handle complex hierarchical properties', () => {
        // Create properties with complex hierarchical names
        const dynamicProperties = [
            DynamicPropertyParser.parse('_string_latex__draw', 'solid'),
            DynamicPropertyParser.parse('_string_latex__draw.color', 'red'),
            DynamicPropertyParser.parse('_string_latex__draw.pattern', 'dashed'),
            DynamicPropertyParser.parse('_string_latex__draw.pattern.color', 'blue'),
            DynamicPropertyParser.parse('_string_latex__draw.pattern.style', 'curved'),
            DynamicPropertyParser.parse('_string_latex__draw.pattern.style.line', 'double'),
            DynamicPropertyParser.parse('_string_latex__draw.pattern.style.line.width', 'thick'),
            DynamicPropertyParser.parse('_float_latex__draw.width', 2),
            DynamicPropertyParser.parse('_float_latex__draw.pattern.width', 1)
        ];
        
        // Process the hierarchical properties
        const processedProperties = DynamicPropertyMerger.processHierarchicalProperties(dynamicProperties);
        
        // Should have 6 properties (draw.color, draw.pattern.color, draw.pattern.style.line.width, draw.width, draw.pattern.width)
        // draw, draw.pattern, and draw.pattern.style.line are overridden by their children
        expect(processedProperties.length).toBe(6);
        
        // Check that the correct properties were kept
        const drawColorProp = processedProperties.find(p => p.name === 'draw.color');
        expect(drawColorProp).toBeTruthy();
        expect(drawColorProp.value).toBe('red');
        
        const drawPatternColorProp = processedProperties.find(p => p.name === 'draw.pattern.color');
        expect(drawPatternColorProp).toBeTruthy();
        expect(drawPatternColorProp.value).toBe('blue');
        
        const drawPatternStyleLineWidthProp = processedProperties.find(p => p.name === 'draw.pattern.style.line.width');
        expect(drawPatternStyleLineWidthProp).toBeTruthy();
        expect(drawPatternStyleLineWidthProp.value).toBe('thick');
        
        const drawWidthProp = processedProperties.find(p => p.name === 'draw.width');
        expect(drawWidthProp).toBeTruthy();
        expect(drawWidthProp.value).toBe(2);
        
        const drawPatternWidthProp = processedProperties.find(p => p.name === 'draw.pattern.width');
        expect(drawPatternWidthProp).toBeTruthy();
        expect(drawPatternWidthProp.value).toBe(1);
        
        // Check that the parent properties were removed
        const drawProp = processedProperties.find(p => p.name === 'draw');
        expect(drawProp).toBeFalsy();
        
        const drawPatternProp = processedProperties.find(p => p.name === 'draw.pattern');
        expect(drawPatternProp).toBeFalsy();
        
        const drawPatternStyleProp = processedProperties.find(p => p.name === 'draw.pattern.style');
        expect(drawPatternStyleProp).toBeFalsy();
        
        const drawPatternStyleLineProp = processedProperties.find(p => p.name === 'draw.pattern.style.line');
        expect(drawPatternStyleLineProp).toBeFalsy();
    });
    
    test('should maintain order for properties at the same depth', () => {
        // Create properties with the same depth but different names
        const dynamicProperties = [
            DynamicPropertyParser.parse('_string_latex__draw.color', 'red'),
            DynamicPropertyParser.parse('_string_latex__draw.pattern', 'dashed'),
            DynamicPropertyParser.parse('_string_latex__draw.width', 2)
        ];
        
        // Process the hierarchical properties
        const processedProperties = DynamicPropertyMerger.processHierarchicalProperties(dynamicProperties);
        
        // Should have 3 properties, all at the same depth
        expect(processedProperties.length).toBe(3);
        
        // Check that the properties are in the same order as the input
        expect(processedProperties[0].name).toBe('draw.color');
        expect(processedProperties[1].name).toBe('draw.pattern');
        expect(processedProperties[2].name).toBe('draw.width');
    });
});
