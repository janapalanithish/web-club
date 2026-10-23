#!/usr/bin/env python3
"""Generate Android launcher icons from the Web Club logo at various densities."""

import os
from PIL import Image

# Source logo
SOURCE = '/Users/nithishkumar/web-club/assets/icon.png'

# Android mipmap density sizes (in pixels)
DENSITIES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

BASE_DIR = '/Users/nithishkumar/web-club/android/app/src/main/res'

def main():
    src = Image.open(SOURCE)
    print(f"Source image size: {src.size}, mode: {src.mode}")

    for mipmap_dir, size in DENSITIES.items():
        mipmap_path = os.path.join(BASE_DIR, mipmap_dir)
        if not os.path.exists(mipmap_path):
            print(f"WARNING: {mipmap_path} does not exist, skipping")
            continue

        # Resize the icon
        resized = src.resize((size, size), Image.LANCZOS)

        # Save as ic_launcher.png
        launcher_path = os.path.join(mipmap_path, 'ic_launcher.png')
        resized.save(launcher_path, 'PNG')
        print(f"Created {launcher_path} ({size}x{size}) - {os.path.getsize(launcher_path)} bytes")

        # Save as ic_launcher_round.png (same size, square)
        round_path = os.path.join(mipmap_path, 'ic_launcher_round.png')
        resized.save(round_path, 'PNG')
        print(f"Created {round_path} ({size}x{size}) - {os.path.getsize(round_path)} bytes")

    print("\nAll Android launcher icons generated successfully!")

if __name__ == "__main__":
    main()
