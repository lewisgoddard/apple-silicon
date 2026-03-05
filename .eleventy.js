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
  return groupsDef.map((group) => {
    const fields = group.fields.map((field) => ({
      key: field.key,
      label: field.label,
      value:
        specs[field.key] !== undefined && specs[field.key] !== null
          ? specs[field.key]
          : null,
    }));
    return { name: group.name, fields };
  });
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

  // Allow YAML files in _data/ to be auto-loaded as global data
  eleventyConfig.addDataExtension("yml,yaml", (contents) =>
    yaml.load(contents),
  );

  // Helper: iterate all devices across both grouped and flat categories.
  // Yields { category, group (or null), device } for every device entry.
  function* iterateAllDevices(categories) {
    for (const category of categories || []) {
      if (category.groups) {
        for (const group of category.groups) {
          for (const device of group.devices || []) {
            yield { category, group, device };
          }
        }
      } else {
        for (const device of category.devices || []) {
          yield { category, group: null, device };
        }
      }
    }
  }

  // Build a device URL from its category/group/id context.
  function deviceUrl(categoryId, group, deviceId) {
    if (group) {
      return `/devices/${categoryId}/${group.id}/${deviceId}/`;
    }
    return `/devices/${categoryId}/${deviceId}/`;
  }

  eleventyConfig.addCollection("devicesCollection", function () {
    const devices = loadYAML("devices.yml");
    return devices;
  });

  // Flatten devices into individual entries for per-device page generation.
  // Handles both flat categories (e.g. Mac) and grouped categories (e.g. iPhone, iPad).
  // Flat:    /devices/mac/macbook-air-15/
  // Grouped: /devices/iphone/17/air/
  eleventyConfig.addCollection("devicePagesCollection", function () {
    const categories = loadYAML("devices.yml");
    const seriesList = loadYAML("series.yml");

    // Build an ordered list of generation ids (newest first) across all series
    const genOrder = [];
    (seriesList || []).forEach((s) => {
      (s.ranks || []).forEach((r) => {
        const gid = (r.id || "").match(/^([a-z]\d+)/)?.[1];
        if (gid && !genOrder.includes(gid)) genOrder.push(gid);
      });
    });

    function extractGenId(chipId) {
      const m = (chipId || "").match(/^([a-z]\d+)/);
      return m ? m[1] : chipId;
    }

    // Build a human-readable generation label, e.g. "m4" → "M4"
    function genLabel(genId) {
      return genId.replace(/^([a-z])/, (c) => c.toUpperCase());
    }

    const pages = [];
    for (const { category, group, device } of iterateAllDevices(categories)) {
      if (!device.name || !device.variants || !device.variants.length) continue;

      // Group variants by generation
      const genMap = {};
      (device.variants || []).forEach((chipId) => {
        const gid = extractGenId(chipId);
        if (!genMap[gid]) genMap[gid] = [];
        genMap[gid].push(chipId);
      });

      // Sort groups by genOrder (newest first); unknown gens go to end
      const generationGroups = Object.keys(genMap)
        .sort((a, b) => {
          const ai = genOrder.indexOf(a);
          const bi = genOrder.indexOf(b);
          return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
        })
        .map((gid, idx) => ({
          genId: gid,
          label: genLabel(gid),
          chipIds: genMap[gid],
          isCurrent: idx === 0,
        }));

      const entry = {
        ...device,
        categoryId: category.id,
        categoryName: category.name,
        generationGroups,
      };

      if (group) {
        entry.groupId = group.id;
        entry.groupName = group.name;
      }

      pages.push(entry);
    }
    return pages;
  });

  // Group-level pages for grouped categories (e.g. /devices/iphone/17/, /devices/ipad/pro/).
  // Each entry contains all devices in the group for comparison rendering.
  eleventyConfig.addCollection("deviceGroupPagesCollection", function () {
    const categories = loadYAML("devices.yml");
    const pages = [];
    for (const category of categories || []) {
      if (!category.groups) continue;
      for (const group of category.groups) {
        // Collect all variants from all devices in this group
        const allVariants = [];
        for (const device of group.devices || []) {
          for (const v of device.variants || []) {
            if (!allVariants.includes(v)) allVariants.push(v);
          }
        }
        pages.push({
          ...group,
          categoryId: category.id,
          categoryName: category.name,
          allVariants,
        });
      }
    }
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
    // Enrich rank pages with cross-generation and sibling links
    // Group by series, then by generation
    const ranksBySeriesGen = {};
    pages.forEach((p) => {
      const key = p.seriesId;
      if (!ranksBySeriesGen[key]) ranksBySeriesGen[key] = {};
      const genId = p.id.match(/^([a-z]\d+)/)?.[1] || p.id;
      if (!ranksBySeriesGen[key][genId]) ranksBySeriesGen[key][genId] = [];
      ranksBySeriesGen[key][genId].push(p);
    });

    // Extract tier slug from rank id (e.g. "m4-pro" → "pro", "m4" → "base")
    function rankTier(id) {
      const m = id.match(/^[a-z]\d+(?:-(.+))?$/);
      return m && m[1] ? m[1] : "base";
    }

    // Build ordered list of generations per series (newest first, matching series.yml order)
    const seriesGenOrder = {};
    (loadYAML("series.yml") || []).forEach((s) => {
      const seen = [];
      (s.ranks || []).forEach((r) => {
        const gid = r.id.match(/^([a-z]\d+)/)?.[1];
        if (gid && !seen.includes(gid)) seen.push(gid);
      });
      seriesGenOrder[s.id] = seen; // newest first
    });

    pages.forEach((p) => {
      const genId = p.id.match(/^([a-z]\d+)/)?.[1] || p.id;
      const tier = rankTier(p.id);
      const genOrder = seriesGenOrder[p.seriesId] || [];
      const genIdx = genOrder.indexOf(genId);

      // Siblings: other tiers in the same generation (base first, then pro, max, ultra)
      const siblings = (ranksBySeriesGen[p.seriesId]?.[genId] || [])
        .filter((s) => s.id !== p.id)
        .map((s) => ({
          id: s.id,
          name: s.name,
          url:
            "/chips/" +
            (s.id.match(/^([a-z]\d+)/)?.[1] || s.id) +
            "/" +
            rankTier(s.id) +
            "/",
        }));
      p.siblingTiers = siblings;

      // Previous generation equivalent tier (newer → older, so prev = genIdx+1)
      // Next generation equivalent tier (older → newer, so next = genIdx-1)
      p.prevGenTier = null;
      p.nextGenTier = null;

      if (genIdx >= 0) {
        // Older generation (index + 1)
        for (let i = genIdx + 1; i < genOrder.length; i++) {
          const olderGenId = genOrder[i];
          const match = (ranksBySeriesGen[p.seriesId]?.[olderGenId] || []).find(
            (r) => rankTier(r.id) === tier,
          );
          if (match) {
            p.prevGenTier = {
              id: match.id,
              name: match.name,
              url: "/chips/" + olderGenId + "/" + rankTier(match.id) + "/",
            };
            break;
          }
        }
        // Newer generation (index - 1)
        for (let i = genIdx - 1; i >= 0; i--) {
          const newerGenId = genOrder[i];
          const match = (ranksBySeriesGen[p.seriesId]?.[newerGenId] || []).find(
            (r) => rankTier(r.id) === tier,
          );
          if (match) {
            p.nextGenTier = {
              id: match.id,
              name: match.name,
              url: "/chips/" + newerGenId + "/" + rankTier(match.id) + "/",
            };
            break;
          }
        }
      }
    });

    return pages;
  });

  eleventyConfig.addCollection("chipsCollection", function () {
    const chipsM = loadYAML("chips-m.yml");
    const chipsA = loadYAML("chips-a.yml");
    const chipsS = loadYAML("chips-s.yml");
    const chipsR = loadYAML("chips-r.yml");
    const chipsT = loadYAML("chips-t.yml");
    const chipsC = loadYAML("chips-c.yml");
    const chipsU = loadYAML("chips-u.yml");
    const chipsW = loadYAML("chips-w.yml");
    const chipsH = loadYAML("chips-h.yml");
    const chipsN = loadYAML("chips-n.yml");

    const specDefs = loadYAML("specs.yml");
    const categories = loadYAML("devices.yml");
    const seriesListForChips = loadYAML("series.yml");

    const genOrderForChips = [];
    (seriesListForChips || []).forEach((s) => {
      (s.ranks || []).forEach((r) => {
        const gid = (r.id || "").match(/^([a-z]\d+)/)?.[1];
        if (gid && !genOrderForChips.includes(gid)) genOrderForChips.push(gid);
      });
    });

    const chipDeviceMap = {};
    for (const { category, group, device } of iterateAllDevices(categories)) {
      const isDeprecated = !!(device.deprecated || (group && group.deprecated));
      (device.variants || []).forEach((chipId) => {
        if (!chipDeviceMap[chipId]) chipDeviceMap[chipId] = [];
        chipDeviceMap[chipId].push({
          id: device.id,
          name: device.name,
          categoryId: category.id,
          categoryName: category.name,
          groupId: group ? group.id : null,
          groupName: group ? group.name : null,
          url: deviceUrl(category.id, group, device.id),
          deprecated: isDeprecated,
        });
      });
    }

    // Build per-device set of current chip IDs (latest gen per tier)
    const deviceCurrentMapForChips = {};
    for (const { category, group, device } of iterateAllDevices(categories)) {
      const key = category.id + "/" + (group ? group.id + "/" : "") + device.id;
      deviceCurrentMapForChips[key] = new Set(
        currentGenPrimaryChips(device.variants || [], genOrderForChips),
      );
    }

    function enrichChip(chip) {
      chip.groupedSpecs = buildGroupedSpecs(chip.specs || {}, specDefs.groups);
      chip.devices = (chipDeviceMap[chip.id] || []).filter((d) => {
        if (d.deprecated) return false;
        const key =
          d.categoryId + "/" + (d.groupId ? d.groupId + "/" : "") + d.id;
        return (
          deviceCurrentMapForChips[key] &&
          deviceCurrentMapForChips[key].has(chip.id)
        );
      });
      return chip;
    }

    return [
      ...chipsM,
      ...chipsA,
      ...chipsS,
      ...chipsR,
      ...chipsT,
      ...chipsC,
      ...chipsU,
      ...chipsW,
      ...chipsH,
      ...chipsN,
    ].map(enrichChip);
  });

  // Individual chip variant pages, e.g. /chips/m4/pro/14-20/
  // Each chip is enriched with the list of devices that use it.
  eleventyConfig.addCollection("chipPagesCollection", function () {
    const chipsM = loadYAML("chips-m.yml");
    const chipsA = loadYAML("chips-a.yml");
    const chipsS = loadYAML("chips-s.yml");
    const chipsR = loadYAML("chips-r.yml");
    const chipsT = loadYAML("chips-t.yml");
    const chipsC = loadYAML("chips-c.yml");
    const chipsU = loadYAML("chips-u.yml");
    const chipsW = loadYAML("chips-w.yml");
    const chipsH = loadYAML("chips-h.yml");
    const chipsN = loadYAML("chips-n.yml");
    const specDefs = loadYAML("specs.yml");
    const categories = loadYAML("devices.yml");
    const seriesList = loadYAML("series.yml");
    const allChips = [
      ...chipsM,
      ...chipsA,
      ...chipsS,
      ...chipsR,
      ...chipsT,
      ...chipsC,
      ...chipsU,
      ...chipsW,
      ...chipsH,
      ...chipsN,
    ];

    // Pre-build chip→devices lookup (handles both flat and grouped categories)
    const chipDeviceMap = {};
    for (const { category, group, device } of iterateAllDevices(categories)) {
      const isDeprecated = !!(device.deprecated || (group && group.deprecated));
      (device.variants || []).forEach((chipId) => {
        if (!chipDeviceMap[chipId]) chipDeviceMap[chipId] = [];
        chipDeviceMap[chipId].push({
          id: device.id,
          name: device.name,
          categoryId: category.id,
          categoryName: category.name,
          groupId: group ? group.id : null,
          groupName: group ? group.name : null,
          url: deviceUrl(category.id, group, device.id),
          deprecated: isDeprecated,
        });
      });
    }

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

    const genOrderForPages = [];
    (seriesList || []).forEach((s) => {
      (s.ranks || []).forEach((r) => {
        const gid = (r.id || "").match(/^([a-z]\d+)/)?.[1];
        if (gid && !genOrderForPages.includes(gid)) genOrderForPages.push(gid);
      });
    });

    // Build per-device set of current chip IDs (latest gen per tier)
    const deviceCurrentMapForPages = {};
    for (const { category, group, device } of iterateAllDevices(categories)) {
      const key = category.id + "/" + (group ? group.id + "/" : "") + device.id;
      deviceCurrentMapForPages[key] = new Set(
        currentGenPrimaryChips(device.variants || [], genOrderForPages),
      );
    }

    return allChips.map((chip) => ({
      ...chip,
      groupedSpecs: buildGroupedSpecs(chip.specs || {}, specDefs.groups),
      devices: (chipDeviceMap[chip.id] || []).filter((d) => {
        if (d.deprecated) return false;
        const key =
          d.categoryId + "/" + (d.groupId ? d.groupId + "/" : "") + d.id;
        return (
          deviceCurrentMapForPages[key] &&
          deviceCurrentMapForPages[key].has(chip.id)
        );
      }),
      rank: chipRankMap[chip.id] || null,
    }));
  });

  // Build per-generation comparison pages (e.g. "M4 Family" with M4, M4 Pro,
  // M4 Max columns, each merging variant specs into ranges).
  eleventyConfig.addCollection("generationPagesCollection", function () {
    const seriesList = loadYAML("series.yml");
    const chipsM = loadYAML("chips-m.yml");
    const chipsA = loadYAML("chips-a.yml");
    const chipsS = loadYAML("chips-s.yml");
    const chipsR = loadYAML("chips-r.yml");
    const chipsT = loadYAML("chips-t.yml");
    const chipsC = loadYAML("chips-c.yml");
    const chipsU = loadYAML("chips-u.yml");
    const chipsW = loadYAML("chips-w.yml");
    const chipsH = loadYAML("chips-h.yml");
    const chipsN = loadYAML("chips-n.yml");
    const allChips = [
      ...chipsM,
      ...chipsA,
      ...chipsS,
      ...chipsR,
      ...chipsT,
      ...chipsC,
      ...chipsU,
      ...chipsW,
      ...chipsH,
      ...chipsN,
    ];
    const specDefs = loadYAML("specs.yml");
    const genCategories = loadYAML("devices.yml");

    const genChipDeviceMap = {};
    for (const { category, group, device } of iterateAllDevices(
      genCategories,
    )) {
      if (device.deprecated) continue;
      (device.variants || []).forEach((chipId) => {
        if (!genChipDeviceMap[chipId]) genChipDeviceMap[chipId] = [];
        genChipDeviceMap[chipId].push({
          id: device.id,
          name: device.name,
          categoryId: category.id,
          categoryName: category.name,
          groupId: group ? group.id : null,
          groupName: group ? group.name : null,
          url: deviceUrl(category.id, group, device.id),
        });
      });
    }

    const genOrderForGen = [];
    (seriesList || []).forEach((s) => {
      (s.ranks || []).forEach((r) => {
        const gid = (r.id || "").match(/^([a-z]\d+)/)?.[1];
        if (gid && !genOrderForGen.includes(gid)) genOrderForGen.push(gid);
      });
    });

    // Build per-device set of current chip IDs (latest gen per tier)
    const deviceCurrentMapForGen = {};
    for (const { category, group, device } of iterateAllDevices(
      genCategories,
    )) {
      const key = category.id + "/" + (group ? group.id + "/" : "") + device.id;
      deviceCurrentMapForGen[key] = new Set(
        currentGenPrimaryChips(device.variants || [], genOrderForGen),
      );
    }

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
            const merged = mergeChipSpecs(
              chipObjects.map((c) => c.specs || {}),
            );
            const tierDevices = [];
            const seenUrls = new Set();
            tier.variants.forEach((chipId) => {
              (genChipDeviceMap[chipId] || []).forEach((d) => {
                if (!seenUrls.has(d.url)) {
                  const key =
                    d.categoryId +
                    "/" +
                    (d.groupId ? d.groupId + "/" : "") +
                    d.id;
                  if (
                    deviceCurrentMapForGen[key] &&
                    deviceCurrentMapForGen[key].has(chipId)
                  ) {
                    seenUrls.add(d.url);
                    tierDevices.push(d);
                  }
                }
              });
            });
            return {
              id: tier.id,
              name: tier.name,
              specs: merged,
              groupedSpecs: buildGroupedSpecs(merged, specDefs.groups),
              devices: tierDevices,
            };
          });

        if (mergedChips.length === 0) return;

        // Derive a readable generation name from the first tier
        const genName =
          gen.tiers[0]?.name?.match(/^(M\d+|A\d+)/i)?.[0] ||
          gen.id.toUpperCase();

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

    // Enrich generation pages with prev/next links
    // Group pages by series, then link sequentially
    const gensBySeries = {};
    pages.forEach((p) => {
      if (!gensBySeries[p.seriesId]) gensBySeries[p.seriesId] = [];
      gensBySeries[p.seriesId].push(p);
    });
    // Pages are already in series.yml order (newest first)
    Object.values(gensBySeries).forEach((gens) => {
      gens.forEach((g, i) => {
        g.prevGen =
          i + 1 < gens.length
            ? {
                name: gens[i + 1].name,
                url: "/chips/" + gens[i + 1].id + "/",
              }
            : null;
        g.nextGen =
          i - 1 >= 0
            ? { name: gens[i - 1].name, url: "/chips/" + gens[i - 1].id + "/" }
            : null;
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
  // Handles both flat and grouped category structures.
  eleventyConfig.addNunjucksGlobal("getDevicesForChips", function (ids) {
    const categories = loadYAML("devices.yml");
    const seen = new Set();
    const devices = [];
    for (const { category, group, device } of iterateAllDevices(categories)) {
      const key = category.id + "/" + (group ? group.id + "/" : "") + device.id;
      if (seen.has(key)) continue;
      const hasMatch = (device.variants || []).some((v) =>
        (ids || []).includes(v),
      );
      if (hasMatch) {
        seen.add(key);
        devices.push({
          id: device.id,
          name: device.name,
          categoryId: category.id,
          categoryName: category.name,
          groupId: group ? group.id : null,
          groupName: group ? group.name : null,
          url: deviceUrl(category.id, group, device.id),
        });
      }
    }
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

  // Three-tier chip classification for device pages:
  //   Primary:   A + M + S (main SoCs — shown in group tables, device top, cards)
  //   Secondary: H (promoted to primary when no A/M/S present, otherwise tertiary)
  //   Tertiary:  R + U + W + T + N + C (companion silicon — device page only)
  //
  // primaryChips: returns the "main" chips for tables / cards / headings.
  // When referenceIds is provided the tier check uses that list instead,
  // keeping per-generation-group filtering consistent with the full device.
  eleventyConfig.addFilter("primaryChips", function (ids, referenceIds) {
    if (!ids || !ids.length) return ids;
    const ref = referenceIds || ids;
    const hasPrimary = ref.some((id) => /^[ams]\d/.test(id));
    if (hasPrimary) return ids.filter((id) => /^[ams]\d/.test(id));
    const hasSecondary = ref.some((id) => /^h\d/.test(id));
    if (hasSecondary) return ids.filter((id) => /^h\d/.test(id));
    return ids;
  });

  // companionChips: returns non-primary chips (tertiary + demoted secondary)
  // for the "Companion Silicon" section on individual device pages.
  eleventyConfig.addFilter("companionChips", function (ids, referenceIds) {
    if (!ids || !ids.length) return [];
    const ref = referenceIds || ids;
    const hasPrimary = ref.some((id) => /^[ams]\d/.test(id));
    if (hasPrimary) return ids.filter((id) => !/^[ams]\d/.test(id));
    const hasSecondary = ref.some((id) => /^h\d/.test(id));
    if (hasSecondary) return ids.filter((id) => !/^h\d/.test(id));
    return [];
  });

  // groupCompanionsBySeries: takes a list of companion chip IDs and returns
  // an array of { seriesId, seriesName, seriesDescription, chipIds } objects
  // ordered by the series.yml definition order.
  eleventyConfig.addNunjucksGlobal("groupCompanionsBySeries", function (ids) {
    if (!ids || !ids.length) return [];
    const seriesList = loadYAML("series.yml") || [];
    const groups = [];
    const used = new Set();
    for (const series of seriesList) {
      const matching = ids.filter((id) => {
        const prefix = (id.match(/^([a-z]+)/) || [])[1];
        return prefix && prefix === series.id.toLowerCase();
      });
      if (matching.length > 0) {
        groups.push({
          seriesId: series.id,
          seriesName: series.name,
          seriesDescription: series.description,
          chipIds: matching,
        });
        matching.forEach((id) => used.add(id));
      }
    }
    // Catch any chips that didn't match a series
    const remainder = ids.filter((id) => !used.has(id));
    if (remainder.length) {
      groups.push({
        seriesId: "other",
        seriesName: "Other",
        seriesDescription: "",
        chipIds: remainder,
      });
    }
    return groups;
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
    const match = (chipId || "").match(
      /^[a-z]\d+(?:-(ultra|max|pro|x|z))?-\d+-\d+$/,
    );
    if (!match) return "base";
    return match[1] || "base";
  });

  // Extract variant suffix from a chip id, e.g. "m4-pro-14-20" → "14-20", "m1-8-8" → "8-8"
  eleventyConfig.addFilter("chipVariant", function (chipId) {
    const match = (chipId || "").match(/(\d+-\d+)$/);
    return match ? match[1] : chipId;
  });

  // Shared helper: given a list of chip IDs, returns only the primary chips
  // (M/A/S, falling back to H) from the single newest generation present.
  // This is used by getCurrentChips and getCurrentDevices so that devices
  // whose variants list spans multiple historical generations (e.g. iMac,
  // MacBook Air) only contribute their current-gen chips.
  function currentGenPrimaryChips(variants, genOrder) {
    if (!variants || !variants.length) return [];

    function extractGenId(id) {
      const m = (id || "").match(/^([a-z]\d+)/);
      return m ? m[1] : id;
    }

    function extractTier(id) {
      const m = (id || "").match(/^[a-z]\d+-(ultra|max|pro)-/);
      return m ? m[1] : "base";
    }

    // Isolate primary SoCs (same tier logic as the primaryChips filter)
    const hasPrimary = variants.some((id) => /^[ams]\d/.test(id));
    let primary;
    if (hasPrimary) {
      primary = variants.filter((id) => /^[ams]\d/.test(id));
    } else {
      const hasH = variants.some((id) => /^h\d/.test(id));
      primary = hasH ? variants.filter((id) => /^h\d/.test(id)) : variants;
    }
    if (!primary.length) return [];

    // For each tier (ultra/max/pro/base), find the newest generation present.
    // This handles devices like Mac Studio that ship M4 Max + M3 Ultra simultaneously.
    const tierLatestGen = {};
    for (const id of primary) {
      const tier = extractTier(id);
      const genId = extractGenId(id);
      const existing = tierLatestGen[tier];
      if (!existing) {
        tierLatestGen[tier] = genId;
      } else {
        const ai = genOrder.indexOf(genId);
        const bi = genOrder.indexOf(existing);
        if ((ai === -1 ? 9999 : ai) < (bi === -1 ? 9999 : bi)) {
          tierLatestGen[tier] = genId;
        }
      }
    }

    // Return chips that are from the newest generation for their tier
    return primary.filter(
      (id) => extractGenId(id) === tierLatestGen[extractTier(id)],
    );
  }

  // Return deduplicated primary chip IDs from all non-deprecated devices in a
  // given category. For Mac (section-based), pass the section id ("laptop" or
  // "desktop") as the second argument.  For grouped categories (iPad, iPhone,
  // Watch, AirPods) the second argument filters by group id; omit it to include
  // all non-deprecated groups.
  // Only the newest generation of chips within each device is included, so
  // historical variants stored in devices.yml do not appear.
  eleventyConfig.addNunjucksGlobal(
    "getCurrentChips",
    function (categoryId, sectionId) {
      const categories = loadYAML("devices.yml");
      const seriesList = loadYAML("series.yml");
      const category = (categories || []).find((c) => c.id === categoryId);
      if (!category) return [];

      const genOrder = [];
      (seriesList || []).forEach((s) => {
        (s.ranks || []).forEach((r) => {
          const gid = (r.id || "").match(/^([a-z]\d+)/)?.[1];
          if (gid && !genOrder.includes(gid)) genOrder.push(gid);
        });
      });

      const seen = new Set();
      const chipIds = [];

      function addChips(variants) {
        currentGenPrimaryChips(variants, genOrder).forEach((id) => {
          if (!seen.has(id)) {
            seen.add(id);
            chipIds.push(id);
          }
        });
      }

      if (category.groups) {
        for (const group of category.groups || []) {
          if (group.deprecated) continue;
          if (sectionId && group.id !== sectionId) continue;
          for (const device of group.devices || []) {
            if (device.deprecated) continue;
            addChips(device.variants);
          }
        }
      } else {
        for (const device of category.devices || []) {
          if (device.deprecated) continue;
          if (sectionId && device.section !== sectionId) continue;
          addChips(device.variants);
        }
      }

      return chipIds;
    },
  );

  // Return non-deprecated device objects (with URLs) for a given category and
  // optional section/group filter. Intended for the device-grid macro on
  // /current/* pages. The variants field is trimmed to current-gen primary
  // chips only, matching the behaviour of getCurrentChips.
  eleventyConfig.addNunjucksGlobal(
    "getCurrentDevices",
    function (categoryId, sectionId) {
      const categories = loadYAML("devices.yml");
      const seriesList = loadYAML("series.yml");
      const category = (categories || []).find((c) => c.id === categoryId);
      if (!category) return [];

      const genOrder = [];
      (seriesList || []).forEach((s) => {
        (s.ranks || []).forEach((r) => {
          const gid = (r.id || "").match(/^([a-z]\d+)/)?.[1];
          if (gid && !genOrder.includes(gid)) genOrder.push(gid);
        });
      });

      const devices = [];

      if (category.groups) {
        for (const group of category.groups || []) {
          if (group.deprecated) continue;
          if (sectionId && group.id !== sectionId) continue;
          for (const device of group.devices || []) {
            if (device.deprecated) continue;
            devices.push({
              id: device.id,
              name: device.name,
              variants: currentGenPrimaryChips(device.variants, genOrder),
              categoryId: category.id,
              categoryName: category.name,
              groupId: group.id,
              groupName: group.name,
              url: deviceUrl(category.id, group, device.id),
            });
          }
        }
      } else {
        for (const device of category.devices || []) {
          if (device.deprecated) continue;
          if (sectionId && device.section !== sectionId) continue;
          devices.push({
            id: device.id,
            name: device.name,
            variants: currentGenPrimaryChips(device.variants, genOrder),
            categoryId: category.id,
            categoryName: category.name,
            groupId: null,
            groupName: null,
            url: deviceUrl(category.id, null, device.id),
          });
        }
      }

      return devices;
    },
  );

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
