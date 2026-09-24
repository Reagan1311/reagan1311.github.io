# Visitor globe assets

These files are served by this site and loaded only when its visitor globe opens.
There is no npm asset build step and no runtime CDN dependency.

- `globe.gl-2.46.2.min.js`: unmodified browser distribution from
  [globe.gl 2.46.2 on npm](https://www.npmjs.com/package/globe.gl/v/2.46.2),
  downloaded with `npm pack globe.gl@2.46.2`. MIT license in `LICENSE-globe.gl`;
  bundled upstream license notices remain in the distribution.
  SHA-256: `2c3e445c04d121215910a89688b96091c8a72071c122a4f830081a39b636c94c`.
- `countries.geojson`: Natural Earth 1:50m country outlines, release v5.1.2, from
  [Natural Earth](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_50m_admin_0_countries.geojson).
  Geometry is unchanged; properties are reduced to the ISO alpha-2 `code` from
  `ISO_A2_EH`, with `ISO_A2` fallback and `XK` for Kosovo. Features without a code
  are omitted. Countries absent from the geometry remain in the statistics.
  [Natural Earth data is public domain](https://www.naturalearthdata.com/about/terms-of-use/).
  SHA-256: `7f3706b7ee373010dc86915e3f3d34505fc184959a833bfe15856bb41eccbc6a`.

When upgrading, use a fixed release, preserve license notices, update the version in
the include and browser tests, and record new checksums here.
