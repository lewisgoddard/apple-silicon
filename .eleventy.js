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

export default function (eleventyConfig) {
	// Copy `assets/` to `_site/assets/`
  eleventyConfig.addPassthroughCopy("assets");

  eleventyConfig.addCollection("seriesCollection", function() {
    const series = loadYAML("series.yml");
    return series;
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

    function buildGroupedSpecs(specs, groupsDef) {
      return groupsDef.map(group => {
        const fields = group.fields
          .map(field => ({
            key: field.key,
            label: field.label,
            value: specs[field.key],
          }))
          .filter(f => f.value !== undefined && f.value !== null);
        return fields.length ? { name: group.name, fields } : null;
      }).filter(Boolean);
    }

    return [...chipsM, ...chipsA].map(enrichChip);
  });

  eleventyConfig.addCollection("devicesCollection", function() {
    const devices = loadYAML("devices.yml");
    return devices;
  });

  // Return chip objects for a list of chip ids. The repository stores chips
  // as top-level entries of arrays; this function finds matching chip
  // objects and returns them in the same order as `ids`.
  eleventyConfig.addNunjucksGlobal("getChips", function(ids, collections) {
    const chips = collections.chipsCollection || [];
    const found = [];

    // Debug output to help trace builds when getChips is invoked.
    try {
      const idsPreview = Array.isArray(ids) ? ids.join(",") : String(ids);
      console.log(`[getChips] called with ids=[${idsPreview}] (chips available=${chips.length})`);
    } catch (e) {
      // Avoid throwing during template rendering
    }

    (ids || []).forEach(id => {
      // Search through every chip entry for a matching id.
      // A chip file will have a list of top-level chip objects with an `id`.
      chips.forEach(chip => {
        if (chip.id === id) {
          found.push(chip);
          return;
        }
      });
    });

    try {
      const foundIds = found.map(c => c.id).join(",");
      console.log(`[getChips] returning ${found.length} chip(s): [${foundIds}]`);
    } catch (e) {
      // swallow errors from logging
    }

    return found;
  });

  eleventyConfig.addFilter("map", function(array, property) {
    return (array || []).map(item => item[property]);
  });

  // Return directory configuration so Eleventy processes files from `src/`
  return {
    dir: {
      input: "src",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
      output: "_site"
    }
  };
};