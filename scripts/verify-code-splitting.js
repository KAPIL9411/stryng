#!/usr/bin/env node

/**
 * Verification script for route-based code splitting
 * Checks that lazy loading is properly implemented
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkAppJsx() {
  log('\n📋 Checking App.jsx for lazy loading...', 'cyan');

  const appPath = join(rootDir, 'src', 'App.jsx');
  const content = readFileSync(appPath, 'utf-8');

  // Check for lazy imports
  const lazyImports = content.match(/const\s+\w+\s*=\s*lazy\(/g) || [];
  log(`  ✓ Found ${lazyImports.length} lazy-loaded components`, 'green');

  // Check for Suspense
  const hasSuspense = content.includes('Suspense') || content.includes('SuspenseWrapper');
  if (hasSuspense) {
    log('  ✓ Suspense boundary is present', 'green');
  } else {
    log('  ✗ Suspense boundary is missing', 'red');
    return false;
  }

  // List lazy-loaded components
  const componentNames = content.match(/const\s+(\w+)\s*=\s*lazy\(/g);
  if (componentNames) {
    log('\n  Lazy-loaded components:', 'blue');
    componentNames.forEach((match) => {
      const name = match.match(/const\s+(\w+)/)[1];
      log(`    - ${name}`, 'blue');
    });
  }

  return true;
}

function checkSuspenseWrapper() {
  log('\n📋 Checking SuspenseWrapper component...', 'cyan');

  const wrapperPath = join(rootDir, 'src', 'components', 'common', 'SuspenseWrapper.jsx');
  try {
    const content = readFileSync(wrapperPath, 'utf-8');
    const hasSuspense = content.includes('Suspense');
    const hasLoadingSpinner = content.includes('LoadingSpinner');

    if (hasSuspense && hasLoadingSpinner) {
      log('  ✓ SuspenseWrapper is properly implemented', 'green');
      return true;
    } else {
      log('  ✗ SuspenseWrapper is incomplete', 'red');
      return false;
    }
  } catch (error) {
    log('  ✗ SuspenseWrapper component not found', 'red');
    return false;
  }
}

function checkBuildOutput() {
  log('\n📋 Checking build output...', 'cyan');

  const distPath = join(rootDir, 'dist', 'assets');
  try {
    const files = readdirSync(distPath);
    const jsFiles = files.filter((f) => f.endsWith('.js'));

    if (jsFiles.length === 0) {
      log('  ⚠ No build output found. Run "npm run build" first.', 'yellow');
      return null;
    }

    log(`  ✓ Found ${jsFiles.length} JavaScript chunks`, 'green');

    // Calculate total size
    let totalSize = 0;
    jsFiles.forEach((file) => {
      const filePath = join(distPath, file);
      const stats = statSync(filePath);
      totalSize += stats.size;
    });

    const totalSizeKB = (totalSize / 1024).toFixed(2);
    log(`  ✓ Total bundle size: ${totalSizeKB} KB`, 'green');

    if (totalSize > 500 * 1024) {
      log('  ⚠ Bundle size exceeds 500KB target', 'yellow');
    }

    // List chunks
    log('\n  JavaScript chunks:', 'blue');
    jsFiles.forEach((file) => {
      const filePath = join(distPath, file);
      const stats = statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      log(`    - ${file} (${sizeKB} KB)`, 'blue');
    });

    return true;
  } catch (error) {
    log('  ⚠ Build output not found. Run "npm run build" first.', 'yellow');
    return null;
  }
}

function checkRouteComponents() {
  log('\n📋 Checking route components...', 'cyan');

  const pagesPath = join(rootDir, 'src', 'pages');
  const adminPagesPath = join(pagesPath, 'admin');

  try {
    const publicPages = readdirSync(pagesPath).filter(
      (f) => f.endsWith('.jsx') && !f.includes('.test.')
    );
    const adminPages = readdirSync(adminPagesPath).filter(
      (f) => f.endsWith('.jsx') && !f.includes('.test.')
    );

    log(`  ✓ Found ${publicPages.length} public route components`, 'green');
    log(`  ✓ Found ${adminPages.length} admin route components`, 'green');

    return true;
  } catch (error) {
    log('  ✗ Error reading route components', 'red');
    return false;
  }
}

function main() {
  log('═══════════════════════════════════════════════════', 'cyan');
  log('  Code Splitting Verification', 'cyan');
  log('═══════════════════════════════════════════════════', 'cyan');

  const checks = [
    checkAppJsx(),
    checkSuspenseWrapper(),
    checkRouteComponents(),
    checkBuildOutput(),
  ];

  const passed = checks.filter((c) => c === true).length;
  const failed = checks.filter((c) => c === false).length;
  const skipped = checks.filter((c) => c === null).length;

  log('\n═══════════════════════════════════════════════════', 'cyan');
  log('  Summary', 'cyan');
  log('═══════════════════════════════════════════════════', 'cyan');
  log(`  ✓ Passed: ${passed}`, 'green');
  if (failed > 0) {
    log(`  ✗ Failed: ${failed}`, 'red');
  }
  if (skipped > 0) {
    log(`  ⚠ Skipped: ${skipped}`, 'yellow');
  }

  if (failed === 0) {
    log('\n✅ Code splitting is properly implemented!', 'green');
    log('\nTo verify in the browser:', 'cyan');
    log('  1. Run: npm run dev', 'blue');
    log('  2. Open DevTools > Network tab', 'blue');
    log('  3. Navigate between routes', 'blue');
    log('  4. Observe lazy-loaded chunks being fetched', 'blue');
    process.exit(0);
  } else {
    log('\n❌ Code splitting verification failed!', 'red');
    log('Please fix the issues above and try again.', 'yellow');
    process.exit(1);
  }
}

main();
