import fs from "fs";
import path from "path";
import yaml from "js-yaml";

function loadYAML(filename) {
  try {
    const filepath = path.join(process.cwd(), "src", "_data", filename);
    const file = fs.readFileSync(filepath, "utf8");
    return yaml.load(file);
  } catch (e) {
    console.error("Error loading YAML:", filename, e);
    return [];
  }
}

function buildGroupedSpecs(specs, groupsDef) {
  return groupsDef
    .map((group) => {
      const fields = group.fields
        .map((field) => ({
          key: field.key,
          label: field.label,
          value: specs[field.key],
        }))
        .filter((f) => f.value !== undefined && f.value !== null);
      return fields.length ? { name: group.name, fields } : null;
    })
    .filter(Boolean);
}

// Merge specs from multiple chip variants into a single object.
// Numbers that vary become "min – max", arrays are unioned, etc.
function mergeChipSpecs(specsArray) {
  const allKeys = new Set();
  specsArray.forEach((s) => Object.keys(s).forEach((k) => allKeys.add(k)));

  const merged = {};
  allKeys.forEach((key) => {
    const values = specsArray
      .map((s) => s[key])
      .filter((v) => v !== undefined && v !== null);
    if (values.length === 0) return;

    // All identical → keep as-is
    if (values.every((v) => JSON.stringify(v) === JSON.stringify(values[0]))) {
      merged[key] = values[0];
      return;
    }

    if (values.every((v) => typeof v === "number")) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      merged[key] = `${min} – ${max}`;
    } else if (values.every((v) => Array.isArray(v))) {
      merged[key] = [...new Set(values.flat())];
    } else {
      const unique = [...new Set(values.map(String))];
      merged[key] = unique.join(" / ");
    }
  });
  return merged;
}

export default function (eleventyConfig) {
  // Copy `assets/` to `_site/assets/`
  eleventyConfig.addPassthroughCopy("assets");

  eleventyConfig.addCollection("devicesCollection", function () {
    const devices = loadYAML("devices.yml");
    return devices;
  });

  // Flatten devices into individual entries for per-device page generation.
  // Each entry gets its parent category id so the URL can be nested, e.g.
  // /devices/mac/macbook-air-15/
  eleventyConfig.addCollection("devicePagesCollection", function () {
    const categories = loadYAML("devices.yml");
    const pages = [];
    (categories || []).forEach((category) => {
      (category.devices || []).forEach((device) => {
        if (device.name && device.variants && device.variants.length > 0) {
          pages.push({
            ...device,
            categoryId: category.id,
            categoryName: category.name,
          });
        }
      });
    });
    return pages;
  });

  eleventyConfig.addCollection("seriesCollection", function () {
    const series = loadYAML("series.yml");
    return series;
  });

  // Flatten series ranks into individual entries for per-rank page generation.
  // Each entry gets its parent series id so the URL can be nested, e.g.
  // /series/m/m4-pro/
  eleventyConfig.addCollection("rankPagesCollection", function () {
    const seriesList = loadYAML("series.yml");
    const pages = [];
    (seriesList || []).forEach((series) => {
      (series.ranks || []).forEach((rank) => {
        if (rank.name && rank.variants && rank.variants.length > 0) {
          pages.push({
            ...rank,
            seriesId: series.id,
            seriesName: series.name,
          });
        }
      });
    });
    return pages;
  });

  eleventyConfig.addCollection("chipsCollection", function () {
    const chipsM = loadYAML("chips-m.yml");
    const chipsA = loadYAML("chips-a.yml");
    // const chipsS = loadYAML("chips-s.yml");
    // const chipsR = loadYAML("chips-r.yml");

    const specDefs = loadYAML("specs.yml");

    function enrichChip(chip) {
      chip.groupedSpecs = buildGroupedSpecs(chip.specs || {}, specDefs.groups);
      return chip;
    }

    return [...chipsM, ...chipsA].map(enrichChip);
  });

  // Individual chip variant pages, e.g. /chips/m4/pro/14-20/
  // Each chip is enriched with the list of devices that use it.
  eleventyConfig.addCollection("chipPagesCollection", function () {
    const chipsM = loadYAML("chips-m.yml");
    const chipsA = loadYAML("chips-a.yml");
    const specDefs = loadYAML("specs.yml");
    const categories = loadYAML("devices.yml");
    const seriesList = loadYAML("series.yml");
    const allChips = [...chipsM, ...chipsA];

    // Pre-build chip→devices lookup
    const chipDeviceMap = {};
    (categories || []).forEach((category) => {
      (category.devices || []).forEach((device) => {
        (device.variants || []).forEach((chipId) => {
          if (!chipDeviceMap[chipId]) chipDeviceMap[chipId] = [];
          chipDeviceMap[chipId].push({
            id: device.id,
            name: device.name,
            categoryId: category.id,
            categoryName: category.name,
          });
        });
      });
    });

    // Find the rank (tier) info for each chip so we can link back
    const chipRankMap = {};
    (seriesList || []).forEach((series) => {
      (series.ranks || []).forEach((rank) => {
        (rank.variants || []).forEach((chipId) => {
          chipRankMap[chipId] = {
            rankId: rank.id,
            rankName: rank.name,
            seriesId: series.id,
          };
        });
      });
    });

    return allChips.map((chip) => ({
      ...chip,
      groupedSpecs: buildGroupedSpecs(chip.specs || {}, specDefs.groups),
      devices: chipDeviceMap[chip.id] || [],
      rank: chipRankMap[chip.id] || null,
    }));
  });

  // Build per-generation comparison pages (e.g. "M4 Family" with M4, M4 Pro,
  // M4 Max columns, each merging variant specs into ranges).
  eleventyConfig.addCollection("generationPagesCollection", function () {
    const seriesList = loadYAML("series.yml");
    const chipsM = loadYAML("chips-m.yml");
    const chipsA = loadYAML("chips-a.yml");
    const allChips = [...chipsM, ...chipsA];
    const specDefs = loadYAML("specs.yml");

    const pages = [];
    (seriesList || []).forEach((series) => {
      // Group ranks by generation prefix, e.g. "m4-pro" → "m4"
      const genMap = {};
      (series.ranks || []).forEach((rank) => {
        const match = rank.id.match(/^([a-z]\d+)/);
        if (!match) return;
        const genId = match[1];
        if (!genMap[genId]) {
          genMap[genId] = { id: genId, tiers: [] };
        }
        genMap[genId].tiers.push(rank);
      });

      Object.values(genMap).forEach((gen) => {
        // Create one merged-chip column per tier
        const mergedChips = gen.tiers
          .filter((t) => t.variants && t.variants.length > 0)
          .map((tier) => {
            const chipObjects = tier.variants
              .map((id) => allChips.find((c) => c.id === id))
              .filter(Boolean);
            const merged = mergeChipSpecs(chipObjects.map((c) => c.specs || {}));
            return {
              id: tier.id,
              name: tier.name,
              specs: merged,
              groupedSpecs: buildGroupedSpecs(merged, specDefs.groups),
            };
          });

        if (mergedChips.length === 0) return;

        // Derive a readable generation name from the first tier
        const genName =
          gen.tiers[0]?.name?.match(/^(M\d+|A\d+)/i)?.[0] || gen.id.toUpperCase();

        pages.push({
          id: gen.id,
          name: `${genName} Family`,
          seriesId: series.id,
          seriesName: series.name,
          mergedChips,
          allVariants: gen.tiers.flatMap((t) => t.variants || []),
        });
      });
    });
    return pages;
  });

  // Return chip objects for a list of chip ids. The repository stores chips
  // as top-level entries of arrays; this function finds matching chip
  // objects and returns them in the same order as `ids`.
  eleventyConfig.addNunjucksGlobal("getChips", function (ids, collections) {
    const chips = collections.chipsCollection || [];
    const found = [];

    // Debug output to help trace builds when getChips is invoked.
    try {
      const idsPreview = Array.isArray(ids) ? ids.join(",") : String(ids);
      console.log(
        `[getChips] called with ids=[${idsPreview}] (chips available=${chips.length})`,
      );
    } catch (e) {
      // Avoid throwing during template rendering
    }

    (ids || []).forEach((id) => {
      // Search through every chip entry for a matching id.
      // A chip file will have a list of top-level chip objects with an `id`.
      chips.forEach((chip) => {
        if (chip.id === id) {
          found.push(chip);
          return;
        }
      });
    });

    try {
      const foundIds = found.map((c) => c.id).join(",");
      console.log(
        `[getChips] returning ${found.length} chip(s): [${foundIds}]`,
      );
    } catch (e) {
      // swallow errors from logging
    }

    return found;
  });

  // Return de-duplicated list of devices for a list of chip ids.
  // Used by rank and generation pages to show the device carousel.
  eleventyConfig.addNunjucksGlobal("getDevicesForChips", function (ids) {
    const categories = loadYAML("devices.yml");
    const seen = new Set();
    const devices = [];
    (categories || []).forEach((category) => {
      (category.devices || []).forEach((device) => {
        if (seen.has(device.id)) return;
        const hasMatch = (device.variants || []).some((v) => (ids || []).includes(v));
        if (hasMatch) {
          seen.add(device.id);
          devices.push({
            id: device.id,
            name: device.name,
            categoryId: category.id,
            categoryName: category.name,
          });
        }
      });
    });
    return devices;
  });

  // Return a human-readable chip range string for a list of chip ids.
  // E.g. ["m4-10-10","m3-8-10","m2-8-10"] → "M2 – M4"
  eleventyConfig.addNunjucksGlobal("getChipRange", function (ids, collections) {
    const chips = collections.chipsCollection || [];
    const uniqueNames = [];
    (ids || []).forEach((id) => {
      const chip = chips.find((c) => c.id === id);
      if (chip && !uniqueNames.includes(chip.name)) {
        uniqueNames.push(chip.name);
      }
    });
    if (uniqueNames.length === 0) return "";
    if (uniqueNames.length === 1) return uniqueNames[0];
    // First entry is newest/highest, last is oldest/lowest.
    // Display as "oldest – newest".
    return `${uniqueNames[uniqueNames.length - 1]} – ${uniqueNames[0]}`;
  });

  eleventyConfig.addFilter("map", function (array, property) {
    return (array || []).map((item) => item[property]);
  });

  // Extract generation prefix from a rank id, e.g. "m4-pro" → "m4", "m4" → "m4"
  eleventyConfig.addFilter("genId", function (rankId) {
    const match = (rankId || "").match(/^([a-z]\d+)/);
    return match ? match[1] : rankId;
  });

  // Extract tier slug from a rank id, e.g. "m1-pro" → "pro", "m1" → "base"
  eleventyConfig.addFilter("tierSlug", function (rankId) {
    const match = (rankId || "").match(/^[a-z]\d+-(.+)$/);
    return match ? match[1] : "base";
  });

  // Extract tier from a chip id, e.g. "m4-pro-14-20" → "pro", "m1-8-8" → "base"
  eleventyConfig.addFilter("chipTier", function (chipId) {
    const match = (chipId || "").match(/^[a-z]\d+(?:-(ultra|max|pro))?-\d+-\d+$/);
    if (!match) return "base";
    return match[1] || "base";
  });

  // Extract variant suffix from a chip id, e.g. "m4-pro-14-20" → "14-20", "m1-8-8" → "8-8"
  eleventyConfig.addFilter("chipVariant", function (chipId) {
    const match = (chipId || "").match(/(\d+-\d+)$/);
    return match ? match[1] : chipId;
  });

  // Return directory configuration so Eleventy processes files from `src/`
  return {
    dir: {
      input: "src",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
      output: "_site",
    },
  };
}
