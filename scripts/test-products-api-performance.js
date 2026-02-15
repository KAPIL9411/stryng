/**
 * Test Products API Performance
 * Measures response times with and without caching
 */

import { fetchProducts } from '../src/api/products.api.js';

async function testPerformance() {
  console.log('🧪 Testing Products API Performance\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: First request (cache miss)
    console.log('\n📊 Test 1: First Request (Cache Miss)');
    const start1 = performance.now();
    const result1 = await fetchProducts(1, 24, {});
    const duration1 = performance.now() - start1;
    console.log(`⏱️  Duration: ${duration1.toFixed(2)}ms`);
    console.log(`📦 Products returned: ${result1.products.length}`);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 2: Second request (cache hit)
    console.log('\n📊 Test 2: Second Request (Cache Hit)');
    const start2 = performance.now();
    const result2 = await fetchProducts(1, 24, {});
    const duration2 = performance.now() - start2;
    console.log(`⏱️  Duration: ${duration2.toFixed(2)}ms`);
    console.log(`📦 Products returned: ${result2.products.length}`);

    // Test 3: Third request (cache hit)
    console.log('\n📊 Test 3: Third Request (Cache Hit)');
    const start3 = performance.now();
    const result3 = await fetchProducts(1, 24, {});
    const duration3 = performance.now() - start3;
    console.log(`⏱️  Duration: ${duration3.toFixed(2)}ms`);
    console.log(`📦 Products returned: ${result3.products.length}`);

    // Calculate improvement
    const avgCached = (duration2 + duration3) / 2;
    const improvement = ((duration1 - avgCached) / duration1) * 100;

    console.log('\n' + '='.repeat(60));
    console.log('📈 Performance Summary:');
    console.log(`   First request (no cache): ${duration1.toFixed(2)}ms`);
    console.log(`   Cached requests (avg):    ${avgCached.toFixed(2)}ms`);
    console.log(`   Improvement:              ${improvement.toFixed(1)}% faster`);
    console.log('='.repeat(60));

    if (improvement > 50) {
      console.log('\n✅ EXCELLENT: Caching is working effectively!');
    } else if (improvement > 20) {
      console.log('\n⚠️  MODERATE: Caching is working but could be better');
    } else {
      console.log('\n❌ POOR: Caching may not be working properly');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testPerformance();
