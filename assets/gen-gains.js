/* Generational Gains – Shared chart factory
   Sources: Geekbench 6 (browser.geekbench.com), published specs, Apple claims.
*/

/* eslint-disable no-var */
/* exported genGains */
var genGains = (function () {
  "use strict";

  /* ── colour palette (matches site CSS vars) ── */
  var blue = "#0071e3";
  var orange = "#ff6b00";
  var textColor =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "#f5f5f7"
      : "#1d1d1f";
  var mutedColor =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "#a1a1a6"
      : "#6e6e73";
  var gridColor =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "rgba(255,255,255,.08)"
      : "rgba(0,0,0,.06)";

  /* ── helpers ── */
  function pctGain(cur, prev) {
    if (prev == null || cur == null) return null;
    return Math.round(((cur - prev) / prev) * 100);
  }

  function gainLabels(values) {
    return values.map(function (v, i) {
      if (i === 0 || v == null || values[i - 1] == null) return "";
      var g = pctGain(v, values[i - 1]);
      if (g === 0) return "—";
      return (g > 0 ? "+" : "") + g + "%";
    });
  }

  /* ── dimmed colour helpers ── */
  function dimColor(hex, alpha) {
    if (hex.startsWith("#")) {
      var r = parseInt(hex.slice(1, 3), 16);
      var g = parseInt(hex.slice(3, 5), 16);
      var b = parseInt(hex.slice(5, 7), 16);
      return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
    }
    return hex;
  }

  /* ── chart factory ── */
  function createChart(canvasId, data, opts) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;

    var values = data.values;
    var gains = gainLabels(values);
    var barColor = opts.color || blue;
    var lastIdx = values.length - 1;
    var defaultSubtitle = opts.subtitle || "";

    /* Find the last non-null value index for cumulative gain calc */
    var newestIdx = lastIdx;
    while (newestIdx >= 0 && values[newestIdx] == null) newestIdx--;

    /* State for click-to-compare */
    var selectedIdx = -1;

    function bgForIndex(i) {
      if (selectedIdx < 0) return barColor;
      if (i === selectedIdx || i === newestIdx) return barColor;
      return dimColor(barColor, 0.25);
    }

    function buildBgArray() {
      return values.map(function (_, i) {
        return bgForIndex(i);
      });
    }

    var chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [
          {
            data: values,
            backgroundColor: buildBgArray(),
            borderColor: barColor,
            borderWidth: 0,
            borderRadius: 4,
            maxBarThickness: 56,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.4,
        layout: { padding: { top: 28 } },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: opts.title,
            color: textColor,
            font: { size: 14, weight: "600" },
            padding: { bottom: 4 },
          },
          subtitle: {
            display: true,
            text: defaultSubtitle,
            color: mutedColor,
            font: { size: 11 },
            padding: { bottom: 8 },
          },
          tooltip: {
            callbacks: {
              afterLabel: function (ttCtx) {
                var g = gains[ttCtx.dataIndex];
                var parts = [];
                if (g) parts.push("Gen-over-gen: " + g);
                if (
                  ttCtx.dataIndex < newestIdx &&
                  values[ttCtx.dataIndex] != null
                ) {
                  var cum = pctGain(values[newestIdx], values[ttCtx.dataIndex]);
                  if (cum !== null)
                    parts.push(
                      "→ " +
                        data.labels[newestIdx] +
                        ": " +
                        (cum > 0 ? "+" : "") +
                        cum +
                        "%",
                    );
                }
                return parts.length ? parts.join("\n") : "";
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { display: false },
          },
          y: {
            beginAtZero: opts.beginAtZero !== false,
            ticks: {
              color: mutedColor,
              callback: function (v) {
                if (opts.unit) return v.toLocaleString() + " " + opts.unit;
                return v.toLocaleString();
              },
            },
            grid: { color: gridColor },
          },
        },
        onClick: function (_evt, elements) {
          if (!elements.length) {
            /* Click on empty area → reset */
            selectedIdx = -1;
            chart.options.plugins.subtitle.text = defaultSubtitle;
            chart.options.plugins.subtitle.color = mutedColor;
            chart.data.datasets[0].backgroundColor = buildBgArray();
            chart.update();
            return;
          }
          var idx = elements[0].index;
          if (idx === newestIdx || values[idx] == null) {
            /* Clicking newest or null → reset */
            selectedIdx = -1;
            chart.options.plugins.subtitle.text = defaultSubtitle;
            chart.options.plugins.subtitle.color = mutedColor;
          } else {
            selectedIdx = idx;
            var cum = pctGain(values[newestIdx], values[idx]);
            var arrow =
              data.labels[idx] +
              " → " +
              data.labels[newestIdx] +
              ": " +
              (cum > 0 ? "+" : "") +
              cum +
              "%";
            chart.options.plugins.subtitle.text = arrow;
            chart.options.plugins.subtitle.color = textColor;
          }
          chart.data.datasets[0].backgroundColor = buildBgArray();
          chart.update();
        },
      },
      plugins: [
        {
          id: "gainLabels",
          afterDatasetsDraw: function (ch) {
            var meta = ch.getDatasetMeta(0);
            var ctx2 = ch.ctx;
            ctx2.save();
            ctx2.font = "500 11px -apple-system, sans-serif";
            ctx2.textAlign = "center";
            meta.data.forEach(function (bar, i) {
              if (selectedIdx >= 0) {
                /* When a bar is selected, show cumulative gain on
                   the newest bar instead of gen-over-gen labels */
                if (i === newestIdx && values[selectedIdx] != null) {
                  var cum = pctGain(values[newestIdx], values[selectedIdx]);
                  if (cum !== null) {
                    ctx2.fillStyle = textColor;
                    ctx2.font = "700 12px -apple-system, sans-serif";
                    ctx2.fillText(
                      (cum > 0 ? "+" : "") + cum + "%",
                      bar.x,
                      bar.y - 6,
                    );
                  }
                  ctx2.restore();
                  ctx2.save();
                  ctx2.font = "500 11px -apple-system, sans-serif";
                  ctx2.textAlign = "center";
                  return;
                }
                /* Dim labels on non-selected bars */
                if (i !== selectedIdx) return;
              }
              var label = gains[i];
              if (!label) return;
              ctx2.fillStyle = mutedColor;
              ctx2.fillText(label, bar.x, bar.y - 6);
            });
            ctx2.restore();
          },
        },
      ],
    });

    return chart;
  }

  /* ── public API ── */
  return {
    blue: blue,
    orange: orange,
    createChart: createChart,
  };
})();
