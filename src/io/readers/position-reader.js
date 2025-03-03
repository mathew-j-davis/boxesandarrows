const fs = require('fs');
const { parse } = require('csv-parse');

class PositionReader {
    // Add a static property for the delimiter
    // Use semicolon (;) to separate multiple node names in a cell
    // Example: "node1;node2;node3" in a position cell will place all three nodes at that position
    static nodeNameDelimiter = ';';

    static readFromCsv(positionFile) {
        return new Promise((resolve, reject) => {
            const positions = new Map();
            let xLabels = [];
            let isFirstRow = true;

            fs.createReadStream(positionFile)
                .pipe(parse({
                    // Don't interpret first row as column names since we need them as coordinates
                    columns: false,
                    skip_empty_lines: true,
                    trim: true
                }))
                .on('data', (row) => {
                    if (isFirstRow) {
                        // Process header row to get X coordinates
                        // First column is typically 'r' (row label), rest are x positions
                        xLabels = row.slice(1).map(x => x.trim());
                        isFirstRow = false;
                        return;
                    }

                    if (row.length < 2) return; // Skip if not enough columns

                    // First column is Y coordinate
                    const yLabel = row[0].trim();
                    const yUnscaled = parseFloat(yLabel);

                    // Process each cell in the row
                    for (let j = 1; j < row.length; j++) {
                        const cellValue = row[j] ? row[j].trim() : '';
                        if (cellValue) {
                            const xLabel = xLabels[j - 1];
                            const xUnscaled = parseFloat(xLabel);

                            // Check for valid numerical positions
                            if (!isNaN(xUnscaled) && !isNaN(yUnscaled)) {
                                // Split cell value by delimiter and process each node name
                                const nodeNames = cellValue.split(this.nodeNameDelimiter);
                                
                                // Set position for each non-empty node name
                                for (const nodeName of nodeNames) {
                                    const trimmedName = nodeName.trim();
                                    if (trimmedName) {  // Only process non-empty node names
                                        positions.set(trimmedName, {
                                            xUnscaled,
                                            yUnscaled
                                        });
                                    }
                                }
                            } else {
                                console.warn(`Invalid position for node(s) '${cellValue}': x='${xLabel}', y='${yLabel}'`);
                            }
                        }
                    }
                })
                .on('end', () => {
                    resolve(positions);
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }
}

module.exports = PositionReader; 