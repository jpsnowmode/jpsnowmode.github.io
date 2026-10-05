# Image size comparison

Recompressed in place. Filenames, pixel dimensions, and HTML `src` / `srcset` paths are unchanged, so existing `width` / `height` attributes still match. Alt text and photo credits were not edited.

Encoders: WebP via `cwebp` (`-q 80 -m 6 -sharp_yuv`), JPEG via mozjpeg (`-optimize -progressive`). Trail maps kept their original pixel size so small course labels stay readable in the lightbox. `*-sm.webp` thumbnails were left as-is (a q75 pass only saved about 5–10 KB each).

| File | Pixels | Before | After | Saved | Setting |
| --- | ---: | ---: | ---: | ---: | --- |
| `img/maps/naeba.webp` | 3224×3077 | 2,022,100 (1,975.7 KiB) | 1,377,068 (1,345.0 KiB) | 645,032 (31.9%) | WebP q80 |
| `img/maps/ishiuchi.webp` | 2481×1749 | 896,028 (874.1 KiB) | 637,084 (622.2 KiB) | 258,944 (28.9%) | WebP q80 |
| `img/maps/iwappara.jpg` | 1490×1025 | 647,825 (632.6 KiB) | 385,628 (376.6 KiB) | 262,197 (40.5%) | JPEG q82, 4:4:4 |
| `img/maps/nakazato.jpg` | 1600×994 | 438,352 (428.1 KiB) | 375,635 (366.8 KiB) | 62,717 (14.3%) | JPEG q82, 4:2:0 |
| `img/maps/kandatsu.jpg` | 1024×886 | 266,121 (259.9 KiB) | 231,691 (226.3 KiB) | 34,430 (12.9%) | JPEG q82, 4:2:0 |
| `img/hero-yuzawa.jpg` | 2400×1600 | 632,087 (617.3 KiB) | 530,976 (518.5 KiB) | 101,111 (16.0%) | JPEG q80, 4:2:0 |
| `img/hero.jpg` | 2400×1600 | 527,841 (515.5 KiB) | 465,248 (454.3 KiB) | 62,593 (11.9%) | JPEG q75, 4:2:0 |
| `img/band-powder.jpg` | 2200×1466 | 494,646 (483.1 KiB) | 305,682 (298.5 KiB) | 188,964 (38.2%) | JPEG q80, 4:2:0 |
| `img/band-niigata.jpg` | 2200×1238 | 326,632 (319.0 KiB) | 186,093 (181.7 KiB) | 140,539 (43.0%) | JPEG q80, 4:2:0 |
| `img/band-powder-m.jpg` | 1000×667 | 115,922 (113.2 KiB) | 75,140 (73.4 KiB) | 40,782 (35.2%) | JPEG q80, 4:2:0 |
| `img/band-niigata-m.jpg` | 1000×563 | 81,233 (79.3 KiB) | 52,180 (51.0 KiB) | 29,053 (35.8%) | JPEG q80, 4:2:0 |
| `img/band-forest-m.jpg` | 1000×668 | 185,645 (181.3 KiB) | 142,052 (138.7 KiB) | 43,593 (23.5%) | JPEG q82, 4:2:0 |
| `img/method.jpg` | 1400×933 | 195,952 (191.4 KiB) | 131,686 (128.6 KiB) | 64,266 (32.8%) | JPEG q80, 4:2:0 |
| `img/og-image.jpg` | 1200×630 | 141,468 (138.2 KiB) | 104,695 (102.2 KiB) | 36,773 (26.0%) | JPEG q85, 4:2:0 |
| **Changed files** | | **6,971,852 (6,808.4 KiB)** | **5,000,858 (4,884.6 KiB)** | **1,970,994 (1,924.8 KiB)** | |

**Total saved: 1,970,994 bytes (1.88 MiB / 1.97 MB).**

## Reviewed, left unchanged

| File | Pixels | Size | Why |
| --- | ---: | ---: | --- |
| `img/maps/gala.jpg` | 2280×1618 | 618,922 (604.4 KiB) | Already 4:4:4 and well packed. A quality-matched re-encode was larger. 4:2:0 softened the colored course lines. |
| `img/band-forest.jpg` | 2200×1469 | 428,429 (418.4 KiB) | Already smaller than a mozjpeg q80 re-encode. The 1000w `band-forest-m.jpg` sibling was the easy win. |
| `img/about.jpg` | 1200×800 | 138,382 (135.1 KiB) | A q80 re-encode was larger. |

## Notes

- `img/maps/iwappara.jpg` stayed 4:4:4 so thin red/blue course lines do not fringe.
- `img/hero.jpg` is the unused source of `img/about.jpg` (credited in the HTML comment). It was already near the q80 size floor, so it was encoded at q75, which is what actually reduced it.
- `img/og-image.jpg` uses q85 so the SNOWMODE wordmark stays crisp. Dimensions stay 1200×630 for the Open Graph tags.
- At a 1440×900 hero screenshot, mean absolute pixel difference vs the original was 0.49 (0.01% of pixels differed by more than 8). The Naeba lightbox fitted to 1440×1000 differed by 0.88 on average. The on-page Naeba thumbnail is unchanged.
