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

            edge._coordinateSystem = 'vector';
        }
    }

    /**
     * Auto-detect edge anchors based on node positions
     */
    autoDetectAnchors(fromNode, toNode, edge) {
        let startAnchor = edge.start_anchor;
        let endAnchor = edge.end_anchor;

        // Auto-detect start anchor if not specified
        if (!startAnchor || startAnchor === 'null' || startAnchor === '') {
            if (fromNode.position && toNode.position) {
                const dx = toNode.position.xScaled - fromNode.position.xScaled;
                const dy = toNode.position.yScaled - fromNode.position.yScaled;
                startAnchor = Direction.getDirectionName(dx, dy);
            } else {
                // No positions yet - default to center
                startAnchor = 'center';
            }
        }

        // Auto-detect end anchor if not specified
        if (!endAnchor || endAnchor === 'null' || endAnchor === '') {
            if (fromNode.position && toNode.position) {
                const dx = fromNode.position.xScaled - toNode.position.xScaled;
                const dy = fromNode.position.yScaled - toNode.position.yScaled;
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

        return {
            x: node.position.xUnscaled +
               ((directionVector.x - anchorVector.x) *
                node.dimensions.widthScaled / (2 * scale.position.x)),

            y: node.position.yUnscaled +
               ((directionVector.y - anchorVector.y) *
                node.dimensions.heightScaled / (2 * scale.position.y))
        };
    }
}

module.exports = VectorLayoutEngine;
