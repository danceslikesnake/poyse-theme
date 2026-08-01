# Lottie Animation → Shopify Integration — Handoff Notes

## Source file
`9-16.json` — a Lottie/Bodymovin animation exported from **Jitter** (`meta.g: "https://jitter.video"`).

- Canvas: 1080×1920 (vertical/story format)
- 60fps, 336 frames → ~5.6s duration
- 6 layers (2 precomps, 1 image layer, 2 null/transform layers)
- 156 asset entries, but only **11 are actual embedded images** (rest are precomp refs)
- Original file size: **8,035,953 bytes (~8MB)** — almost entirely base64-encoded PNGs (7.97MB of the 8MB), since Jitter inlines images as `data:image/png;base64,...` inside the `p` field of each asset.

## What was done
1. Decoded the 11 base64 PNGs and saved them individually to `lottie-images/`:
   `image_0.png` through `image_10.png` (473KB–984KB each, native resolution — not yet resized).
2. Rewrote the JSON so each image asset references an external file instead of embedding it:
   ```json
   { "h": 532, "id": "0", "p": "image_0.png", "u": "", "w": 469, "e": 0 }
   ```
   (`e: 0` = external, `u` left blank intentionally — see below.)
3. Saved as `9-16-external.json` — **81,836 bytes**, down from 8,035,953 bytes.

## Why `u` was left blank
`lottie-web`'s `loadAnimation()` accepts an `assetsPath` option that gets prepended to every asset's `u + p` at runtime:

```js
lottie.loadAnimation({
  container: document.getElementById('lottie-anim'),
  renderer: 'svg',
  loop: true,
  autoplay: true,
  path: '{{ "9-16-external.json" | asset_url }}',
  assetsPath: 'https://your-cdn-path/lottie-images/'
});
```

This means the JSON never needs to be re-edited when the image hosting location changes — just update `assetsPath` in the JS.

## Outstanding / next steps
- **Resize/compress the 11 PNGs** before upload (some are 900px+ wide; likely rendered smaller on screen). User is handling this manually.
- **Upload images** to Shopify (theme assets or Files) and point `assetsPath` at the resulting URL.
- **Add a Custom Liquid section** loading `lottie-web` from CDN (e.g. `https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js`) and initializing as above.
- **Optional: make specific images editable in the Shopify theme customizer.** Because `path` only accepts a static file, direct theme-editor image swapping isn't native. Workaround discussed:
  1. Fetch + `JSON.parse()` the animation JSON client-side instead of passing `path` directly.
  2. Add `image_picker` settings to the section's `{% schema %}`, one per swappable layer (mapped to a known asset `id`, e.g. `image_4` = "Layer 4 Photo").
  3. Before calling `loadAnimation`, walk the parsed JSON's `assets` array, find the matching `id`, and overwrite its `p`/`u` with the merchant-selected `image_url`.
  4. Call `lottie.loadAnimation({ animationData: parsedJson, ... })` instead of `path`.
  - Caveat: swapped images inherit the original layer's position/scale/mask/crop from the animation keyframes — only the picture changes, not the motion/composition. Only worth doing for layers that actually need merchant editing (not all 11).

## Files in this handoff
- `9-16-external.json` — rewritten animation file, ready to upload once `assetsPath` is finalized
- `lottie-images/image_0.png` … `image_10.png` — extracted source images, unresized
