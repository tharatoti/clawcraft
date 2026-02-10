#!/usr/bin/env node
/**
 * Extract first visible sprite from each sheet
 * Finds first non-transparent content and extracts it
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const STARCRAFT_DIR = path.join(__dirname, '../frontend/public/assets/starcraft');
const CNC_DIR = path.join(__dirname, '../frontend/public/assets/cnc');

// Manually determined first-frame regions based on typical sprite layouts
// Format: { left, top, width, height }
const EXTRACTIONS = {
  starcraft: {
    'sc-command-center.png': { left: 0, top: 0, width: 128, height: 96, scale: 1.5 },
    'sc-supply-depot.png': { left: 0, top: 0, width: 80, height: 48, scale: 2 },
    'sc-bunker.png': { left: 0, top: 0, width: 74, height: 53, scale: 2 },
    'sc-refinery.png': { left: 0, top: 0, width: 113, height: 113, scale: 1.5 },
    'sc-barracks.png': { left: 0, top: 0, width: 115, height: 133, scale: 1.2 },
    'sc-factory.png': { left: 0, top: 0, width: 107, height: 120, scale: 1.5 },
    'sc-science-facility.png': { left: 0, top: 0, width: 147, height: 148, scale: 1 },
  },
  cnc: {
    'cnc-construction-yard.png': { left: 0, top: 0, width: 73, height: 49, scale: 2.5 },
    'cnc-power-plant.png': { left: 0, top: 0, width: 54, height: 38, scale: 3 },
    'cnc-refinery.png': { left: 0, top: 0, width: 73, height: 49, scale: 2.5 },
    'cnc-barracks.png': { left: 0, top: 0, width: 58, height: 44, scale: 2.5 },
    'cnc-war-factory.png': { left: 0, top: 0, width: 71, height: 52, scale: 2.5 },
  }
};

async function extractFrame(sourceDir, filename, region, outputDir) {
  const sourcePath = path.join(sourceDir, filename);
  const outputName = filename.replace('sc-', '').replace('cnc-', '');
  const outputPath = path.join(outputDir, outputName);
  
  if (!fs.existsSync(sourcePath)) {
    console.log(`  ✗ Source not found: ${filename}`);
    return;
  }
  
  try {
    const { left, top, width, height, scale } = region;
    
    let pipeline = sharp(sourcePath).extract({ left, top, width, height });
    
    // Scale up if needed
    if (scale && scale !== 1) {
      pipeline = pipeline.resize(Math.round(width * scale), Math.round(height * scale), {
        kernel: 'nearest' // Preserve pixel art
      });
    }
    
    await pipeline.png().toFile(outputPath);
    console.log(`  ✓ ${filename} → ${outputName} (${Math.round(width*scale)}x${Math.round(height*scale)})`);
  } catch (e) {
    console.error(`  ✗ Failed: ${filename} - ${e.message}`);
  }
}

async function main() {
  console.log('=== Extracting First Frames ===\n');
  
  // Create output directories
  const scOut = path.join(STARCRAFT_DIR, 'buildings');
  const cncOut = path.join(CNC_DIR, 'buildings');
  fs.mkdirSync(scOut, { recursive: true });
  fs.mkdirSync(cncOut, { recursive: true });
  
  console.log('StarCraft:');
  for (const [file, region] of Object.entries(EXTRACTIONS.starcraft)) {
    await extractFrame(STARCRAFT_DIR, file, region, scOut);
  }
  
  console.log('\nC&C Red Alert:');
  for (const [file, region] of Object.entries(EXTRACTIONS.cnc)) {
    await extractFrame(CNC_DIR, file, region, cncOut);
  }
  
  console.log('\n✓ Done! Check:');
  console.log(`  ${scOut}`);
  console.log(`  ${cncOut}`);
}

main();
