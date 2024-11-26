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

    static scaleWaypoint(waypoint, scale) {
        return {
            x: waypoint.x * scale.position.x,
            y: waypoint.y * scale.position.y,
            isControl: waypoint.isControl
        };
    }

    /**
     * Read edges from CSV file
     * @param {string} filePath - Path to edge CSV file
     * @param {Map} nodesMap - Map of nodes
     * @returns {Array} Array of edge objects
     */
    static readFromCsv(filePath, nodesMap, scale, renderer) {
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

                // unscaled
                // Handle start adjustments, defaulting to 0 if fields don't exist
                const startAdjust = {
                    x: (record.hasOwnProperty('start_adjust_x') ? parseFloat(record.start_adjust_x) : 0),
                    y: (record.hasOwnProperty('start_adjust_y') ? parseFloat(record.start_adjust_y) : 0)
                };

                // Handle end adjustments, defaulting to 0 if fields don't exist
                const endAdjust = {
                    x: (record.hasOwnProperty('end_adjust_x') ? parseFloat(record.end_adjust_x) : 0),
                    y: (record.hasOwnProperty('end_adjust_y') ? parseFloat(record.end_adjust_y) : 0)
                };

                let startPoint = getNodeConnectionPoint(
                    fromNode,
                    scale,
                    record.start_direction,
                    startAdjust,
                    renderer
                );

                let endPoint = getNodeConnectionPoint(
                    toNode,
                    scale,
                    record.end_direction,
                    endAdjust,
                    renderer
                );

                const waypoints = record.waypoints ? 
                parseWaypoints(
                    record.waypoints, 
                    startPoint,
                    endPoint
                )
                .map(wp => this.scaleWaypoint(wp, scale)) : 
                [];

                
                //Scale the points
                startPoint = this.scalePoint(startPoint, scale);
                endPoint = this.scalePoint(endPoint, scale);


                return {
                    // Parse start point with three parameters
                    from_name: record.from,
                    to_name: record.to,
                    start:  startPoint,
                    end: endPoint,  
                    waypoints: waypoints, 
                            
                    // Start label properties
                    start_label: record.start_label || '',
                    start_label_segment: record.start_label_segment || undefined,
                    start_label_position: record.start_label_position || undefined,

                    // End label properties
                    end_label: record.end_label || '',
                    end_label_segment: record.end_label_segment || undefined,
                    end_label_position: record.end_label_position || undefined,

                    start_arrow: record.start_arrow || '',
                    end_arrow: record.end_arrow || '',
                    
                    // Main label properties
                    label: record.label || '',
                    label_segment: record.label_segment || undefined,
                    label_position: record.label_position || undefined,

                    style: record.style,
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




