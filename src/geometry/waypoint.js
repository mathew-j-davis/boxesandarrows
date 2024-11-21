/**
 * Represents a waypoint in an edge path
 * @typedef {Object} Waypoint
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {boolean} isControl - Whether this is a control point for curves
 */

/**
 * Creates a new waypoint
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {boolean} isControl - Whether this is a control point
 * @returns {Waypoint}
 */
function createWaypoint(x, y, isControl = false) {
    return { x, y, isControl };
}

module.exports = {
    createWaypoint
};








// const { Point2D } = require('./basic-points');

// /**
//  * Represents a waypoint in an edge path with various reference types
//  * Can be absolute coordinates or relative to start/end points
//  */
// class Waypoint {
//     /**
//      * @param {string} type - Waypoint type ('s', 'sc', '', 'c', 'ec', 'e')
//      * @param {number} x - X coordinate
//      * @param {number} y - Y coordinate
//      */
//     constructor(type, x, y) {
//         this.type = type;  // Type of waypoint
//         this.x = x;        // X coordinate
//         this.y = y;        // Y coordinate
//     }

//     /**
//      * Parse a sequence of waypoint definitions
//      * @param {string} input - Example: "s(1,1) sc(2,2) (4,5) c(5,6) ec(0,1) e(-1,0)"
//      * @returns {Waypoint[]}
//      */
//     static parseSequence(input) {
//         return input.trim().split(/\s+/).map(part => this.parse(part));
//     }

//     /**
//      * Parse a single waypoint definition
//      * @param {string} input - Example: "s(1,1)" or "sc(2,2)"
//      * @returns {Waypoint}
//      */
//     static parse(input) {
//         const regex = /^([a-z]*)\(([^)]+)\)$/;
//         const match = input.match(regex);
        
//         if (!match) {
//             throw new Error(`Invalid waypoint: ${input}`);
//         }

//         const [_, type, coords] = match;
//         const [x, y] = coords.split(',').map(n => parseFloat(n.trim()));

//         return new Waypoint(type || 'absolute', x, y);
//     }

//     /**
//      * Convert waypoint to absolute coordinates
//      * @param {Point2D} startPoint - Start point of the edge
//      * @param {Point2D} endPoint - End point of the edge
//      * @returns {Point2D & {isControl?: boolean}}
//      */
//     toAbsolute(startPoint, endPoint) {
//         let point;
//         switch(this.type) {
//             case 's':  // start-relative point
//                 point = startPoint.add(new Point2D(this.x, this.y));
//                 break;
//             case 'sc': // start-relative control point
//                 point = startPoint.add(new Point2D(this.x, this.y));
//                 point.isControl = true;
//                 break;
//             case 'e':  // end-relative point
//                 point = endPoint.add(new Point2D(this.x, this.y));
//                 break;
//             case 'ec': // end-relative control point
//                 point = endPoint.add(new Point2D(this.x, this.y));
//                 point.isControl = true;
//                 break;
//             case 'c':  // absolute control point
//                 point = new Point2D(this.x, this.y);
//                 point.isControl = true;
//                 break;
//             default:   // absolute point
//                 point = new Point2D(this.x, this.y);
//         }
//         return point;
//     }
// }

// module.exports = Waypoint;