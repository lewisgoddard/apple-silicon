(function () {
  "use strict";

  /* Specs where a lower number is better */
  var lowerIsBetter = ["Process (nm)", "Die Size (mm²)"];

  /* Series priority for default column ordering (lower = shown first) */
  var seriesOrder = {
    m: 0,
    a: 1,
    s: 2,
    c: 3,
    r: 4,
    t: 5,
    u: 6,
    w: 7,
    h: 8,
    n: 9,
  };
  var tierOrder = { ultra: 0, max: 1, pro: 2, x: 3, z: 4 }; /* base = 5 */

  /**
   * Parse a chip id (e.g. "m5-max-16-40", "a19-pro-6-6", "m4") into
   * { series, gen, tier } for ordering. Returns null if unrecognised.
   */
  function parseChipId(id) {
    if (!id) return null;
    var m = id.match(/^([a-z])(\d+)(?:-(ultra|max|pro|x|z))?(?:-(\d+)-(\d+))?/);
    if (!m) return null;
    return {
      series: seriesOrder[m[1]] !== undefined ? seriesOrder[m[1]] : 99,
      gen: parseInt(m[2], 10),
      tier: m[3] ? (tierOrder[m[3]] !== undefined ? tierOrder[m[3]] : 3) : 5,
      cpu: m[4] ? parseInt(m[4], 10) : 0,
      gpu: m[5] ? parseInt(m[5], 10) : 0,
    };
  }

  /**
   * Try to extract a numeric value from a table-cell string.
   * Returns null for empty, dash, or non-numeric content.
   * ISO dates (YYYY-MM-DD) are converted to a numeric timestamp.
   */
  function parseNumeric(text) {
    if (!text) return null;
    var t = text.trim();
    if (t === "" || t === "–" || t === "✓" || t === "✗") return null;
    /* ISO date: convert to timestamp so full date is compared, not just year. */
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      var ts = Date.parse(t);
      return isNaN(ts) ? null : ts;
    }
    var cleaned = t.replace(/,/g, "");
    var num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  /* ── Best / worst value highlighting ────────────────────────── */

  function highlightBestWorst(table) {
    table.querySelectorAll(".cell-best, .cell-worst").forEach(function (c) {
      c.classList.remove("cell-best", "cell-worst");
    });

    var rows = table.querySelectorAll("tbody tr");
    rows.forEach(function (row) {
      if (row.classList.contains("group-header")) return;

      var cells = row.querySelectorAll("td");
      if (cells.length < 3) return; // label + at least 2 chip columns

      var label = cells[0].textContent.trim();
      var reversed = lowerIsBetter.indexOf(label) !== -1;
      var entries = [];

      for (var i = 1; i < cells.length; i++) {
        var val = parseNumeric(cells[i].textContent);
        if (val !== null) entries.push({ cell: cells[i], value: val });
      }

      if (entries.length < 2) return;

      var vals = entries.map(function (e) {
        return e.value;
      });
      var unique = vals.filter(function (v, i, a) {
        return a.indexOf(v) === i;
      });
      if (unique.length < 2) return; // all values identical — nothing to highlight

      var best = reversed
        ? Math.min.apply(null, vals)
        : Math.max.apply(null, vals);
      var worst = reversed
        ? Math.max.apply(null, vals)
        : Math.min.apply(null, vals);

      entries.forEach(function (e) {
        if (e.value === best) {
          e.cell.classList.add("cell-best");
        } else if (e.value === worst) {
          e.cell.classList.add("cell-worst");
        }
      });
    });
  }

  /* ── Column sorting (reorder chip columns by a spec row) ───── */

  function sortColumnsByRow(table, sortRow, direction) {
    var refCells = Array.from(sortRow.querySelectorAll("td"));
    var colCount = refCells.length;
    if (colCount < 3) return;

    /* Build an index array for columns 1…n-1, then sort it. */
    var cols = [];
    for (var i = 1; i < colCount; i++) {
      cols.push({ pos: i, value: parseNumeric(refCells[i].textContent) });
    }

    cols.sort(function (a, b) {
      if (a.value !== null && b.value !== null) {
        return direction === "asc" ? a.value - b.value : b.value - a.value;
      }
      if (a.value === null && b.value === null) return 0;
      return a.value === null ? 1 : -1; // nulls to the end
    });

    /* Apply the new column order to every row (thead + tbody).
       appendChild on an existing child moves it to the end. */
    table.querySelectorAll("tr").forEach(function (row) {
      var rc = Array.from(row.children);
      if (rc.length < colCount) return; // skip colspan group-header rows
      cols.forEach(function (c) {
        row.appendChild(rc[c.pos]);
      });
    });

    /* Re-run highlighting since columns shifted. */
    highlightBestWorst(table);
  }

  /* ── Wire up a single table ────────────────────────────────── */

  function initTable(table) {
    highlightBestWorst(table);

    /* Need at least label + 2 chip columns to offer sorting. */
    var headerCells = table.querySelectorAll("thead th");
    if (headerCells.length < 3) return;

    var activeSortLabel = null;
    var sortDirection = "desc";

    table.querySelectorAll("tbody tr").forEach(function (row) {
      if (row.classList.contains("group-header")) return;

      var label = row.querySelector("td:first-child");
      if (!label) return;

      /* Only make a row sortable when it carries numeric data. */
      var cells = row.querySelectorAll("td");
      var hasNumeric = false;
      for (var i = 1; i < cells.length; i++) {
        if (parseNumeric(cells[i].textContent) !== null) {
          hasNumeric = true;
          break;
        }
      }
      if (!hasNumeric) return;

      label.classList.add("sortable-label");
      label.setAttribute("title", "Click to sort columns by this spec");

      label.addEventListener("click", function () {
        var text = label.textContent.trim();

        if (activeSortLabel === text) {
          sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
          activeSortLabel = text;
          /* Default to "best first": descending for most, ascending for lower-is-better. */
          sortDirection = lowerIsBetter.indexOf(text) !== -1 ? "asc" : "desc";
        }

        sortColumnsByRow(table, row, sortDirection);

        /* Visual indicator on the active sort row. */
        table.querySelectorAll(".sort-active").forEach(function (el) {
          el.classList.remove("sort-active", "sort-asc", "sort-desc");
        });
        label.classList.add("sort-active");
        label.classList.add(sortDirection === "asc" ? "sort-asc" : "sort-desc");
      });

      /* Default sort: by chip identity (series, gen descending, tier) on first load. */
      var headerCells = Array.from(table.querySelectorAll("thead th"));
      var chipCols = [];
      for (var ci = 1; ci < headerCells.length; ci++) {
        chipCols.push({
          pos: ci,
          parsed: parseChipId(headerCells[ci].getAttribute("data-chip-id")),
        });
      }
      if (
        chipCols.some(function (c) {
          return c.parsed !== null;
        })
      ) {
        var original = chipCols.map(function (c) {
          return c.pos;
        });
        chipCols.sort(function (a, b) {
          var pa = a.parsed || { series: 99, gen: 0, tier: 99 };
          var pb = b.parsed || { series: 99, gen: 0, tier: 99 };
          if (pa.series !== pb.series) return pa.series - pb.series;
          if (pa.gen !== pb.gen) return pb.gen - pa.gen; /* newest first */
          if (pa.tier !== pb.tier) return pa.tier - pb.tier;
          if (pa.cpu !== pb.cpu) return pb.cpu - pa.cpu; /* more CPU cores first */
          return pb.gpu - pa.gpu; /* more GPU cores first */
        });
        var alreadySorted = chipCols.every(function (c, i) {
          return c.pos === original[i];
        });
        if (!alreadySorted) {
          table.querySelectorAll("tr").forEach(function (row) {
            var rc = Array.from(row.children);
            if (rc.length < headerCells.length) return;
            chipCols.forEach(function (c) {
              row.appendChild(rc[c.pos]);
            });
          });
          highlightBestWorst(table);
        }
      }
    });
  }

  /* ── Bootstrap ─────────────────────────────────────────────── */

  document.querySelectorAll(".compare-table").forEach(initTable);

  /* Expose a hook so dynamically-rendered tables (compare.js) can
     call  window.initTableEnhancements(tableEl)  after inserting HTML. */
  window.initTableEnhancements = function (el) {
    if (el) initTable(el);
  };
})();
