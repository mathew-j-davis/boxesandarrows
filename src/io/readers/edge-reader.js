const { parse } = require('csv-parse/sync');
const fs = require('fs');
const { NodeDirection } = require('../../geometry/node-direction');
const { parseWaypoints } = require('../../geometry/waypoint-parser');

class EdgeReader {
    /**
     * Read edges from CSV file
     * @param {string} filePath - Path to edge CSV file
     * @returns {Array} Array of edge objects
     */
    static readFromCsv(filePath) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });

        return records.map(record => {
            // Skip empty rows
            const values = Object.values(record).map(val => val?.trim() || '');
            if (values.every(val => val === '')) {
                return null;
            }

            try {
                return {
                    // Parse start point with three parameters
                    start: NodeDirection.fromComponents(
                        record.from,
                        record.from_direction,
                        record.from_offset
                    ),
                    // Parse end point with three parameters
                    end: NodeDirection.fromComponents(
                        record.to,
                        record.to_direction,
                        record.to_offset
                    ),
                    
                    
                    waypoints: record.waypoints ? parseWaypoints(record.waypoints, startPoint, endPoint) : [],
                    label: record.label || '',
                    style: record.style || '',
                    color: record.color,
                    type: record.type || '',
                    label_justify: record.label_justify,
                    isHtml: record.isHtml === 'true'
                };
            } catch (error) {
                console.error(`Error processing row: ${JSON.stringify(record)}`);
                throw error;
            }
        }).filter(edge => edge !== null);
    }
}

module.exports = EdgeReader; 