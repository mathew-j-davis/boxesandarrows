const Renderer = require('./base');
const Vector = require('victor');
const {
    PrePoint,
    TailPrePoint,
    HeadPrePoint,
    MidPrePoint,
    Point,
    BezierPoint,
    RoundedPoint
} = require('../../modules/graph-core.js');

class GraphvizRenderer extends Renderer {
    constructor(style, options = {}) {
        super(style);
        this.usePointScale = options.usePointScale || true;
        this.format = options.format || 'png';
    }

    // Node rendering
    renderNode(node) {
        let output = `${node.name} ${this.writePos(node.x, node.y)} `;

        if (node.hideLabel) {
            output += this.writeLabel('', false);
        } else if (node.label) {
            output += this.writeLabel(node.label, node.isHtml);
        }

        if (node.h) {
            output += this.writeHeight(node.h);
        }

        if (node.w) {
            output += this.writeWidth(node.w);
        }

        if (node.special) {
            output += node.special;
        }

        for (const [name, value] of node.attributes) {
            output += this.writeAttribute(name, value);
        }

        return output;
    }

    // Edge rendering
    renderEdge(edge, fromNode, toNode) {
        if (!fromNode || !toNode) {
            console.log(`ERROR: Missing ${!fromNode ? 'from' : 'to'} node for edge`);
            return '';
        }

        let output = this.drawEdgeConnector(fromNode, toNode, edge);

        for (const [name, value] of edge.attributes) {
            output += this.writeAttribute(name, value);
        }

        if (edge.special) {
            output += edge.special;
        }

        return output;
    }

    drawEdgeConnector(from, to, edge) {
        const prePoints = [];
        
        const startPrePoint = this.preassembleStartPoint(from, edge.start_direction, edge.start_control, edge.start_adjust_x, edge.start_adjust_y);
        const endPrePoint = this.preassembleEndPoint(to, edge.end_direction, edge.end_control, edge.end_adjust_x, edge.end_adjust_y);

        prePoints.push(startPrePoint);
        prePoints = prePoints.concat(edge.waypoints);
        prePoints.push(endPrePoint);

        prePoints = this.setDirections(edge, from, to, prePoints);
        prePoints = this.setOffsets(edge, from, to, prePoints);
        prePoints = this.setPositions(edge, from, to, prePoints);

        const points = this.plotPoints(edge, from, to, prePoints);

        const labelPosition = this.calculateLabelPosition(edge, from, to, prePoints);
        
        return this.generateDotOutput(edge, from, to, points, labelPosition);
    }

    // Point assembly and calculations
    preassembleStartPoint(node, direction, controlScale, adjustX, adjustY) {
        const point = new TailPrePoint();
        point.pre_x = +node.x + +adjustX;
        point.pre_y = +node.y + +adjustY;
        point.pre_x_symbol = +node.x + +adjustX;
        point.pre_y_symbol = +node.y + +adjustY;
        point.control_out_direction = direction;
        point.control_out_scale = controlScale;
        point.adjust_x = +adjustX;
        point.adjust_y = +adjustY;
        return point;
    }

    preassembleEndPoint(node, direction, controlScale, adjustX, adjustY) {
        const point = new HeadPrePoint();
        point.pre_x = +node.x + +adjustX;
        point.pre_y = +node.y + +adjustY;
        point.pre_x_symbol = +node.x + +adjustX;
        point.pre_y_symbol = +node.y + +adjustY;
        point.control_in_direction = direction;
        point.control_in_scale = controlScale;
        point.adjust_x = +adjustX;
        point.adjust_y = +adjustY;
        return point;
    }

    // Direction calculations
    setDirections(edge, from, to, prePoints) {
        if (prePoints.length < 2) return prePoints;

        prePoints[0] = this.setDirectionSmooth(edge, from, to, null, prePoints[0], prePoints[1]);

        for (let i = 1; i < prePoints.length - 1; i++) {
            prePoints[i] = this.setDirectionSmooth(
                edge, from, to,
                prePoints[i-1],
                prePoints[i],
                prePoints[i+1]
            );
        }

        prePoints[prePoints.length-1] = this.setDirectionSmooth(
            edge, from, to,
            prePoints[prePoints.length-2],
            prePoints[prePoints.length-1],
            null
        );

        return prePoints;
    }

    setDirectionSmooth(edge, from, to, before, point, after) {
        if (!point) return null;

        if (before instanceof PrePoint && point instanceof PrePoint) {
            if (!point.control_in_direction) {
                point.control_in_direction = this.calculateInwardDirection(point, before);
            }
            if (!point.offset_in_direction) {
                point.offset_in_direction = point.control_in_direction;
            }
        }

        if (point instanceof PrePoint && after instanceof PrePoint) {
            if (!point.control_out_direction) {
                point.control_out_direction = this.calculateOutwardDirection(point, after);
            }
            if (!point.offset_out_direction) {
                point.offset_out_direction = point.control_out_direction;
            }
        }

        return point;
    }

    // Offset calculations
    setOffsets(edge, from, to, prePoints) {
        if (prePoints.length < 2) return prePoints;

        const start = prePoints[0];
        const end = prePoints[prePoints.length - 1];

        // Calculate start offsets
        const startWidth = from.w || this.style.shape.size.width;
        const startHeight = from.h || this.style.shape.size.height;
        
        start.pre_x_symbol = start.pre_x + this.calculateXOffset(start.offset_out_direction, startWidth, 'tail', 'symbol');
        start.pre_y_symbol = start.pre_y + this.calculateYOffset(start.offset_out_direction, startHeight, 'tail', 'symbol');
        start.pre_x = start.pre_x + this.calculateXOffset(start.offset_out_direction, startWidth, 'tail', 'point');
        start.pre_y = start.pre_y + this.calculateYOffset(start.offset_out_direction, startHeight, 'tail', 'point');

        // Calculate end offsets
        const endWidth = to.w || this.style.shape.size.width;
        const endHeight = to.h || this.style.shape.size.height;

        end.pre_x_symbol = end.pre_x + this.calculateXOffset(end.offset_in_direction, endWidth, 'head', 'symbol');
        end.pre_y_symbol = end.pre_y + this.calculateYOffset(end.offset_in_direction, endHeight, 'head', 'symbol');
        end.pre_x = end.pre_x + this.calculateXOffset(end.offset_in_direction, endWidth, 'head', 'point');
        end.pre_y = end.pre_y + this.calculateYOffset(end.offset_in_direction, endHeight, 'head', 'point');

        return prePoints;
    }

    // Position calculations
    setPositions(edge, from, to, prePoints) {
        // Implementation of position setting logic
        return prePoints;
    }

    // Helper methods
    calculateXOffset(direction, width, endType, pointType) {
        const baseOffset = ((width / 2.0) + this.style.shape.edge.offset[endType][pointType]) 
            * (this.style.scale.w / this.style.scale.x);
        return baseOffset * this.directionShapedX(direction);
    }

    calculateYOffset(direction, height, endType, pointType) {
        const baseOffset = ((height / 2.0) + this.style.shape.edge.offset[endType][pointType]) 
            * (this.style.scale.h / this.style.scale.y);
        return baseOffset * this.directionShapedY(direction);
    }

    directionShapedX(direction) {
        const angle = this.style.shape.edge.scale.corner;
        const full = this.style.shape.edge.scale.top;
        switch (direction) {
            case 'e': return full;
            case 'se':
            case 'ne': return angle;
            case 'w': return -full;
            case 'nw':
            case 'sw': return -angle;
            default: return 0;
        }
    }

    directionShapedY(direction) {
        const full = this.style.shape.edge.scale.side;
        const angle = this.style.shape.edge.scale.corner;
        switch (direction) {
            case 'n': return -full;
            case 'nw':
            case 'ne': return -angle;
            case 's': return full;
            case 'sw':
            case 'se': return angle;
            default: return 0;
        }
    }

    // Graphviz output formatting
    writePos(x, y) {
        return `[pos="${this.X(x)},${this.InvertedY(y)}!" ] `;
    }

    writeLabel(label, isHtml) {
        if (isHtml) {
            return `[label=<${label}> ] `;
        }
        return `[label="${label}" ] `;
    }

    writeAttribute(name, value) {
        return `[${name}="${value}"] `;
    }

    writeHeight(h) {
        return `[height=${this.calcHeight(h)}] `;
    }

    writeWidth(w) {
        return `[width=${this.calcWidth(w)}] `;
    }

    // Scale and coordinate system helpers
    scale() {
        return this.usePointScale ? this.style.scale.point : 1.0;
    }

    X(n) {
        return (this.scale() * n * this.style.scale.x);
    }

    InvertedY(n) {
        return (this.scale() * (this.style.doc.h - n) * this.style.scale.y);
    }

    calcHeight(n) {
        return (n * this.style.scale.h).toString();
    }

    calcWidth(n) {
        return (n * this.style.scale.w).toString();
    }
}

module.exports = GraphvizRenderer;