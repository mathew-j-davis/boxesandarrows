const DynamicPropertyParser = require('../src/io/readers/dynamic-property-parser');

// Test cases for dynamic property parsing
const testCases = [
    // Full pattern with renderer and groupPath
    '_common:label_lab.lab:string:font_font_font.font_font',
    '_:label_lab.lab:string:font_font_font.font_font',
    '_common::string:font_font_font.font_font',
    '_::string:font_font_font.font_font',
    
    // With renderer but no groupPath
    '_latex::string:draw',
    '_renderer123::float:margin',
    
    // With no renderer or groupPath
    '_::boolean:visible',
    '_::string:title',
    
    // With complex renderer names
    '_renderer123:groupPath:string:property',
    '_latex2:groupPath:string:property',
    
    // With complex groupPath names
    '_renderer:groupPath.name.type:string:property',
    '_renderer:groupPath_123.name:string:property',
    
    // With complex property names
    '_renderer:groupPath:string:property.name_with_underscores',
    '_renderer:groupPath:string:property.name.with.dots.and_underscores',
    
    // With array indices in property names
    '_renderer:groupPath:string:items.0',
    '_renderer:groupPath:string:items.0.name',
    '_renderer:groupPath:string:items.0.1.2',
    
    // With array indices in groupPath
    '_renderer:items.0:string:property',
    '_renderer:items.0.1:string:property',
    '_renderer:group.items.0.name:string:property'
];

// Test invalid cases
const invalidTestCases = [
    // Missing leading underscore
    'common:label_lab.lab:string:font_font_font.font_font',
    
    // Invalid type (contains numbers)
    '_common:label_lab.lab:string123:font_font_font.font_font',
    
    // Missing required colons
    '_commonlabel_lab.labstringfont_font_font.font_font',
    
    // Invalid property name (starts with number)
    '_common:label_lab.lab:string:123font_font_font.font_font',
    
    // Invalid groupPath name (starts with number)
    '_common:123label_lab.lab:string:font_font_font.font_font',
    
    // Invalid renderer name (starts with number)
    '_123common:label_lab.lab:string:font_font_font.font_font'
];

console.log('Testing valid dynamic property patterns:');
testCases.forEach(testCase => {
    const isValid = DynamicPropertyParser.isDynamicProperty(testCase);
    console.log(`${testCase}: ${isValid ? 'Valid' : 'Invalid'}`);
    
    if (isValid) {
        const parsed = DynamicPropertyParser.parsePropertyDescription(testCase);
        console.log('Parsed result:');
        console.log(`  renderer: ${parsed.renderer}`);
        // console.log(`  groupPath: ${parsed.groupPath}`);
        // console.log(`  groupPathArray: ${JSON.stringify(parsed.groupPathArray)}`);
        // console.log(`  groupPathTypes: ${JSON.stringify(parsed.groupPathTypes)}`);
        // if (parsed.groupPathTypes && parsed.groupPathTypes.length > 0) {
        //     console.log(`  getGroupPathArrayWithIndices: ${JSON.stringify(parsed.getGroupPathArrayWithIndices())}`);
        // }
        console.log(`  dataType: ${parsed.dataType}`);
        console.log(`  namePath: ${parsed.namePath}`);
        console.log(`  namePathArray: ${JSON.stringify(parsed.namePathArray)}`);
        if (parsed.namePathTypes) {
            console.log(`  namePathTypes: ${JSON.stringify(parsed.namePathTypes)}`);
            console.log(`  getNamePathArrayWithIndices: ${JSON.stringify(parsed.getNamePathArrayWithIndices())}`);
        }
        console.log();
    }
});

console.log('Testing invalid dynamic property patterns:');
invalidTestCases.forEach(testCase => {
    const isValid = DynamicPropertyParser.isDynamicProperty(testCase);
    console.log(`${testCase}: ${isValid ? 'Valid' : 'Invalid'}`);
    
    if (isValid) {
        try {
            const parsed = DynamicPropertyParser.parsePropertyDescription(testCase);
            console.log('Parsed result:');
            console.log(`  renderer: ${parsed.renderer}`);
            // console.log(`  groupPath: ${parsed.groupPath}`);
            // console.log(`  groupPathArray: ${JSON.stringify(parsed.groupPathArray)}`);
            // console.log(`  groupPathTypes: ${JSON.stringify(parsed.groupPathTypes)}`);
            console.log(`  dataType: ${parsed.dataType}`);
            console.log(`  namePath: ${parsed.namePath}`);
            console.log(`  namePathArray: ${JSON.stringify(parsed.namePathArray)}`);
            console.log();
        } catch (error) {
            console.log(`  Error: ${error.message}`);
            console.log();
        }
    }
});

// Test value parsing
console.log('Testing value parsing:');
const valueTestCases = [
    { property: '_common:label:string:font', value: 'Arial', expectedType: 'string' },
    { property: '_common:label:string:font', value: 123, expectedType: 'string' },
    { property: '_common:label:float:size', value: '12.34', expectedType: 'float' },
    { property: '_common:label:float:size', value: 12.34, expectedType: 'float' },
    { property: '_common:label:float:size', value: 'invalid', expectedType: 'float' },
    { property: '_common:label:boolean:visible', value: 'true', expectedType: 'boolean' },
    { property: '_common:label:boolean:visible', value: 'false', expectedType: 'boolean' },
    { property: '_common:label:boolean:visible', value: true, expectedType: 'boolean' },
    { property: '_common:label:boolean:visible', value: 'invalid', expectedType: 'boolean' },
    { property: '_common:label:integer:count', value: '123', expectedType: 'integer' },
    { property: '_common:label:integer:count', value: 123, expectedType: 'integer' },
    { property: '_common:label:integer:count', value: '12.34', expectedType: 'integer' },
    { property: '_common:label:integer:count', value: 'invalid', expectedType: 'integer' },
    { property: '_latex::flag:draw', value: 'solid', expectedType: 'flag' },
    { property: '_latex::flag:draw', value: 'dashed', expectedType: 'flag' }
];

valueTestCases.forEach(testCase => {
    const property = DynamicPropertyParser.parsePropertyDescription(testCase.property);
    const parsedValue = DynamicPropertyParser.parseValue(property, testCase.value);
    console.log(`${testCase.property} with value ${testCase.value} (${testCase.expectedType}):`);
    console.log(`  Parsed value: ${parsedValue} (${typeof parsedValue})`);
    console.log();
});

// Test complete property parsing
console.log('Testing complete property parsing:');
const completeTestCases = [
    { property: '_common:label:string:font', value: 'Arial' },
    { property: '_latex:font.style:string:family', value: 'serif' },
    { property: '_latex::flag:draw', value: 'solid' },
    { property: '_common:groupPath:string:items.0.name', value: 'test' },
    { property: '_renderer:items.0.name:string:property', value: 'test' },
    { property: '_renderer:group.items.0.name:string:property.1', value: 'test' }
];

completeTestCases.forEach(testCase => {
    const property = DynamicPropertyParser.parse(testCase.property, testCase.value);
    console.log(`${testCase.property} with value ${testCase.value}:`);
    console.log(`  renderer: ${property.renderer}`);
    // console.log(`  groupPath: ${property.groupPath}`);
    // console.log(`  groupPathArray: ${JSON.stringify(property.groupPathArray)}`);
    // console.log(`  groupPathTypes: ${JSON.stringify(property.groupPathTypes)}`);
    if (property.groupPathTypes && property.groupPathTypes.length > 0) {
        console.log(`  getGroupPathArrayWithIndices: ${JSON.stringify(property.getGroupPathArrayWithIndices())}`);
    }
    console.log(`  dataType: ${property.dataType}`);
    console.log(`  isFlag: ${property.isFlag}`);
    console.log(`  namePath: ${property.namePath}`);
    console.log(`  namePathArray: ${JSON.stringify(property.namePathArray)}`);
    if (property.namePathTypes) {
        console.log(`  namePathTypes: ${JSON.stringify(property.namePathTypes)}`);
        console.log(`  getNamePathArrayWithIndices: ${JSON.stringify(property.getNamePathArrayWithIndices())}`);
    }
    console.log(`  value: ${property.value}`);
    console.log();
}); 