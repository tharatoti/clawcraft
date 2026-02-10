#!/usr/bin/env node
const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  const output = execSync('pass show spriters-resource.com', { encoding: 'utf-8' });
  const lines = output.trim().split('\n');
  const password = lines[0];
  const username = 'dextro';
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Login
  console.log('Logging in...');
  await page.goto('https://www.spriters-resource.com/user_login/', { waitUntil: 'networkidle2' });
  
  // Fill form
  await page.type('input[name="username"]', username);
  await page.type('input[name="password"]', password);
  
  // Take screenshot before submit
  await page.screenshot({ path: '/tmp/before-login.png' });
  
  // Click login button
  await page.evaluate(() => {
    const btn = document.querySelector('input[type="submit"], button[type="submit"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  
  // Take screenshot after login
  await page.screenshot({ path: '/tmp/after-login.png' });
  
  // Go to an asset page
  console.log('Going to asset page...');
  await page.goto('https://www.spriters-resource.com/pc_computer/starcraft/asset/30226/', { waitUntil: 'networkidle2' });
  
  await page.screenshot({ path: '/tmp/asset-page.png', fullPage: true });
  
  // Get page HTML
  const html = await page.content();
  fs.writeFileSync('/tmp/asset-page.html', html);
  
  // Find all image URLs
  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src,
      alt: img.alt,
      class: img.className
    }));
  });
  console.log('Images found:', JSON.stringify(images, null, 2));
  
  // Find download links
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).filter(a => 
      a.href.includes('download') || a.textContent.toLowerCase().includes('download')
    ).map(a => ({ href: a.href, text: a.textContent.trim() }));
  });
  console.log('Download links:', JSON.stringify(links, null, 2));
  
  await browser.close();
}

main();
