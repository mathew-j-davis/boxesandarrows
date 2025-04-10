const { parse } = require('csv-parse/sync');

const testData = `value,NULL,'NULL',"NULL"
other,null,'null',"null"`;

const options = {
    columns: false,
    trim: true,
    cast: (value, context) => {
        // If the field was quoted, return as-is
        if (context.quoting) {
            return value;
        }
        // For unquoted fields, convert NULL/null to null
        if (value.toLowerCase() === 'null') {
            return null;
        }
        return value;
    }
};

const result = parse(testData, options);
console.log('Parsed results:');
console.log(result);
console.log('\nDetailed inspection:');
result.forEach(row => {
    row.forEach((value, i) => {
        console.log(`${i}: ${value === null ? 'null' : `"${value}"`} (type: ${typeof value})`);
    });
    console.log('---');
}); 