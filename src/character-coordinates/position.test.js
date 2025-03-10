/**
 * Tests for the position utility functions
 */

const {
  normalizePosition,
  tcx,
  tcy,
  tbxc,
  tbyc,
  parsePositionShorthand,
  addPositionsX,
  addPositionsY,
  subtractPositionsX,
  subtractPositionsY,
  multiplyPositionX,
  multiplyPositionY,
  DEFAULT_BLOCK_WIDTH,
  DEFAULT_BLOCK_HEIGHT
} = require('./position');

// Simple test runner
function runTests() {
  let passed = 0;
  let failed = 0;
  
  function test(name, fn) {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (error) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   ${error.message}`);
      failed++;
    }
  }
  
  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || "Assertion failed");
    }
  }
  
  function assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error(`${message || "Objects not equal"}: expected ${expectedStr}, got ${actualStr}`);
    }
  }
  
  // Test normalizePosition
  test('normalizePosition handles full form', () => {
    const result = normalizePosition({ reference: "node.right", blocks: 2, chars: 3 });
    assertDeepEqual(result, { reference: "node.right", blocks: 2, chars: 3 });
  });
  
  test('normalizePosition handles abbreviated form', () => {
    const result = normalizePosition({ ref: "node.right", b: 2, c: 3 });
    assertDeepEqual(result, { reference: "node.right", blocks: 2, chars: 3 });
  });
  
  test('normalizePosition handles mixed form', () => {
    const result = normalizePosition({ reference: "node.right", b: 2, chars: 3 });
    assertDeepEqual(result, { reference: "node.right", blocks: 2, chars: 3 });
  });
  
  test('normalizePosition handles null/undefined', () => {
    const result = normalizePosition(null);
    assertDeepEqual(result, { reference: null, blocks: 0, chars: 0 });
  });
  
  // Test tcx/tcy
  test('tcx converts position to absolute characters', () => {
    const result = tcx({ blocks: 2, chars: 3 });
    assert(result === 2 * DEFAULT_BLOCK_WIDTH + 3, `Expected ${2 * DEFAULT_BLOCK_WIDTH + 3}, got ${result}`);
  });
  
  test('tcy converts position to absolute characters with block height', () => {
    const result = tcy({ blocks: 2, chars: 3 });
    assert(result === 2 * DEFAULT_BLOCK_HEIGHT + 3, `Expected ${2 * DEFAULT_BLOCK_HEIGHT + 3}, got ${result}`);
  });
  
  // Test tbxc/tbyc
  test('tbxc converts absolute characters to position', () => {
    const result = tbxc(45); // 2 blocks (21*2=42) + 3 chars
    assertDeepEqual(result, { blocks: 2, chars: 3 });
  });
  
  test('tbyc converts absolute characters to position with block height', () => {
    const result = tbyc(25); // 2 blocks (11*2=22) + 3 chars
    assertDeepEqual(result, { blocks: 2, chars: 3 });
  });
  
  // Test parsePositionShorthand
  test('parsePositionShorthand handles reference with blocks and chars', () => {
    const result = parsePositionShorthand("node.right +2b3c");
    assertDeepEqual(result, { reference: "node.right", blocks: 2, chars: 3 });
  });
  
  test('parsePositionShorthand handles reference with just blocks', () => {
    const result = parsePositionShorthand("node.right +2");
    assertDeepEqual(result, { reference: "node.right", blocks: 2, chars: 0 });
  });
  
  test('parsePositionShorthand handles reference with just chars', () => {
    const result = parsePositionShorthand("node.right +3c");
    assertDeepEqual(result, { reference: "node.right", blocks: 0, chars: 3 });
  });
  
  test('parsePositionShorthand handles negative values', () => {
    const result = parsePositionShorthand("node.right -2b-3c");
    assertDeepEqual(result, { reference: "node.right", blocks: -2, chars: -3 });
  });
  
  test('parsePositionShorthand handles multiple terms', () => {
    const result = parsePositionShorthand("node.right +1b2c -0b1c");
    assertDeepEqual(result, { reference: "node.right", blocks: 1, chars: 1 });
  });
  
  test('parsePositionShorthand handles absolute positions', () => {
    const result = parsePositionShorthand("+2b3c");
    assertDeepEqual(result, { blocks: 2, chars: 3 });
  });
  
  // Test arithmetic operations
  test('addPositionsX adds two positions', () => {
    const result = addPositionsX({ blocks: 2, chars: 3 }, { blocks: 1, chars: 5 });
    // 2b3c = 2*21+3 = 45, 1b5c = 1*21+5 = 26, sum = 71 = 3*21+8 = 3b8c
    assertDeepEqual(result, { blocks: 3, chars: 8 });
  });
  
  test('addPositionsX preserves reference', () => {
    const result = addPositionsX({ reference: "node.right", blocks: 2, chars: 3 }, { blocks: 1, chars: 5 });
    assertDeepEqual(result, { reference: "node.right", blocks: 3, chars: 8 });
  });
  
  test('addPositionsX throws on different references', () => {
    try {
      addPositionsX({ reference: "node.right", blocks: 2, chars: 3 }, { reference: "node.left", blocks: 1, chars: 5 });
      assert(false, "Should have thrown an error");
    } catch (error) {
      assert(error.message.includes("Cannot add positions with different references"));
    }
  });
  
  test('subtractPositionsX subtracts positions', () => {
    const result = subtractPositionsX({ blocks: 3, chars: 8 }, { blocks: 1, chars: 5 });
    // 3b8c = 3*21+8 = 71, 1b5c = 1*21+5 = 26, diff = 45 = 2*21+3 = 2b3c
    assertDeepEqual(result, { blocks: 2, chars: 3 });
  });
  
  test('multiplyPositionX scales a position', () => {
    const result = multiplyPositionX({ blocks: 2, chars: 3 }, 2);
    // 2b3c = 2*21+3 = 45, 45*2 = 90 = 4*21+6 = 4b6c
    assertDeepEqual(result, { blocks: 4, chars: 6 });
  });
  
  // Test overflow normalization
  test('tbxc normalizes negative chars', () => {
    const result = tbxc(80); // 3*21+17 = 80
    assertDeepEqual(result, { blocks: 3, chars: 17 });
  });
  
  test('addPositionsX handles overflow correctly', () => {
    const result = addPositionsX({ blocks: 4, chars: -4 }, { blocks: 0, chars: 0 });
    // 4b-4c = 4*21-4 = 80, 0b0c = 0, sum = 80 = 3*21+17 = 3b17c
    assertDeepEqual(result, { blocks: 3, chars: 17 });
  });
  
  // Print summary
  console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Run the tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests }; 