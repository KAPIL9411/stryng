#!/usr/bin/env node

/**
 * Lighthouse Audit Script
 * Runs Lighthouse audits on major pages and generates reports
 */

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:4173';

// Major pages to audit
const PAGES = [
  { name: 'Home', url: '/' },
  { name: 'Product Listing', url: '/products' },
  { name: 'Product Detail', url: '/products/1' },
  { name: 'Cart', url: '/cart' },
  { name: 'Login', url: '/login' }
];

// Lighthouse configuration
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1
    },
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false
    }
  }
};

async function runLighthouse(url, name) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'html',
    port: chrome.port
  };

  try {
    const runnerResult = await lighthouse(url, options, config);

    // Extract scores
    const { lhr } = runnerResult;
    const scores = {
      performance: Math.round(lhr.categories.performance.score * 100),
      accessibility: Math.round(lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
      seo: Math.round(lhr.categories.seo.score * 100)
    };

    // Save HTML report
    const reportDir = 'lighthouse-reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportPath = path.join(reportDir, `${name.replace(/\s+/g, '-').toLowerCase()}.html`);
    fs.writeFileSync(reportPath, runnerResult.report);

    return { name, url, scores, reportPath };
  } finally {
    await chrome.kill();
  }
}

async function main() {
  console.log('🚀 Starting Lighthouse audits...\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const results = [];

  for (const page of PAGES) {
    console.log(`📊 Auditing: ${page.name} (${page.url})`);
    try {
      const result = await runLighthouse(`${BASE_URL}${page.url}`, page.name);
      results.push(result);
      console.log(`✅ ${page.name}:`);
      console.log(`   Performance: ${result.scores.performance}`);
      console.log(`   Accessibility: ${result.scores.accessibility}`);
      console.log(`   Best Practices: ${result.scores.bestPractices}`);
      console.log(`   SEO: ${result.scores.seo}`);
      console.log(`   Report: ${result.reportPath}\n`);
    } catch (error) {
      console.error(`❌ Failed to audit ${page.name}:`, error.message);
    }
  }

  // Summary
  console.log('\n📈 Summary:');
  console.log('─'.repeat(80));
  console.log('Page'.padEnd(25) + 'Perf'.padEnd(10) + 'A11y'.padEnd(10) + 'BP'.padEnd(10) + 'SEO');
  console.log('─'.repeat(80));

  let totalPerf = 0;
  let passCount = 0;

  results.forEach(result => {
    const perfScore = result.scores.performance;
    totalPerf += perfScore;
    if (perfScore >= 90) passCount++;

    const perfIcon = perfScore >= 90 ? '✅' : '⚠️';
    console.log(
      `${perfIcon} ${result.name.padEnd(23)}` +
      `${perfScore}`.padEnd(10) +
      `${result.scores.accessibility}`.padEnd(10) +
      `${result.scores.bestPractices}`.padEnd(10) +
      `${result.scores.seo}`
    );
  });

  console.log('─'.repeat(80));

  const avgPerf = Math.round(totalPerf / results.length);
  console.log(`\nAverage Performance Score: ${avgPerf}`);
  console.log(`Pages with Performance > 90: ${passCount}/${results.length}`);

  if (avgPerf >= 90) {
    console.log('\n🎉 SUCCESS: Performance target achieved! (>90)');
  } else {
    console.log('\n⚠️  WARNING: Performance target not met. Average score should be >90');
  }

  // Save JSON summary
  const summaryPath = 'lighthouse-reports/summary.json';
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Summary saved to: ${summaryPath}`);
}

main().catch(console.error);
