const { Point2D } = require('./basic-points');
const { createWaypoint } = require('./waypoint');

/**
 * Waypoint type codes:
 * s  = start-relative point
 * sc = start-relative control point
 * e  = end-relative point
 * ec = end-relative control point
 * a  = absolute point
 * ac = absolute control point
 * c  = control point (same as ac)
 * "" = absolute point (same as a)
 */

/**
 * Parses and calculates waypoint positions for an edge
 * @param {string} waypointStr - Waypoint string (e.g., "s(1,1) c(2,2) e(1,1)")
 * @param {Point2D} startPoint - Pre-calculated start connection point
 * @param {Point2D} endPoint - Pre-calculated end connection point
 * @returns {Array<Waypoint>} Array of calculated waypoints
 */

function parseWaypoints(waypointStr, startPoint, endPoint) {
    if (!waypointStr) return [];
    
    const parts = waypointStr.trim().split(/\s+/);
    return parts.map(part => {
        const { type, x, y } = parseWaypointPart(part);
        
        let point;
        switch(type) {
            case 's':   // start-relative point
            case 'sc':  // start-relative control point
                point = startPoint.add(new Point2D(x, y));
                break;
            case 'e':   // end-relative point
            case 'ec':  // end-relative control point
                point = endPoint.add(new Point2D(x, y));
                break;
            case 'a':   // absolute point
            case 'ac':  // absolute control point
            case 'c':   // control point (alias for ac)
            case '':    // absolute point (no prefix)
                point = new Point2D(x, y);
                break;
            default:
                throw new Error(`Unknown waypoint type: ${type}`);
        }


        const isControl = type.endsWith('c');
        return createWaypoint(
            point.x,
            point.y,
            isControl
        );
    });
}


function parseWaypointPart(part) {
    // Match pattern like "s(1,2)" or just "(1,2)"
    const match = part.match(/^([a-z]*)?\((-?\d*\.?\d+),(-?\d*\.?\d+)\)$/);
    if (!match) {
        throw new Error(`Invalid waypoint format: ${part}`);
    }
    
    return {
        type: match[1] || '', // If no type prefix, use empty string
        x: parseFloat(match[2]),
        y: parseFloat(match[3])
    };
}

module.exports = { parseWaypoints };
