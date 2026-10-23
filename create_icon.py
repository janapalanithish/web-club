#!/usr/bin/env python3
"""Convert SVG to PNG using svglib and reportlab."""

from svglib.svglib import svg2rlg
from reportlab.graphics import renderPM
import sys

def main():
    svg_path = '/Users/nithishkumar/web-club/src/assets/logo.svg'
    png_path = '/Users/nithishkumar/web-club/assets/icon.png'

    print(f"Converting {svg_path} to {png_path}...")

    # Convert SVG to reportlab drawing
    drawing = svg2rlg(svg_path)
    if drawing is None:
        print("Error: Failed to parse SVG")
        sys.exit(1)

    # Render as PNG
    renderPM.drawToFile(drawing, png_path, "PNG")

    print(f"Successfully created {png_path}")

    # Also check file size
    import os
    size = os.path.getsize(png_path)
    print(f"File size: {size} bytes")

    if size == 0:
        print("ERROR: File is empty")
        sys.exit(1)

if __name__ == "__main__":
    main()