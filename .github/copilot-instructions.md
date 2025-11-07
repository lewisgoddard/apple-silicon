## Copilot instructions for this repo

This project is an Eleventy (11ty) static site using Nunjucks templates and YAML data. Prefer small, precise suggestions grounded in the structures below.

### Tech/context

- Static site generator: Eleventy 3.x (`@11ty/eleventy`)
- Templates: Nunjucks under `src/`
- Data: YAML under `src/_data/`
- Output: `_site/`
- Scripts: `npm run dev` (serve), `npm run build` (generate)

### Data contracts (authoritative)

- Field labels and ordering are defined in `src/_data/specs.yml` (groups → fields with `key` and `label`).
- Chips live in `src/_data/chips-*.yml` (one file per series, e.g., `chips-m.yml`, `chips-a.yml`).
- Every chip entry must include:
  - `id` (unique across all chip files)
  - `name`
  - `specs` (object keyed by the `key` values declared in `specs.yml`)
- Series live in `src/_data/series.yml` and reference chips by `id` under `ranks[*].variants`.
- Device categories live in `src/_data/devices.yml` and can optionally render comparisons if they include `ranks` with chip `variants`.

### Build-time behavior

- `.eleventy.js` loads YAML and creates three collections: `devicesCollection`, `seriesCollection`, `chipsCollection`.
- Each chip is enriched with `groupedSpecs` computed from `specs.yml`. Templates read from `groupedSpecs`—don’t recompute in templates.
- Global helper `getChips(ids, collections)` returns enriched chip objects for the given list of `id`s in order.

### Templates and helpers

- Comparison macro: `src/_includes/macros/compare-table.njk`
  - Import: `{% from "macros/compare-table.njk" import compareTable %}`
  - Usage: `{% set items = getChips(["m4-max-16-40"], collections) %} {{ compareTable(items) }}`
  - Renders fields based on `items[0].groupedSpecs` and aligns columns by index across items.
- Pages invoking comparisons:
  - Series: `src/series/series.njk`
  - Devices: `src/devices/devices.njk`
  - Example: `src/compare.njk`

### Specs conventions

- Use exact keys from `specs.yml`; missing values are omitted.
- Types:
  - Numbers for counts/sizes (e.g., `cpu_cores: 16`, `transistor_count_billion: 28`).
  - Booleans as YAML booleans (`true`/`false`).
  - Arrays for multiple values (e.g., `memory_options: [8, 16, 24, 32]`, `hardware_acceleration: ["H264", "HEVC"]`).
  - Strings for names/types (e.g., `memory_type: "LPDDR5X-8533"`).
- Units: encode values to match labels (e.g., GHz if label says “(GHz)”). Avoid conflicting inline comments.
- Display order is controlled solely by `specs.yml`.

### IDs and naming

- Chip `id` must be unique across all `chips-*.yml` files.
- Recommended id pattern: `<series><gen>[-tier][-cpu]-<gpu>` (lowercase, hyphens), e.g., `m4-max-16-40`, `a17-pro-12-24`.
- Keep `name` human-readable (e.g., `"M4 Pro"`).

### Chip ordering

Chips in `chips-*.yml` files should be ordered by:
1. **Generation** (newest to oldest)
2. **Tier** (Ultra → Max → Pro → base)
3. **GPU cores** (most to fewest within each tier)

Example M-series order: `m5-10-10`, `m4-max-16-40`, `m4-max-14-32`, `m4-pro-14-20`, `m4-pro-12-16`, `m4-10-10`, `m4-9-10`, `m4-8-8`, `m3-ultra-32-80`, `m3-ultra-28-60`, etc.

### Adding chips from Wikipedia

When adding chip data from Wikipedia's comparison tables:
1. **Locate the table**: Use the "Comparison of M-series processors" or "Comparison of A-series processors" table at https://en.wikipedia.org/wiki/Apple_silicon
2. **Extract specs systematically**:
   - CPU: cores (P+E breakdown), clock speeds (GHz)
   - GPU: vendor, cores, EUs, ALUs, frequency (MHz), TFLOPS, ray tracing support
   - NPU: cores, TOPS
   - Memory: type (e.g., "LPDDR5-6400"), bandwidth (GB/s), bus width (bits), channels, options (GB array)
   - Media engines: hardware acceleration array, video decode/encode counts, ProRes engines, AV1 decode
   - Semiconductor: process node (nm), transistor count (billion), die size (mm²)
   - Release date (YYYY-MM-DD format)
3. **Match keys to specs.yml**: Use exact keys from `specs.yml` (e.g., `performance_cores`, `gpu_tflops`, `memory_type`)
4. **Handle variants**: Create separate chip entries for each GPU/CPU configuration (e.g., M3 has 8-core and 10-core GPU variants)
5. **Order correctly**: Insert chips in the proper order (see "Chip ordering" above)

### Common tasks

- Add a chip variant:
  1. Append to the appropriate `chips-*.yml` with `id`, `name`, `specs` in the correct order (newest gen → highest tier → most GPU cores).
  2. Add the `id` to the correct series `ranks[*].variants` in `series.yml`.
  3. Build and verify the comparison table.
- Add a new field:
  1. Add to `specs.yml` with `key` + `label` in the right group.
  2. Populate `specs` for relevant chips. Missing values are fine.
  3. Tables update automatically via `groupedSpecs`.
- Add a new chip family file (e.g., `chips-s.yml`):
  1. Create `src/_data/chips-s.yml`.
  2. Update `.eleventy.js` to load it into `chipsCollection`.
  3. Add a series entry in `series.yml`.

### Do / Don’t

- Do:
  - Keep YAML valid and typed (numbers, booleans, arrays, strings).
  - Use `getChips` and the comparison macro instead of hardcoding tables.
  - Add fields to `specs.yml` rather than templates.
  - Ensure all `variants` reference existing chip `id`s.
- Don’t:
  - Reuse `id`s.
  - Add ad-hoc fields not declared in `specs.yml`.
  - Modify `groupedSpecs` in templates.

### Quick checks

- `npm run build` completes successfully.
- Logs from `getChips` don’t show missing IDs.
- Tables include the expected fields and align across items.

### Guidance for Copilot

- Propose concise, file-scoped changes (YAML entries or small Nunjucks edits).
- Respect existing patterns for IDs, specs keys, and macro usage.
- When introducing a new series, remember to include it in `.eleventy.js` so chips appear in `chipsCollection`.
