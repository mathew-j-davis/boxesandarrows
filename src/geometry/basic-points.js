

/**
 * Basic geometric primitives and operations for the simple coordinate system
 * This system is used for initial layout before scaling to final output dimensions
 */

/**
 * Represents a 2D point or vector
 */
class Point2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Add another point or vector
     * @param {Point2D} other 
     * @returns {Point2D}
     */
    add(other) {
        return new Point2D(this.x + other.x, this.y + other.y);
    }

    /**
     * Subtract another point or vector
     * @param {Point2D} other 
     * @returns {Point2D}
     */
    subtract(other) {
        return new Point2D(this.x - other.x, this.y - other.y);
    }

    /**
     * Scale the point/vector by a factor
     * @param {number} factor 
     * @returns {Point2D}
     */
    scale(factor) {
        return new Point2D(this.x * factor, this.y * factor);
    }

    /**
     * Calculate distance to another point
     * @param {Point2D} other 
     * @returns {number}
     */
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get the length of this vector
     * @returns {number}
     */
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Normalize this vector (make it unit length)
     * @returns {Point2D}
     */
    normalize() {
        const len = this.length();
        if (len === 0) return new Point2D(0, 0);
        return new Point2D(this.x / len, this.y / len);
    }

    /**
     * Rotate the point/vector by an angle (in radians)
     * @param {number} angle 
     * @returns {Point2D}
     */
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Point2D(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }
}


module.exports = {
    Point2D
};