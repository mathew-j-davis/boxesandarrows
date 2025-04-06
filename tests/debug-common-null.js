const DynamicPropertyMerger = require('../src/io/readers/dynamic-property-merger');
const DynamicPropertyParser = require('../src/io/readers/dynamic-property-parser');

// Define test renderer priorities
const rendererPriorities = ['common', 'vector', 'latex'];

console.log('Test 1: null renderer after common renderer');
const dynamicProperties1 = [
    DynamicPropertyParser.parse('_string_common_label_font', 'Arial'),
    DynamicPropertyParser.parse('_string___label_font', 'Helvetica') // No renderer specified
];

console.log('Parsed Properties:');
dynamicProperties1.forEach((prop, i) => console.log(`[${i}]`, JSON.stringify(prop, null, 2)));

const mergedProperties1 = DynamicPropertyMerger.mergeProperties(dynamicProperties1, rendererPriorities);
console.log('\nMerged Properties:');
mergedProperties1.forEach((prop, i) => console.log(`[${i}]`, JSON.stringify(prop, null, 2)));

const fontProp1 = mergedProperties1.find(p => p.name === 'font' && p.group === 'label');
console.log('\nFont Property (should be Helvetica):', fontProp1 ? fontProp1.value : 'NOT FOUND');

console.log('\n----------------------------------------\n');

console.log('Test 2: common renderer after null renderer');
const dynamicProperties2 = [
    DynamicPropertyParser.parse('_string___label_font', 'Helvetica'), // No renderer specified
    DynamicPropertyParser.parse('_string_common_label_font', 'Arial')
];

console.log('Parsed Properties:');
dynamicProperties2.forEach((prop, i) => console.log(`[${i}]`, JSON.stringify(prop, null, 2)));

const mergedProperties2 = DynamicPropertyMerger.mergeProperties(dynamicProperties2, rendererPriorities);
console.log('\nMerged Properties:');
mergedProperties2.forEach((prop, i) => console.log(`[${i}]`, JSON.stringify(prop, null, 2)));

const fontProp2 = mergedProperties2.find(p => p.name === 'font' && p.group === 'label');
console.log('\nFont Property (should be Arial):', fontProp2 ? fontProp2.value : 'NOT FOUND');

console.log('\n----------------------------------------\n');

console.log('Test 3: Both should lose to a higher priority renderer');
const dynamicProperties3 = [
    DynamicPropertyParser.parse('_string___label_font', 'Helvetica'), // No renderer specified 
    DynamicPropertyParser.parse('_string_common_label_font', 'Arial'),
    DynamicPropertyParser.parse('_string_vector_label_font', 'Sans')
];

console.log('Parsed Properties:');
dynamicProperties3.forEach((prop, i) => console.log(`[${i}]`, JSON.stringify(prop, null, 2)));

const mergedProperties3 = DynamicPropertyMerger.mergeProperties(dynamicProperties3, rendererPriorities);
console.log('\nMerged Properties:');
mergedProperties3.forEach((prop, i) => console.log(`[${i}]`, JSON.stringify(prop, null, 2)));

const fontProp3 = mergedProperties3.find(p => p.name === 'font' && p.group === 'label');
console.log('\nFont Property (should be Sans):', fontProp3 ? fontProp3.value : 'NOT FOUND');
