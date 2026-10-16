#!/usr/bin/env python3
"""Build small equirectangular dot-map textures from the visitor country data."""

import json
import math
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "_data" / "visitor-countries.geojson"
OUTPUT = ROOT / "assets" / "vendor" / "visitors"
WIDTH = 2048
HEIGHT = 1024
DOT_SPACING = 6
DOT_RADIUS = 2
PALETTES = {
    "light": ((207, 240, 253), (65, 112, 160)),
    "dark": ((20, 37, 52), (131, 184, 222)),
}


def unwrap_ring(ring):
    """Unwrap longitudes so antimeridian-crossing rings stay narrow."""
    result = []
    previous = ring[0][0]
    result.append((previous, ring[0][1]))
    for longitude, latitude in ring[1:-1]:
        while longitude - previous > 180:
            longitude -= 360
        while longitude - previous < -180:
            longitude += 360
        result.append((longitude, latitude))
        previous = longitude
    result.append(result[0])
    return result


def ring_bounds(ring):
    return (
        min(point[0] for point in ring),
        min(point[1] for point in ring),
        max(point[0] for point in ring),
        max(point[1] for point in ring),
    )


def point_in_ring(longitude, latitude, ring):
    inside = False
    previous = ring[-1]
    for current in ring:
        x1, y1 = previous
        x2, y2 = current
        if (y1 > latitude) != (y2 > latitude):
            crossing = (x2 - x1) * (latitude - y1) / (y2 - y1) + x1
            if longitude < crossing:
                inside = not inside
        previous = current
    return inside


def prepare_polygons(data):
    polygons = []
    for feature in data["features"]:
        code = feature["properties"]["code"]
        geometry = feature["geometry"]
        source_polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
        for source_polygon in source_polygons:
            outer = unwrap_ring(source_polygon[0])
            outer_bounds = ring_bounds(outer)
            outer_center = (outer_bounds[0] + outer_bounds[2]) / 2
            holes = []
            for source_hole in source_polygon[1:]:
                hole = unwrap_ring(source_hole)
                hole_bounds = ring_bounds(hole)
                hole_center = (hole_bounds[0] + hole_bounds[2]) / 2
                shift = round((outer_center - hole_center) / 360) * 360
                holes.append([(longitude + shift, latitude) for longitude, latitude in hole])
            polygons.append((code, outer, holes, outer_bounds))
    return polygons


def land_code(longitude, latitude, polygons):
    for code, outer, holes, bounds in polygons:
        west, south, east, north = bounds
        if not south <= latitude <= north:
            continue
        for shifted_longitude in (longitude - 360, longitude, longitude + 360):
            if west <= shifted_longitude <= east and point_in_ring(shifted_longitude, latitude, outer):
                if not any(point_in_ring(shifted_longitude, latitude, hole) for hole in holes):
                    return code
    return None


def draw_dot(pixels, x, y, color):
    for dy in range(-DOT_RADIUS, DOT_RADIUS + 1):
        for dx in range(-DOT_RADIUS, DOT_RADIUS + 1):
            if dx * dx + dy * dy > DOT_RADIUS * DOT_RADIUS:
                continue
            px, py = (x + dx) % WIDTH, y + dy
            if 0 <= py < HEIGHT:
                offset = (py * WIDTH + px) * 3
                pixels[offset : offset + 3] = bytes(color)


def png_chunk(kind, payload):
    content = kind + payload
    return struct.pack(">I", len(payload)) + content + struct.pack(">I", zlib.crc32(content) & 0xFFFFFFFF)


def save_png(path, pixels):
    scanlines = bytearray()
    stride = WIDTH * 3
    for y in range(HEIGHT):
        scanlines.append(0)
        scanlines.extend(pixels[y * stride : (y + 1) * stride])
    image = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", struct.pack(">2I5B", WIDTH, HEIGHT, 8, 2, 0, 0, 0))
        + png_chunk(b"IDAT", zlib.compress(scanlines, 9))
        + png_chunk(b"IEND", b"")
    )
    path.write_bytes(image)


def main():
    data = json.loads(SOURCE.read_text())
    polygons = prepare_polygons(data)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    rows = range(DOT_SPACING // 2, HEIGHT, DOT_SPACING)

    positions = []
    for row_index, y in enumerate(rows):
        latitude = 90 - (y / HEIGHT) * 180
        cosine = max(0.08, math.cos(math.radians(latitude)))
        longitude_spacing = DOT_SPACING / cosine
        count = max(1, round(WIDTH / longitude_spacing))
        offset = (row_index % 2) * 0.5
        for column in range(count):
            x = round((column + offset) * WIDTH / count) % WIDTH
            longitude = (x / WIDTH) * 360 - 180
            if land_code(longitude, latitude, polygons):
                positions.append((x, y))

    for theme, (ocean, land) in PALETTES.items():
        pixels = bytearray(ocean * (WIDTH * HEIGHT))
        for x, y in positions:
            draw_dot(pixels, x, y, land)
        save_png(OUTPUT / f"land-dots-{theme}.png", pixels)
        print(f"{theme}: {len(positions):,} land dots")


if __name__ == "__main__":
    main()
