const DynamicPropertyParser = require('../src/io/readers/dynamic-property-parser');

// Test the parser with different patterns
console.log('Testing Parser with new format:');

// Full pattern test
const fullPattern = '_latex_tikz_float_rotation';
console.log(`\nParsing: ${fullPattern}`);
console.log(DynamicPropertyParser.isDynamicProperty(fullPattern));
console.log(JSON.stringify(DynamicPropertyParser.parse(fullPattern, '90.5'), null, 2));

// No group pattern test
const noGroupPattern = '_latex__string_title';
console.log(`\nParsing: ${noGroupPattern}`);
console.log(DynamicPropertyParser.isDynamicProperty(noGroupPattern));
console.log(JSON.stringify(DynamicPropertyParser.parse(noGroupPattern, 'Hello'), null, 2));

// No renderer pattern test
const noRendererPattern = '__tikz_float_rotation';
console.log(`\nParsing: ${noRendererPattern}`);
console.log(DynamicPropertyParser.isDynamicProperty(noRendererPattern));
console.log(JSON.stringify(DynamicPropertyParser.parse(noRendererPattern, '90'), null, 2));

// No renderer or group pattern test
const noRendererOrGroupPattern = '___float_rotation';
console.log(`\nParsing: ${noRendererOrGroupPattern}`);
console.log(DynamicPropertyParser.isDynamicProperty(noRendererOrGroupPattern));
console.log(JSON.stringify(DynamicPropertyParser.parse(noRendererOrGroupPattern, '90'), null, 2));

// Hierarchical group test
const hierarchicalGroupPattern = '_latex_tikz.font.style_string_family';
console.log(`\nParsing: ${hierarchicalGroupPattern}`);
console.log(DynamicPropertyParser.isDynamicProperty(hierarchicalGroupPattern));
console.log(JSON.stringify(DynamicPropertyParser.parse(hierarchicalGroupPattern, 'serif'), null, 2));
