// const { getNodeConnectionPoint: getNodePoint } = require('./node-connection-point');
// const Waypoint = require('./waypoint');

// /**
//  * PointParser handles parsing of node references and waypoints for edge definitions
//  */
// class PointParser {
//     /**
//      * Main entry point for parsing complete edge definitions
//      * @param {string} from - Start node reference
//      * @param {string} to - End node reference
//     //  * @param {string} waypoints - Optional waypoint sequence
//      */
//     static parseEdgeDefinition(from, to, waypoints) {
//         return {
//             start: {
//                 nodeName: from,
//                 direction: null,  // will default to 'center'
//                 offset: null
//             },
//             end: {
//                 nodeName: to,
//                 direction: null,  // will default to 'center'
//                 offset: null
//             },
//             waypoints: waypoints ? Waypoint.parseSequence(waypoints) : []
//         };
//     }

//     /**
//      * Parses node reference strings
//      */
//     static parseNodeReference(input) {
//         // Parse the input into components
//         const matches = input.match(/^(\w+)(?:\.(\w+))?(?:\s*\+\s*\(([^)]+)\))?$/);
//         if (!matches) {
//             throw new Error(`Invalid node reference: ${input}`);
//         }

//         const [_, nodeName, direction, offsetStr] = matches;
//         return {
//             nodeName,
//             direction: direction || null,
//             offset: offsetStr ? this.parseOffset(offsetStr) : null
//         };
//     }

//     /**
//      * Parses offset strings like "(1,0)" or "(1)"
//      * @returns {Object} Either { single: number } for natural direction
//      *                   or { x: number, y: number } for explicit coordinates
//      */
//     static parseOffset(offsetStr) {
//         const values = offsetStr.split(',').map(n => parseFloat(n.trim()));
//         if (values.length === 1) {
//             return { single: values[0] };
//         }
//         return { x: values[0], y: values[1] };
//     }

//     /**
//      * Parses a complete waypoint string containing multiple points
//      * Example: "s(1,1) sc(2,2) sc(3,3) (4,5) c(5,6) ec(0,1) e(-1,0)"
//      */
//     static parseWaypoints(input) {
//         const parts = input.trim().split(/\s+/);
//         return parts.map(part => this.parseWaypoint(part));
//     }

//     /**
//      * Parses a single waypoint like "s(1,1)" or "sc(2,2)"
//      * Returns: { type: string, x: number, y: number }
//      * Where type can be:
//      * - 's'  = start-relative point
//      * - 'sc' = start-relative control point
//      * - ''   = absolute point
//      * - 'c'  = absolute control point
//      * - 'ec' = end-relative control point
//      * - 'e'  = end-relative point
//      */
//     static parseWaypoint(part) {
//         const regex = /^([a-z]*)\(([^)]+)\)$/;
//         const match = part.match(regex);
        
//         if (!match) {
//             throw new Error(`Invalid waypoint: ${part}`);
//         }

//         const [_, type, coords] = match;
//         const [x, y] = coords.split(',').map(n => parseFloat(n.trim()));

//         return {
//             type: type || 'absolute',
//             x,
//             y
//         };
//     }
// }

// module.exports = { PointParser };