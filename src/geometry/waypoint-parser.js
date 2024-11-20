const { Point2D } = require('./basic-points');

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
 * @returns {Array<{point: Point2D, isControl: boolean}>} Array of calculated waypoints
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

        return {
            point,
            isControl: type.endsWith('c')
        };
    });
}

/**
 * Parse single waypoint part
 * @param {string} part - e.g., "s(1,1)" or "sc(1,1)" or "(2,2)"
 * @returns {{type: string, x: number, y: number}}
 */
function parseWaypointPart(part) {

        // Regex breakdown:
    // ^                   - Start of string
    // (s|sc|e|ec|a|ac|c)?- Optional waypoint type:
    //                         s  = start-relative point
    //                         sc = start-relative control point
    //                         e  = end-relative point
    //                         ec = end-relative control point
    //                         a  = absolute point
    //                         ac = absolute control point
    //                         c  = control point (same as ac)
    // \(                  - Opening parenthesis (escaped)
    // ([^,]+)            - First coordinate: one or more characters that aren't commas
    // ,                  - Literal comma separator
    // ([^)]+)           - Second coordinate: one or more characters that aren't closing parentheses
    // \)                 - Closing parenthesis (escaped)
    // $                  - End of string
    
    const regex = /^(s|sc|e|ec|a|ac|c)?\(([^,]+),([^)]+)\)$/;
    const match = part.match(regex);
    
    if (!match) {
        throw new Error(`Invalid waypoint format: ${part}`);
    }

    const [_, type, xStr, yStr] = match;
    return {
        type: type || '',  // empty string for no prefix
        x: parseFloat(xStr),
        y: parseFloat(yStr)
    };
}

module.exports = { parseWaypoints };