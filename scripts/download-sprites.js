#!/usr/bin/env node
/**
 * Sprite Downloader for Spriters Resource
 * Downloads sprite sheets via direct media URLs
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get credentials from pass
function getCredentials() {
  try {
    const output = execSync('pass show spriters-resource.com', { encoding: 'utf-8' });
    const lines = output.trim().split('\n');
    const password = lines[0];
    const username = lines.find(l => l.startsWith('Username:'))?.split(':')[1]?.trim() || 'dextro';
    return { username, password };
  } catch (e) {
    console.error('Failed to get credentials from pass:', e.message);
    process.exit(1);
  }
}

// Asset definitions
const ASSETS = {
  starcraft: {
    dir: path.join(__dirname, '../frontend/public/assets/starcraft'),
    items: [
      { id: '60063', name: 'sc-terran-buildings' },
      { id: '30226', name: 'sc-command-center' },
      { id: '30227', name: 'sc-barracks' },
      { id: '59989', name: 'sc-factory' },
      { id: '31461', name: 'sc-supply-depot' },
      { id: '31462', name: 'sc-refinery' },
      { id: '19026', name: 'sc-bunker' },
      { id: '60021', name: 'sc-science-facility' },
    ],
    baseUrl: 'https://www.spriters-resource.com/pc_computer/starcraft/asset/'
  },
  cnc: {
    dir: path.join(__dirname, '../frontend/public/assets/cnc'),
    items: [
      { id: '141535', name: 'cnc-construction-yard' },
      { id: '141461', name: 'cnc-barracks' },
      { id: '141452', name: 'cnc-war-factory' },
      { id: '142047', name: 'cnc-power-plant' },
      { id: '141534', name: 'cnc-refinery' },
    ],
    baseUrl: 'https://www.spriters-resource.com/ms_dos/commandconquerredalert/asset/'
  }
};

async function downloadAsset(page, baseUrl, assetId, outputPath) {
  const url = `${baseUrl}${assetId}/`;
  console.log(`  Fetching: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Find the download link - look for link with "download" text
    const downloadUrl = await page.evaluate(() => {
      // Find link that contains "download" text
      const links = Array.from(document.querySelectorAll('a'));
      for (const link of links) {
        if (link.textContent.toLowerCase().includes('download') && 
            link.href.includes('/media/assets/')) {
          return link.href;
        }
      }
      
      // Fallback: find any image URL from media/assets
      const imgs = Array.from(document.querySelectorAll('img'));
      for (const img of imgs) {
        if (img.src.includes('/media/assets/')) {
          return img.src;
        }
      }
      
      return null;
    });
    
    if (!downloadUrl) {
      console.log(`  ✗ Could not find download URL for asset ${assetId}`);
      return false;
    }
    
    console.log(`  Downloading: ${downloadUrl}`);
    
    // Download the image
    const response = await page.goto(downloadUrl, { timeout: 30000 });
    const buffer = await response.buffer();
    fs.writeFileSync(outputPath, buffer);
    console.log(`  ✓ Saved: ${outputPath}`);
    return true;
    
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('=== Spriters Resource Downloader ===\n');
  
  const creds = getCredentials();
  console.log(`Using account: ${creds.username}\n`);
  
  // Ensure output directories exist
  for (const [name, config] of Object.entries(ASSETS)) {
    fs.mkdirSync(config.dir, { recursive: true });
  }
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    // Login
    console.log('Logging in...');
    await page.goto('https://www.spriters-resource.com/user_login/', { waitUntil: 'networkidle2' });
    
    await page.type('input[name="username"]', creds.username);
    await page.type('input[name="password"]', creds.password);
    
    // Click submit
    await page.evaluate(() => {
      const btn = document.querySelector('input[type="submit"], button[type="submit"]');
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 3000));
    console.log('✓ Login submitted\n');
    
    let successCount = 0;
    let failCount = 0;
    
    // Download StarCraft assets
    console.log('Downloading StarCraft Terran assets...');
    for (const asset of ASSETS.starcraft.items) {
      const outputPath = path.join(ASSETS.starcraft.dir, `${asset.name}.png`);
      if (fs.existsSync(outputPath)) {
        console.log(`  Skipping ${asset.name} (already exists)`);
        successCount++;
        continue;
      }
      const success = await downloadAsset(page, ASSETS.starcraft.baseUrl, asset.id, outputPath);
      if (success) successCount++;
      else failCount++;
      await new Promise(r => setTimeout(r, 1500)); // Rate limit
    }
    
    // Download C&C assets
    console.log('\nDownloading C&C Red Alert assets...');
    for (const asset of ASSETS.cnc.items) {
      const outputPath = path.join(ASSETS.cnc.dir, `${asset.name}.png`);
      if (fs.existsSync(outputPath)) {
        console.log(`  Skipping ${asset.name} (already exists)`);
        successCount++;
        continue;
      }
      const success = await downloadAsset(page, ASSETS.cnc.baseUrl, asset.id, outputPath);
      if (success) successCount++;
      else failCount++;
      await new Promise(r => setTimeout(r, 1500)); // Rate limit
    }
    
    console.log(`\n=== Complete: ${successCount} succeeded, ${failCount} failed ===`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

main();
