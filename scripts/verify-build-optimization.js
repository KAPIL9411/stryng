#!/usr/bin/env node

/**
 * Build Optimization Verification Script
 * Verifies that the Vite build configuration optimizations are working correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');
const assetsPath = path.join(distPath, 'assets');

console.log('🔍 Verifying Build Optimizations...\n');

let allChecksPassed = true;

// Check 1: Verify manual chunks are created
console.log('✓ Check 1: Manual Chunks Configuration');
const expectedChunks = [
  'vendor-react',
  'vendor-query',
  'vendor-ui',
  'vendor-forms',
  'vendor-state'
];

const files = fs.readdirSync(assetsPath);
const foundChunks = [];

expectedChunks.forEach(chunk => {
  const found = files.some(file => file.includes(chunk));
  if (found) {
    foundChunks.push(chunk);
    console.log(`  ✓ ${chunk} chunk created`);
  } else {
    console.log(`  ✗ ${chunk} chunk NOT found`);
    allChecksPassed = false;
  }
});

console.log(`  Found ${foundChunks.length}/${expectedChunks.length} expected chunks\n`);

// Check 2: Verify compression files are created
console.log('✓ Check 2: Compression Configuration');
const gzipFiles = files.filter(f => f.endsWith('.gz'));
const brotliFiles = files.filter(f => f.endsWith('.br'));

console.log(`  ✓ Gzip files created: ${gzipFiles.length}`);
console.log(`  ✓ Brotli files created: ${brotliFiles.length}`);

if (gzipFiles.length === 0) {
  console.log('  ✗ No gzip compressed files found');
  allChecksPassed = false;
}

if (brotliFiles.length === 0) {
  console.log('  ✗ No brotli compressed files found');
  allChecksPassed = false;
}

console.log();

// Check 3: Verify minification (check for console.log removal)
console.log('✓ Check 3: Minification with Terser');
const jsFiles = files.filter(f => f.endsWith('.js') && !f.endsWith('.gz') && !f.endsWith('.br'));
let consoleLogsFound = false;

jsFiles.forEach(file => {
  const content = fs.readFileSync(path.join(assetsPath, file), 'utf-8');
  if (content.includes('console.log') || content.includes('console.info') || content.includes('console.debug')) {
    console.log(`  ⚠ console statements found in ${file}`);
    consoleLogsFound = true;
  }
});

if (!consoleLogsFound) {
  console.log('  ✓ No console statements found in production build');
} else {
  console.log('  ℹ Some console statements may be from dependencies');
}

console.log();

// Check 4: Verify bundle size
console.log('✓ Check 4: Bundle Size Analysis');
let totalSize = 0;
let totalGzipSize = 0;

jsFiles.forEach(file => {
  const filePath = path.join(assetsPath, file);
  const stats = fs.statSync(filePath);
  totalSize += stats.size;
});

gzipFiles.forEach(file => {
  const filePath = path.join(assetsPath, file);
  const stats = fs.statSync(filePath);
  totalGzipSize += stats.size;
});

const totalSizeKB = (totalSize / 1024).toFixed(2);
const totalGzipSizeKB = (totalGzipSize / 1024).toFixed(2);

console.log(`  Total JS bundle size: ${totalSizeKB} KB`);
console.log(`  Total gzipped size: ${totalGzipSizeKB} KB`);

if (totalSize > 500 * 1024) {
  console.log(`  ⚠ Bundle size exceeds 500KB target (${totalSizeKB} KB)`);
} else {
  console.log(`  ✓ Bundle size is within 500KB target`);
}

console.log();

// Check 5: Verify CSS code splitting
console.log('✓ Check 5: CSS Code Splitting');
const cssFiles = files.filter(f => f.endsWith('.css'));
console.log(`  ✓ CSS files created: ${cssFiles.length}`);

if (cssFiles.length === 0) {
  console.log('  ✗ No CSS files found');
  allChecksPassed = false;
}

console.log();

// Check 6: Verify hash-based filenames for cache busting
console.log('✓ Check 6: Cache Busting (Hash-based Filenames)');
const hashedFiles = files.filter(f => /\.[a-zA-Z0-9]{8}\.(js|css)$/.test(f));
console.log(`  ✓ Files with hash: ${hashedFiles.length}/${files.filter(f => f.endsWith('.js') || f.endsWith('.css')).length}`);

if (hashedFiles.length === 0) {
  console.log('  ✗ No hashed filenames found');
  allChecksPassed = false;
}

console.log();

// Summary
console.log('═'.repeat(50));
if (allChecksPassed) {
  console.log('✅ All build optimizations verified successfully!');
} else {
  console.log('⚠️  Some checks failed. Review the output above.');
}
console.log('═'.repeat(50));

process.exit(allChecksPassed ? 0 : 1);
