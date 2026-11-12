const LayoutEngine = require('./layout-engine');
const { Position } = require('../geometry/position');
const Dimensions = require('../geometry/dimensions');
const { Direction } = require('../geometry/direction');

/**
 * Vector layout engine for continuous coordinate systems
 * Used by LaTeX, SVG, PDF renderers
 *
 * Characteristics:
 * - Floating point coordinates
 * - Text scales to fit boxes
 * - Respects input dimensions
 */
class VectorLayoutEngine extends LayoutEngine {
    constructor(styleHandler, options = {}) {
        super(styleHandler, options);
        this.scaleConfig = null;
    }

    /**
     * Calculate vector layout for all nodes and edges
     */
    calculateLayout(nodes, edges) {
        this.scaleConfig = this.styleHandler.getPageScale();

        // Add Y-axis direction if set by renderer
        if (this.yAxisDirection !== undefined) {
            this.scaleConfig.yAxisDirection = this.yAxisDirection;
        }

        // Phase 1: Calculate node positions/dimensions/anchors
        this.calculateNodeLayout(nodes);

        // Phase 2: Calculate edge connection points
        this.calculateEdgeLayout(edges, nodes);

        return { nodes, edges };
    }

    /**
     * Extract node name from a reference (handles "nodeName" and "nodeName.anchor")
     */
    extractNodeName(reference) {
        if (!reference || typeof reference !== 'string') return null;
        return reference.split('.')[0];
    }

    /**
     * Get all dependencies for a node
     */
    getNodeDependencies(node) {
        const deps = new Set();

        // Position dependencies
        if (node.at) deps.add(this.extractNodeName(node.at));
        if (node.position_of) deps.add(this.extractNodeName(node.position_of));
        if (node.x_of) deps.add(this.extractNodeName(node.x_of));
        if (node.y_of) deps.add(this.extractNodeName(node.y_of));

        // Dimension dependencies
        if (node.w_of) deps.add(this.extractNodeName(node.w_of));
        if (node.h_of) deps.add(this.extractNodeName(node.h_of));
        if (node.w_from) deps.add(this.extractNodeName(node.w_from));
        if (node.w_to) deps.add(this.extractNodeName(node.w_to));
        if (node.h_from) deps.add(this.extractNodeName(node.h_from));
        if (node.h_to) deps.add(this.extractNodeName(node.h_to));

        deps.delete(null);
        return Array.from(deps);
    }

    /**
     * Topologically sort nodes by dependencies
     */
    topologicalSort(nodes) {
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();

        const visit = (nodeName) => {
            if (visited.has(nodeName)) return;
            if (visiting.has(nodeName)) {
                console.warn(`Circular dependency detected involving node "${nodeName}"`);
                return;
            }

            visiting.add(nodeName);
            const node = nodes.get(nodeName);
            if (node) {
                const deps = this.getNodeDependencies(node);
                for (const dep of deps) {
                    if (nodes.has(dep)) {
                        visit(dep);
                    }
                }
            }
            visiting.delete(nodeName);
            visited.add(nodeName);
            sorted.push(nodeName);
        };

        for (const nodeName of nodes.keys()) {
            visit(nodeName);
        }

        return sorted;
    }

    /**
     * Calculate layout for all nodes in dependency order
     */
    calculateNodeLayout(nodes) {
        // Sort nodes by dependencies
        const sortedNodeNames = this.topologicalSort(nodes);

        for (const nodeName of sortedNodeNames) {
            const node = nodes.get(nodeName);
            if (!node) continue;

            // Only use explicit x/y values, don't default to 0 if using relative positioning
            // If x_of or y_of is specified, we should let those calculate the position
            let x = node.x;
            let y = node.y;

            // Only default to 0 if no relative positioning is being used
            if (x === undefined && !node.x_of && !node.position_of && !node.at) {
                x = 0;
            }
            if (y === undefined && !node.y_of && !node.position_of && !node.at) {
                y = 0;
            }

            // Calculate vector position (floating point)
            node.position = Position.calculatePositionAndScale(
                nodes,
                x, y,
                node.at,
                node.position_of,
                node.x_of, node.y_of,
                undefined, undefined,
                node.x_offset, node.y_offset,
                this.scaleConfig
            );

            // Calculate vector dimensions (respects input, text will scale)
            node.dimensions = Dimensions.calculateDimensionsAndScale(
                nodes,
                node.width, node.height,
                node.w_of, node.h_of,
                node.w_from, node.h_from,
                node.w_to, node.h_to,
                node.w_offset, node.h_offset,
                this.scaleConfig
            );

            // Calculate anchor as vector (-1 to 1 range)
            node.anchorVector = this.calculateAnchorVector(node);

            // Mark coordinate system type for debugging
            node._coordinateSystem = 'vector';
        }
    }

    /**
     * Calculate anchor as vector
     */
    calculateAnchorVector(node) {
        // Check explicit anchor on node
        if (node.anchor && typeof node.anchor === 'string') {
            return Direction.getVector(node.anchor);
        }

        // Get from style system
        const anchor = this.styleHandler.getStyleValueWithNamesStringAndModifyWithDefault(
            node.style,
            'node.object.anchor',
            [],
            false,
            'center'
        );

        return Direction.getVector(anchor);
    }

    /**
     * Calculate edge connection points
     */
    calculateEdgeLayout(edges, nodes) {
        for (const edge of edges) {
            const fromNode = nodes.get(edge.from);
            const toNode = nodes.get(edge.to);

            if (!fromNode || !toNode) {
                console.warn(`Edge references missing node: ${edge.from} -> ${edge.to}`);
                continue;
            }

            // Auto-detect anchors if not specified
            const anchors = this.autoDetectAnchors(fromNode, toNode, edge);

            // Calculate precise connection points
            // Using edge.start and edge.end to match existing LatexRenderer expectations
            edge.start = this.getConnectionPoint(
                fromNode,
                anchors.start,
                this.scaleConfig
            );

            edge.end = this.getConnectionPoint(
                toNode,
                anchors.end,
                this.scaleConfig
            );

            // Also set startPoint/endPoint for new code that expects these names
            edge.startPoint = edge.start;
            edge.endPoint = edge.end;

            // Calculate waypoints if defined
            if (edge.waypoints && Array.isArray(edge.waypoints)) {
                edge.waypoints = this.calculateWaypoints(edge, nodes);
            }

            edge._coordinateSystem = 'vector';
        }
    }

    /**
     * Calculate waypoint positions for an edge
     */
    calculateWaypoints(edge, nodes) {
        const calculatedWaypoints = [];

        for (const waypoint of edge.waypoints) {
            let x, y;

            // Check if waypoint uses position_of (relative positioning)
            if (waypoint.position_of) {
                const posRef = waypoint.position_of.toLowerCase();

                // Handle special references to edge start/end
                if (posRef === 'start' || posRef === 'from') {
                    // Relative to edge start point
                    x = edge.start.x + (waypoint.x_offset || 0);
                    y = edge.start.y + (waypoint.y_offset || 0);
                } else if (posRef === 'end' || posRef === 'to') {
                    // Relative to edge end point
                    x = edge.end.x + (waypoint.x_offset || 0);
                    y = edge.end.y + (waypoint.y_offset || 0);
                } else {
                    // Relative to a node anchor (e.g., "vault.west")
                    const parts = waypoint.position_of.split('.');
                    const nodeName = parts[0];
                    const anchor = parts[1] || 'center';
                    const refNode = nodes.get(nodeName);

                    if (refNode) {
                        const point = this.getConnectionPoint(refNode, anchor, this.scaleConfig);
                        x = point.x + (waypoint.x_offset || 0);
                        y = point.y + (waypoint.y_offset || 0);
                    } else {
                        console.warn(`Waypoint references unknown node: ${nodeName}`);
                        continue;
                    }
                }
            } else if (waypoint.x !== undefined && waypoint.y !== undefined) {
                // Absolute coordinates
                x = waypoint.x;
                y = waypoint.y;
            } else {
                console.warn('Waypoint missing position information:', waypoint);
                continue;
            }

            calculatedWaypoints.push({
                x: x,
                y: y,
                isControl: waypoint.isControl || false
            });
        }

        return calculatedWaypoints;
    }

    /**
     * Auto-detect edge anchors based on node positions
     */
    autoDetectAnchors(fromNode, toNode, edge) {
        let startAnchor = edge.start_anchor;
        let endAnchor = edge.end_anchor;

        // Get Y-axis direction for coordinate system conversion
        const yDir = this.scaleConfig?.yAxisDirection || 1;

        // Auto-detect start anchor if not specified
        if (!startAnchor || startAnchor === 'null' || startAnchor === '') {
            if (fromNode.position && toNode.position) {
                let dx = toNode.position.xScaled - fromNode.position.xScaled;
                // Apply yDir to convert screen Y (SVG) to mathematical Y (for Direction.getDirectionName)
                let dy = (toNode.position.yScaled - fromNode.position.yScaled) * yDir;

                // Check for Y overlap - if nodes overlap in Y, use only horizontal direction
                const fromTop = fromNode.position.yScaled - (-fromNode.anchorVector.y + 1) * fromNode.dimensions.heightScaled / 2;
                const fromBottom = fromTop + fromNode.dimensions.heightScaled;
                const toTop = toNode.position.yScaled - (-toNode.anchorVector.y + 1) * toNode.dimensions.heightScaled / 2;
                const toBottom = toTop + toNode.dimensions.heightScaled;

                const yOverlap = !(toBottom < fromTop || toTop > fromBottom);
                if (yOverlap) {
                    dy = 0;  // Force horizontal direction
                }

                // Check for X overlap - if nodes overlap in X, use only vertical direction
                const fromLeft = fromNode.position.xScaled - (fromNode.anchorVector.x + 1) * fromNode.dimensions.widthScaled / 2;
                const fromRight = fromLeft + fromNode.dimensions.widthScaled;
                const toLeft = toNode.position.xScaled - (toNode.anchorVector.x + 1) * toNode.dimensions.widthScaled / 2;
                const toRight = toLeft + toNode.dimensions.widthScaled;

                const xOverlap = !(toRight < fromLeft || toLeft > fromRight);
                if (xOverlap) {
                    dx = 0;  // Force vertical direction
                }

                startAnchor = Direction.getDirectionName(dx, dy);
            } else {
                // No positions yet - default to center
                startAnchor = 'center';
            }
        }

        // Auto-detect end anchor if not specified
        if (!endAnchor || endAnchor === 'null' || endAnchor === '') {
            if (fromNode.position && toNode.position) {
                let dx = fromNode.position.xScaled - toNode.position.xScaled;
                // Apply yDir to convert screen Y (SVG) to mathematical Y (for Direction.getDirectionName)
                let dy = (fromNode.position.yScaled - toNode.position.yScaled) * yDir;

                // Check for Y overlap - if nodes overlap in Y, use only horizontal direction
                const fromTop = fromNode.position.yScaled - (-fromNode.anchorVector.y + 1) * fromNode.dimensions.heightScaled / 2;
                const fromBottom = fromTop + fromNode.dimensions.heightScaled;
                const toTop = toNode.position.yScaled - (-toNode.anchorVector.y + 1) * toNode.dimensions.heightScaled / 2;
                const toBottom = toTop + toNode.dimensions.heightScaled;

                const yOverlap = !(toBottom < fromTop || toTop > fromBottom);
                if (yOverlap) {
                    dy = 0;  // Force horizontal direction
                }

                // Check for X overlap - if nodes overlap in X, use only vertical direction
                const fromLeft = fromNode.position.xScaled - (fromNode.anchorVector.x + 1) * fromNode.dimensions.widthScaled / 2;
                const fromRight = fromLeft + fromNode.dimensions.widthScaled;
                const toLeft = toNode.position.xScaled - (toNode.anchorVector.x + 1) * toNode.dimensions.widthScaled / 2;
                const toRight = toLeft + toNode.dimensions.widthScaled;

                const xOverlap = !(toRight < fromLeft || toLeft > fromRight);
                if (xOverlap) {
                    dx = 0;  // Force vertical direction
                }

                endAnchor = Direction.getDirectionName(dx, dy);
            } else {
                // No positions yet - default to center
                endAnchor = 'center';
            }
        }

        return { start: startAnchor, end: endAnchor };
    }

    /**
     * Get connection point on node perimeter
     */
    getConnectionPoint(node, anchor, scale) {
        const directionVector = Direction.getVector(anchor);
        const anchorVector = node.anchorVector;

        // Apply Y-axis direction for coordinate system (SVG vs LaTeX)
        const yDir = scale.yAxisDirection || 1;

        return {
            x: node.position.xUnscaled +
               ((directionVector.x - anchorVector.x) *
                node.dimensions.widthScaled / (2 * scale.position.x)),

            y: node.position.yUnscaled +
               ((directionVector.y * yDir - anchorVector.y * yDir) *
                node.dimensions.heightScaled / (2 * scale.position.y))
        };
    }
}

module.exports = VectorLayoutEngine;
