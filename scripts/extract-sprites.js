#!/usr/bin/env node
/**
 * Extract individual sprites from sprite sheets
 * Uses sharp for image processing
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const STARCRAFT_DIR = path.join(__dirname, '../frontend/public/assets/starcraft');
const CNC_DIR = path.join(__dirname, '../frontend/public/assets/cnc');

// StarCraft building positions (x, y, width, height) - need to be determined from sprite sheets
// These are estimates based on typical StarCraft sprite layouts
const SC_EXTRACTIONS = [
  {
    source: 'sc-command-center.png',
    output: 'command-center.png',
    // Command center is usually a single large sprite
    region: { left: 0, top: 0, width: 128, height: 100 }
  },
  {
    source: 'sc-supply-depot.png',
    output: 'supply-depot.png',
    region: { left: 0, top: 0, width: 64, height: 48 }
  },
  {
    source: 'sc-bunker.png',
    output: 'bunker.png',
    region: { left: 0, top: 0, width: 64, height: 48 }
  },
  {
    source: 'sc-refinery.png',
    output: 'refinery.png',
    region: { left: 0, top: 0, width: 96, height: 80 }
  }
];

// C&C extractions - similar process
const CNC_EXTRACTIONS = [
  {
    source: 'cnc-construction-yard.png',
    output: 'construction-yard.png',
    region: { left: 0, top: 0, width: 72, height: 48 }
  },
  {
    source: 'cnc-power-plant.png',
    output: 'power-plant.png',
    region: { left: 0, top: 0, width: 48, height: 48 }
  },
  {
    source: 'cnc-refinery.png',
    output: 'refinery.png',
    region: { left: 0, top: 0, width: 72, height: 48 }
  }
];

async function analyzeSprite(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    console.log(`${path.basename(filePath)}: ${metadata.width}x${metadata.height}`);
    return metadata;
  } catch (e) {
    console.error(`Error analyzing ${filePath}: ${e.message}`);
  }
}

async function extractRegion(sourceDir, source, output, region) {
  const sourcePath = path.join(sourceDir, source);
  const outputPath = path.join(sourceDir, 'extracted', output);
  
  // Ensure output dir exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  
  try {
    await sharp(sourcePath)
      .extract(region)
      .png()
      .toFile(outputPath);
    console.log(`  ✓ Extracted: ${output}`);
  } catch (e) {
    console.error(`  ✗ Failed to extract ${output}: ${e.message}`);
  }
}

async function main() {
  console.log('=== Sprite Sheet Analysis ===\n');
  
  // Analyze StarCraft sprites
  console.log('StarCraft sprites:');
  for (const file of fs.readdirSync(STARCRAFT_DIR)) {
    if (file.endsWith('.png')) {
      await analyzeSprite(path.join(STARCRAFT_DIR, file));
    }
  }
  
  console.log('\nC&C sprites:');
  for (const file of fs.readdirSync(CNC_DIR)) {
    if (file.endsWith('.png')) {
      await analyzeSprite(path.join(CNC_DIR, file));
    }
  }
  
  console.log('\n=== Sprite Extraction ===');
  console.log('(Manual region tuning needed - sprite sheets have varying layouts)\n');
  
  // For now, just show what files we have
  // Actual extraction needs manual coordinate determination
}

main();
