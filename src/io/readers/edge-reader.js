const { parse } = require('csv-parse/sync');
const fs = require('fs');
const { getNodeConnectionPoint } = require('../../geometry/node-connection-point');
const { parseWaypoints } = require('../../geometry/waypoint-parser');
const { Direction } = require('../../geometry/direction');


const PATH_TYPES = {
    LINE: '--',
    BAR_END: '-|',
    BAR_START: '|-',
    CURVE: '..'
};

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
     * Check if a direction value is valid
     * @param {string} direction - Direction to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    static isBasicDirection(direction) {
        if (!direction) return false;

        vector = Direction.getVector(direction, false, false);

        basic_direction_name = null;
        
        if (vector == null){
            basic_direction_name = direction;
        }
        
        return !!Direction.getVector(direction, false, false);
    }




    static shouldAutoSetDirection(direction){

        if (direction == '.' || direction == 'auto'){
            return true;
        }
        return false;
    }

    static setConnectionDirections (startNode, endNode, startDirection = null, endDirection = null) {

        let autoSetStartDirection = this.shouldAutoSetDirection(startDirection);
        let autoSetEndDirection = this.shouldAutoSetDirection(endDirection);

        if (!autoSetStartDirection && !autoSetEndDirection){
            return {
                startDirection: startDirection,
                endDirection: endDirection
            };
        }

        // Calculate the bounding boxes for both nodes
        const startBox = {
            left: startNode.x - startNode.width/2,
            right: startNode.x + startNode.width/2,
            top: startNode.y + startNode.height/2,
            bottom: startNode.y - startNode.height/2
        };
        
        const endBox = {
            left: endNode.x - endNode.width/2,
            right: endNode.x + endNode.width/2,
            top: endNode.y + endNode.height/2,
            bottom: endNode.y - endNode.height/2
        };


        // Neither direction is valid, use the full auto-detection logic
        // Check if bounding boxes don't overlap
        const noHorizontalOverlap = startBox.right < endBox.left || startBox.left > endBox.right;
        const noVerticalOverlap = startBox.top < endBox.bottom || startBox.bottom > endBox.top;
        
        // Default connection points
        let vertical = 0;
        let horizontal = 0;
        
        // If boxes don't overlap, use the bounding box logic
        if (noHorizontalOverlap || noVerticalOverlap) {

            if (endBox.left > startBox.right ){
                horizontal = 1;
            }
            else if (startBox.left > endBox.right){
                horizontal = -1;
            }

            if (endBox.bottom > startBox.top){
                vertical = 1;
            }
            else if ( endBox.top < startBox.bottom){
                vertical = -1;
            }
        }
        else
        {
            // Boxes overlap, fall back to center point logic
            horizontal = endNode.x - startNode.x;
            vertical = endNode.y - startNode.y;
        }

        function verticalName(d){
            if (d < 0){
                return 'south ';
            }
            if (d > 0){
                return 'north ';
            }
            return '';
        }
        
        function horizontalName(d){
            if (d < 0){
                return 'west';
            }
            if (d > 0){
                return 'east';
            }
            return '';
        }

        function directionName(dx, dy){
            if (dx == 0 && dy == 0){
                return 'center';
            }
            direction_name = (horizontalName(dx) + verticalName(dy)).trim();
            if (direction_name.length == 0){
                direction_name = 'center';
            }
            return direction_name;    
        }

        return {
            startDirection: autoSetStartDirection ? directionName(horizontal, vertical) : startDirection,
            endDirection:   autoSetEndDirection ? directionName(-horizontal, -vertical) : endDirection  
        }
    }


    // /**
    //  * Automatically determine connection points between two nodes
    //  * @param {Object} startNode - The node where the edge starts
    //  * @param {Object} endNode - The node where the edge ends
    //  * @param {string} startDirection - Optional existing start direction
    //  * @param {string} endDirection - Optional existing end direction
    //  * @returns {Object} - Object with start and end connection points
    //  */
    // static autoSetConnectionDirections(startNode, endNode, setStart, setEnd, startDirection = null, endDirection = null) {
        
    //     if (!setStart && !setEnd){
    //         return {startDirection, endDirection};
    //     }
        



    //     // // First validate that the directions are valid
    //     // const validStartDirection = this.isValidDirection(startDirection) ? startDirection : null;
    //     // const validEndDirection = this.isValidDirection(endDirection) ? endDirection : null;
        
    //     // // If both valid directions are specified, return them
    //     // if (validStartDirection && validEndDirection) {
    //     //     return { validStartDirection: validStartDirection, validEndDirection: validEndDirection };
    //     // }
        
    //     // Calculate the bounding boxes for both nodes
    //     const startBox = {
    //         left: startNode.x - startNode.width/2,
    //         right: startNode.x + startNode.width/2,
    //         top: startNode.y + startNode.height/2,
    //         bottom: startNode.y - startNode.height/2
    //     };
        
    //     const endBox = {
    //         left: endNode.x - endNode.width/2,
    //         right: endNode.x + endNode.width/2,
    //         top: endNode.y + endNode.height/2,
    //         bottom: endNode.y - endNode.height/2
    //     };
        
    //     // // If one direction is specified, determine the complementary one
    //     // if (validStartDirection && !validEndDirection) {
    //     //     // Start direction is specified, find best matching end direction
    //     //     endDirection = this.getComplementaryPoint(validStartDirection, startNode, endNode);
    //     //     return { validStartDirection: validStartDirection, validEndDirection: endDirection };
    //     // }
        
    //     // if (!validStartDirection && validEndDirection) {
    //     //     // End direction is specified, find best matching start direction
    //     //     startDirection = this.getComplementaryPoint(validEndDirection, endNode, startNode, true);
    //     //     return { validStartDirection: startDirection, validEndDirection: validEndDirection };
    //     // }
        
    //     // Neither direction is valid, use the full auto-detection logic
    //     // Check if bounding boxes don't overlap
    //     const noHorizontalOverlap = startBox.right < endBox.left || startBox.left > endBox.right;
    //     const noVerticalOverlap = startBox.top < endBox.bottom || startBox.bottom > endBox.top;
        
    //     // Default connection points
    //     let vertical = 0;
    //     let horizontal = 0;
        
    //     // If boxes don't overlap, use the bounding box logic
    //     if (noHorizontalOverlap || noVerticalOverlap) {

    //         if (endBox.left > startBox.right ){
    //             horizontal = 1;
    //         }
    //         else if (startBox.left > endBox.right){
    //             horizontal = -1;
    //         }

    //         if (endBox.bottom > startBox.top){
    //             vertical = 1;
    //         }
    //         else if ( endBox.top < startBox.bottom){
    //             vertical = -1;
    //         }
    //     }
    //     else
    //     {
    //         // Boxes overlap, fall back to center point logic
    //         horizontal = endNode.x - startNode.x;
    //         vertical = endNode.y - startNode.y;
    //     }


        
    //     function verticalName(d){
    //         if (d < 0){
    //             return 'south ';
    //         }
    //         if (d > 0){
    //             return 'north ';
    //         }
    //         return '';
    //     }
        
    //     function horizontalName(d){
    //         if (d < 0){
    //             return 'west';
    //         }
    //         if (d > 0){
    //             return 'east';
    //         }
    //         return '';
    //     }

    //     direction_name = 'center';

    //     if (horizontal != 0 || vertical != 0){
    //         direction_name = (horizontalName(horizontal) + verticalName(vertical)).trim();

    //         if (direction_name.length == 0){
    //             direction_name = 'center';
    //         }
    //     }


    //         // Horizontal position relationship
    //         const startIsLeft = startBox.right < endBox.left;
    //         const startIsRight = startBox.left > endBox.right;
            
    //         // Vertical position relationship
    //         const startIsAbove = startBox.bottom > endBox.top;
    //         const startIsBelow = startBox.top < endBox.bottom;
            
    //         // Determine connection points based on relative positions
    //         if (startIsLeft && startIsAbove) {
    //             autoStartDirection = 'south east';
    //             autoEndDirection = 'north west';
    //         } else if (startIsLeft && startIsBelow) {
    //             autoStartDirection = 'north east';
    //             autoEndDirection = 'south west';
    //         } else if (startIsRight && startIsAbove) {
    //             autoStartDirection = 'north west';
    //             autoEndDirection = 'south east';
    //         } else if (startIsRight && startIsBelow) {
    //             autoStartDirection = 'north west';
    //             autoEndDirection = 'south east';
    //         } else if (startIsLeft) {
    //             autoStartDirection = 'east';
    //             autoEndDirection = 'west';
    //         } else if (startIsRight) {
    //             autoStartDirection = 'west';
    //             autoEndDirection = 'east';
    //         } else if (startIsAbove) {
    //             autoStartDirection = 'north';
    //             autoEndDirection = 'north';
    //         } else if (startIsBelow) {
    //             autoStartDirection = 'north';
    //             autoEndDirection = 'south';
    //         }
    //     } else {
    //         // Boxes overlap, fall back to center point logic
    //         const dx = endNode.x - startNode.x;
    //         const dy = endNode.y - startNode.y;
            
    //         // Determine dominant direction
    //         if (Math.abs(dx) > Math.abs(dy)) {
    //             // Horizontal dominance
    //             if (dx > 0) {
    //                 autoStartDirection = 'east';
    //                 autoEndDirection = 'west';
    //             } else {
    //                 autoStartDirection = 'west';
    //                 autoEndDirection = 'east';
    //             }
    //         } else {
    //             // Vertical dominance
    //             if (dy > 0) {
    //                 autoStartDirection = 'north';
    //                 autoEndDirection = 'south';
    //             } else {
    //                 autoStartDirection = 'south';
    //                 autoEndDirection = 'north';
    //             }
    //         }
    //     }
        
    //     return { validStartDirection: autoStartDirection, validEndDirection: autoEndDirection };
    // }

    // /**
    //  * Automatically determine connection points between two nodes
    //  * @param {Object} startNode - The node where the edge starts
    //  * @param {Object} endNode - The node where the edge ends
    //  * @param {string} startDirection - Optional existing start direction
    //  * @param {string} endDirection - Optional existing end direction
    //  * @returns {Object} - Object with start and end connection points
    //  */
    // static getAutoConnectionPoints(startNode, endNode, startDirection = null, endDirection = null) {
    //     // First validate that the directions are valid
    //     const validStartDirection = this.isValidDirection(startDirection) ? startDirection : null;
    //     const validEndDirection = this.isValidDirection(endDirection) ? endDirection : null;
        
    //     // If both valid directions are specified, return them
    //     if (validStartDirection && validEndDirection) {
    //         return { validStartDirection: validStartDirection, validEndDirection: validEndDirection };
    //     }
        
    //     // Calculate the bounding boxes for both nodes
    //     const startBox = {
    //         left: startNode.x - startNode.width/2,
    //         right: startNode.x + startNode.width/2,
    //         top: startNode.y + startNode.height/2,
    //         bottom: startNode.y - startNode.height/2
    //     };
        
    //     const endBox = {
    //         left: endNode.x - endNode.width/2,
    //         right: endNode.x + endNode.width/2,
    //         top: endNode.y + endNode.height/2,
    //         bottom: endNode.y - endNode.height/2
    //     };
        
    //     // If one direction is specified, determine the complementary one
    //     if (validStartDirection && !validEndDirection) {
    //         // Start direction is specified, find best matching end direction
    //         endDirection = this.getComplementaryPoint(validStartDirection, startNode, endNode);
    //         return { validStartDirection: validStartDirection, validEndDirection: endDirection };
    //     }
        
    //     if (!validStartDirection && validEndDirection) {
    //         // End direction is specified, find best matching start direction
    //         startDirection = this.getComplementaryPoint(validEndDirection, endNode, startNode, true);
    //         return { validStartDirection: startDirection, validEndDirection: validEndDirection };
    //     }
        
    //     // Neither direction is valid, use the full auto-detection logic
    //     // Check if bounding boxes don't overlap
    //     const noHorizontalOverlap = startBox.right < endBox.left || startBox.left > endBox.right;
    //     const noVerticalOverlap = startBox.top < endBox.bottom || startBox.bottom > endBox.top;
        
    //     // Default connection points
    //     let autoStartDirection = 'center';
    //     let autoEndDirection = 'center';
        
    //     // If boxes don't overlap, use the bounding box logic
    //     if (noHorizontalOverlap || noVerticalOverlap) {
    //         // Horizontal position relationship
    //         const startIsLeft = startBox.right < endBox.left;
    //         const startIsRight = startBox.left > endBox.right;
            
    //         // Vertical position relationship
    //         const startIsAbove = startBox.bottom > endBox.top;
    //         const startIsBelow = startBox.top < endBox.bottom;
            
    //         // Determine connection points based on relative positions
    //         if (startIsLeft && startIsAbove) {
    //             autoStartDirection = 'south east';
    //             autoEndDirection = 'north west';
    //         } else if (startIsLeft && startIsBelow) {
    //             autoStartDirection = 'north east';
    //             autoEndDirection = 'south west';
    //         } else if (startIsRight && startIsAbove) {
    //             autoStartDirection = 'north west';
    //             autoEndDirection = 'south east';
    //         } else if (startIsRight && startIsBelow) {
    //             autoStartDirection = 'north west';
    //             autoEndDirection = 'south east';
    //         } else if (startIsLeft) {
    //             autoStartDirection = 'east';
    //             autoEndDirection = 'west';
    //         } else if (startIsRight) {
    //             autoStartDirection = 'west';
    //             autoEndDirection = 'east';
    //         } else if (startIsAbove) {
    //             autoStartDirection = 'north';
    //             autoEndDirection = 'north';
    //         } else if (startIsBelow) {
    //             autoStartDirection = 'north';
    //             autoEndDirection = 'south';
    //         }
    //     } else {
    //         // Boxes overlap, fall back to center point logic
    //         const dx = endNode.x - startNode.x;
    //         const dy = endNode.y - startNode.y;
            
    //         // Determine dominant direction
    //         if (Math.abs(dx) > Math.abs(dy)) {
    //             // Horizontal dominance
    //             if (dx > 0) {
    //                 autoStartDirection = 'east';
    //                 autoEndDirection = 'west';
    //             } else {
    //                 autoStartDirection = 'west';
    //                 autoEndDirection = 'east';
    //             }
    //         } else {
    //             // Vertical dominance
    //             if (dy > 0) {
    //                 autoStartDirection = 'north';
    //                 autoEndDirection = 'south';
    //             } else {
    //                 autoStartDirection = 'south';
    //                 autoEndDirection = 'north';
    //             }
    //         }
    //     }
        
    //     return { validStartDirection: autoStartDirection, validEndDirection: autoEndDirection };
    // }

    // /**
    //  * Get the complementary connection point based on a specified point and relative node positions
    //  * @param {string} specifiedPoint - The connection point already specified
    //  * @param {Object} specifiedNode - The node with the specified connection point
    //  * @param {Object} otherNode - The node that needs a connection point
    //  * @param {boolean} isReversed - True if we're finding startPoint from endPoint
    //  * @returns {string} - The complementary connection point
    //  */
    // static getComplementaryPoint(specifiedPoint, specifiedNode, otherNode, isReversed = false) {
    //     // First check if we can get a direct vector opposite
    //     if (this.isValidDirection(specifiedPoint)) {
    //         const opposite = Direction.getOppositeDirection(specifiedPoint);
    //         if (opposite) return opposite;
    //     }

    //     // CLEAN THIS UP, overlapping logic, good idea in both approaches
        
        
    //     // If we couldn't get an opposite through vector inversion, 
    //     // or if the direction wasn't valid, calculate based on node positions
    //     const specifiedVector = Direction.getVector(specifiedPoint, false, false);
    //     if (!specifiedVector) return 'center'; // fallback if direction is invalid
        
    //     // Calculate connection point on specified node
    //     const connectionX = specifiedNode.x + specifiedVector.x * (specifiedNode.width / 2);
    //     const connectionY = specifiedNode.y + specifiedVector.y * (specifiedNode.height / 2);
        
    //     // Get the direction from connection point to other node's center
    //     const dx = otherNode.x - connectionX;
    //     const dy = otherNode.y - connectionY;
        
    //     // Determine the predominant direction
    //     let otherPoint;
    //     if (Math.abs(dx) > Math.abs(dy)) {
    //         // Horizontal predominance
    //         otherPoint = dx > 0 ? 'w' : 'e';
    //     } else {
    //         // Vertical predominance
    //         otherPoint = dy > 0 ? 's' : 'n';
    //     }
        
    //     return otherPoint;
    // }

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

                // // Handle simple edge defaults for arrow styles

                // if (record.type === 's') {

                //     // Validate that we're using one of the supported r-type edge types
                //     const validEdgePathType = ['--', '-|', '|-', '..'];

                //     if (!validEdgePathType.includes(record.path_style)) {
                //         console.warn(`Invalid edge path type: ${record.edgePathType}. Using default '--'.`);
                //         record.edgePathType = '--';
                //     }
 
                // }

                // // Calculate auto connection points if needed
                // const { validStartDirection, validEndDirection } = this.getAutoConnectionPoints(
                //     fromNode, toNode, record.start_direction, record.end_direction
                // );
                
 
                const { startDirection, endDirection } = this.setConnectionDirections(
                    fromNode, toNode, record.start_direction, record.end_direction
                );

                // Get edge type, defaulting to 's' for simple if not specified
                const edgeType = record.type || 's';
   

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

                // Determine if we should use adjusted points based on whether there are actual adjustments
                const startAdjusted = Math.abs(startAdjust.x) > 0 || Math.abs(startAdjust.y) > 0;
                const endAdjusted = Math.abs(endAdjust.x) > 0 || Math.abs(endAdjust.y) > 0;

                // Use the validated directions from the auto connection points calculation
                let startPoint = getNodeConnectionPoint(
                    fromNode,
                    scale,
                    startDirection,
                    startAdjust,
                    renderer
                );

                let endPoint = getNodeConnectionPoint(
                    toNode,
                    scale,
                    endDirection,
                    endAdjust,
                    renderer
                );

                // Process waypoints for 'c' type edges only, ignore for 'r' type
                const waypoints = (record.waypoints) ? 
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
                    // Store the node references for the renderer
                    from: fromNode,
                    to: toNode,
                    
                    // Keep original node names for reference
                    from_name: record.from.replace(/\W/g, '_'),
                    to_name: record.to.replace(/\W/g, '_'),
                    
                    // Store the connection directions
                    start_direction: startDirection,
                    end_direction: endDirection,
                    
                    // Parse start and end points
                    start: startPoint,
                    end: endPoint,
                    waypoints: waypoints,
                    

                    path_type: record.path_type || PATH_TYPES.LINE,
                    
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




