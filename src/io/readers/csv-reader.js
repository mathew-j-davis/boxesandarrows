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
                    trim: true
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