const { parse } = require('csv-parse/sync');
const fs = require('fs');
const { getNodeConnectionPoint } = require('../../geometry/node-connection-point');
const { parseWaypoints } = require('../../geometry/waypoint-parser');

class EdgeReader {

    static scalePoint(point, scale) {
        return {
            x: point.x * scale.position.x,
            y: point.y * scale.position.y
        };
    }

    /**
     * Read edges from CSV file
     * @param {string} filePath - Path to edge CSV file
     * @param {Map} nodesMap - Map of nodes
     * @returns {Array} Array of edge objects
     */
    static readFromCsv(filePath, nodesMap, scale) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });

        return records.map(
            record => {

            // Skip empty rows
            const values = Object.values(record).map(val => val?.trim() || '');
            if (values.every(val => val === '')) {
                return null;
            }

            try {
                const fromNode = nodesMap.get(record.from);
                const toNode = nodesMap.get(record.to);

                if (!fromNode || !toNode) {
                    console.error(`Edge references missing node: from='${record.from}' to='${record.to}'`);
                    return null;
                }

                // Handle start adjustments, defaulting to 0 if fields don't exist
                const startAdjust = {
                    x: (record.hasOwnProperty('start_adjust_x') ? parseFloat(record.start_adjust_x) : 0) * scale.position.x,
                    y: (record.hasOwnProperty('start_adjust_y') ? parseFloat(record.start_adjust_y) : 0) * scale.position.y
                };

                // Handle end adjustments, defaulting to 0 if fields don't exist
                const endAdjust = {
                    x: (record.hasOwnProperty('end_adjust_x') ? parseFloat(record.end_adjust_x) : 0) * scale.position.x,
                    y: (record.hasOwnProperty('end_adjust_y') ? parseFloat(record.end_adjust_y) : 0) * scale.position.y
                };

                let startPoint = getNodeConnectionPoint(
                    fromNode,
                    record.start_direction,
                    startAdjust
                );

                let endPoint = getNodeConnectionPoint(
                    toNode,
                    record.end_direction,
                    endAdjust
                );

                 // Scale the points
                //startPoint = this.scalePoint(startPoint, scale);
                //endPoint = this.scalePoint(endPoint, scale);

                const waypoints = record.waypoints ? 
                parseWaypoints(
                    record.waypoints, 
                    record.start, 
                    record.end
                )
                .map(wp => this.scalePoint(wp, scale)) : 
                [];

                return {
                    // Parse start point with three parameters
                    from_name: record.from,
                    to_name: record.to,
                    start: startPoint,
                    end: endPoint,
                    waypoints: waypoints,
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




