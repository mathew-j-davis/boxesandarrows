const DynamicPropertyMerger = require('../src/io/readers/dynamic-property-merger');
const DynamicPropertyParser = require('../src/io/readers/dynamic-property-parser');

// Define test renderer priorities
const rendererPriorities = ['common', 'vector', 'latex'];

// Sample dynamic properties
const dynamicProperties = [
    DynamicPropertyParser.parse('_string_common_label_font', 'Arial'),
    DynamicPropertyParser.parse('_string_vector_label_font', 'Helvetica'),
    DynamicPropertyParser.parse('_string_latex_label_font', 'Computer Modern'),
    DynamicPropertyParser.parse('_float_common_object_margin', 5),
    DynamicPropertyParser.parse('_float_latex__margin', 10), // No group
    DynamicPropertyParser.parse('_boolean___visible', true)  // No renderer or group
];

console.log('Parsed Dynamic Properties:');
dynamicProperties.forEach((prop, index) => {
    console.log(`[${index}]`, JSON.stringify(prop, null, 2));
});

// Merge the properties
const mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);

console.log('\nMerged Properties:');
mergedProperties.forEach((prop, index) => {
    console.log(`[${index}]`, JSON.stringify(prop, null, 2));
});

// Check that the correct properties were kept
const fontProp = mergedProperties.find(p => p.name === 'font' && p.group === 'label');
console.log('\nFont Property:', fontProp);

// Check property with no group
const marginProp = mergedProperties.find(p => p.name === 'margin' && p.group === 'default');
console.log('Margin Property:', marginProp);

// Check property with no renderer or group
const visibleProp = mergedProperties.find(p => p.name === 'visible' && p.group === 'default');
console.log('Visible Property:', visibleProp);
