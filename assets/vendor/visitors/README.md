# Visitor globe assets

The globe runtime assets are served by this site and loaded on demand. The source
geometry lives under `_data/` and is not published as a site asset. There is no
npm asset build step or runtime CDN dependency.

- `globe.gl-2.46.2.min.js`: unmodified browser distribution from
  [globe.gl 2.46.2 on npm](https://www.npmjs.com/package/globe.gl/v/2.46.2),
  downloaded with `npm pack globe.gl@2.46.2`. MIT license in `LICENSE-globe.gl`;
  bundled upstream license notices remain in the distribution.
  SHA-256: `2c3e445c04d121215910a89688b96091c8a72071c122a4f830081a39b636c94c`.
- `_data/visitor-countries.geojson`: Simplified Natural Earth 1:50m country outlines, release v5.1.2, from
  [Natural Earth](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_50m_admin_0_countries.geojson).
  Geometry is lightly simplified with a 0.01-degree Ramer–Douglas–Peucker tolerance on
  each closed ring; rings that would collapse below four coordinates are kept
  unchanged. It contains 72,262 coordinates, down from 99,469. Properties are
  reduced to the ISO alpha-2 `code` from
  `ISO_A2_EH`, with `ISO_A2` fallback and `XK` for Kosovo. Features without a code
  are omitted. This source file lives in `_data/`, so Jekyll does not publish it as
  a page asset. Countries absent from the geometry remain in the statistics.
  [Natural Earth data is public domain](https://www.naturalearthdata.com/about/terms-of-use/).
  SHA-256: `ba9ce6df5e9fa90ab8f9e1e294437934457cc9cc4b4bc62053f3838d5c5f6c2e`.
- `land-dots-light.png` and `land-dots-dark.png`: 2048×1024 equirectangular globe
  textures generated from the country source by
  `python3 _scripts/build_visitor_globe_textures.py`. The textures use a 6-pixel
  equal-surface dot grid and contain 10,895 land dots each; they are 28 KB apiece.
  SHA-256: light `9fdfd488257d5805eebea03e556e0e0589023385c6ac2ac81be68453ac428ba8`,
  dark `8af57f0fbeaf55db137cf2ff1a1fc6b3e01abf4a9756b9f3f85b286ed678e158`.
  The globe texture loads when the globe is initialized. City markers come from the stats response
  and are rendered as red points on the globe.

When upgrading, use a fixed release, preserve license notices, update the version in
the include and browser tests, and record new checksums here.
