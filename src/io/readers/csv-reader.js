const fs = require('fs');
const { parse } = require('csv-parse');

class CsvReader {
    static readFile(filePath) {
        return new Promise((resolve, reject) => {
            if (!filePath) {
                resolve([]);
                return;
            }

            const records = [];
            fs.createReadStream(filePath)
                .pipe(parse({
                    columns: true,
                    skip_empty_lines: true,
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
                }))
                .on('data', (record) => {
                    // Skip completely empty rows
                    const values = Object.values(record).map(val => val?.trim() || '');
                    const isEmptyRow = values.every(val => val === '');
                    if (!isEmptyRow) {
                        records.push(record);
                    }
                })
                .on('end', () => {
                    resolve(records);
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }
}

module.exports = CsvReader; 