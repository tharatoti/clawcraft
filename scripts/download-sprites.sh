#!/bin/bash
# Download StarCraft and C&C sprites from Spriters Resource
# Requires login cookies from browser session

STARCRAFT_DIR="/home/tharatoti/clawcraft/frontend/public/assets/starcraft"
CNC_DIR="/home/tharatoti/clawcraft/frontend/public/assets/cnc"

# Cookie file from browser
COOKIE_FILE="/home/tharatoti/.openclaw/browser/openclaw/user-data/Default/Cookies"

# StarCraft Terran building assets
SC_ASSETS=(
  "60063:sc-terran-buildings"    # Terran Buildings
  "30226:sc-barracks"            # Barracks
  "30227:sc-factory"             # Factory
  "31461:sc-supply-depot"        # Supply Depot
  "31462:sc-refinery"            # Refinery  
  "19026:sc-bunker"              # Bunker
)

# C&C Red Alert assets
CNC_ASSETS=(
  "141535:cnc-construction-yard"  # Construction Yard
  "141461:cnc-barracks"           # Barracks
  "141452:cnc-war-factory"        # War Factory
  "142047:cnc-power-plant"        # Power Plant
  "141534:cnc-refinery"           # Refinery
)

echo "=== Sprite Download Script ==="
echo "This script needs to be run manually with a logged-in browser session"
echo ""
echo "StarCraft assets to download:"
for asset in "${SC_ASSETS[@]}"; do
  id="${asset%%:*}"
  name="${asset##*:}"
  echo "  https://www.spriters-resource.com/pc_computer/starcraft/asset/$id/"
  echo "    -> $STARCRAFT_DIR/$name.png"
done

echo ""
echo "C&C Red Alert assets to download:"
for asset in "${CNC_ASSETS[@]}"; do
  id="${asset%%:*}"
  name="${asset##*:}"
  echo "  https://www.spriters-resource.com/ms_dos/commandconquerredalert/asset/$id/"
  echo "    -> $CNC_DIR/$name.png"
done

echo ""
echo "Manual steps:"
echo "1. Open each URL in browser (already logged in)"
echo "2. Click 'Download' button on the sheet"
echo "3. Save to the specified path"
