#!/usr/bin/env node
const puppeteer = require('puppeteer');
const path = require('path');

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const outputDir = '/tmp/clawcraft-screenshots';
  require('fs').mkdirSync(outputDir, { recursive: true });
  
  console.log('Loading ClawCraft...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  
  // Screenshot default (Orange Sci-Fi)
  await page.screenshot({ path: `${outputDir}/theme-orange-scifi.png` });
  console.log('✓ Orange Sci-Fi theme');
  
  // Switch to C&C (key 2)
  await page.keyboard.press('2');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: `${outputDir}/theme-cnc.png` });
  console.log('✓ C&C Red Alert theme');
  
  // Switch to StarCraft (key 3)
  await page.keyboard.press('3');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: `${outputDir}/theme-starcraft.png` });
  console.log('✓ StarCraft Terran theme');
  
  await browser.close();
  console.log(`\nScreenshots saved to ${outputDir}`);
}

main().catch(console.error);
