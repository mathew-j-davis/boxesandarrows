class Point2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(other) {
        return new Point2D(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
        return new Point2D(this.x - other.x, this.y - other.y);
    }

    scale(factor) {
        return new Point2D(this.x * factor, this.y * factor);
    }
}

class Direction {
    static NORTH = 'n';
    static SOUTH = 's';
    static EAST = 'e';
    static WEST = 'w';
    static NORTHEAST = 'ne';
    static NORTHWEST = 'nw';
    static SOUTHEAST = 'se';
    static SOUTHWEST = 'sw';

    static getVector(direction) {
        const vectors = {
            'n':  new Point2D(0, 1),
            's':  new Point2D(0, -1),
            'e':  new Point2D(1, 0),
            'w':  new Point2D(-1, 0),
            'ne': new Point2D(0.707, 0.707),   // √2/2 for diagonal unit vectors
            'nw': new Point2D(-0.707, 0.707),
            'se': new Point2D(0.707, -0.707),
            'sw': new Point2D(-0.707, -0.707)
        };
        return vectors[direction] || new Point2D(0, 0);
    }
}

class Box {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    get left() { return this.x; }
    get right() { return this.x + this.width; }
    get top() { return this.y + this.height; }
    get bottom() { return this.y; }
    get center() { return new Point2D(this.x + this.width/2, this.y + this.height/2); }

    contains(point) {
        return point.x >= this.left && 
               point.x <= this.right && 
               point.y >= this.bottom && 
               point.y <= this.top;
    }

    intersects(other) {
        return !(this.right < other.left || 
                this.left > other.right || 
                this.top < other.bottom || 
                this.bottom > other.top);
    }
}

module.exports = {
    Point2D,
    Direction,
    Box
}; 