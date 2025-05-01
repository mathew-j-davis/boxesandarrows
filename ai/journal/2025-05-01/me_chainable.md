```javascript
// Generic wrapper factory
function createChainable(value) {
  return {
    value,
    b() {
      this.value += 10;
      return this;
    },
    c() {
      this.value *= 2;
      return this;
    },
    result() {
      return this.value;
    }
  };
}

// Usage
const result = createChainable(5).b().c().result(); // (5+10)*2 = 30

function createProxy(target) {
  return new Proxy(target, {
    get(obj, prop) {
      // Handle native properties/methods
      if (prop in obj) return obj[prop];
      
      // Add custom methods
      if (prop === 'b') {
        return function() {
          return createProxy(obj + 10);
        };
      }
      
      return undefined;
    }
  });
}

// Works with different types
const result = createProxy(5).b().b(); // 25
const strResult = createProxy("hello").b(); // "hello10"



const methods = {
  map(fn) {
    const result = Array.from(this, fn);
    return chainableArray(result);
  },
  filter(fn) {
    const result = Array.from(this).filter(fn);
    return chainableArray(result);
  }
};

function chainableArray(arr) {
  const obj = Object.create(methods);
  obj[Symbol.iterator] = function*() {
    yield* arr;
  };
  return obj;
}

// Usage with any iterable
const result = chainableArray([1, 2, 3, 4])
  .filter(x => x % 2 === 0)
  .map(x => x * 2);

```