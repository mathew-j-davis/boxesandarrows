const fs = require('fs');
const { parse } = require('csv-parse/sync');

class CsvReader {
    static readFile(filePath) {
        if (!filePath) return [];
        
        const content = fs.readFileSync(filePath).toString();
        return parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
    }
}

module.exports = CsvReader; 