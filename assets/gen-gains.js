/* Generational Gains – Chart rendering
   Data is self-contained here (not from main YAML datasets).
   Sources: Geekbench 6 (browser.geekbench.com), published specs, Apple claims.
*/

(function () {
  "use strict";

  /* ── colour palette (matches site CSS vars) ── */
  const blue = "#0071e3";
  const blueFaded = "rgba(0,113,227,.15)";
  const orange = "#ff6b00";
  const orangeFaded = "rgba(255,107,0,.15)";
  const textColor =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "#f5f5f7"
      : "#1d1d1f";
  const mutedColor =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "#a1a1a6"
      : "#6e6e73";
  const gridColor =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "rgba(255,255,255,.08)"
      : "rgba(0,0,0,.06)";

  /* ── M-series data (base chip per generation) ── */
  const M = {
    labels: ["M1", "M2", "M3", "M4", "M5"],
    year: [2020, 2022, 2023, 2024, 2025],
    process: ["5 nm", "5 nm", "3 nm", "3 nm", "3 nm"],
    /* Geekbench 6 Single-Core (Mac mini / MacBook Pro base) */
    singleCore: [2350, 2620, 3050, 3750, 4225],
    /* Geekbench 6 Multi-Core */
    multiCore: [8400, 9800, 12100, 14600, 16800],
    /* SC score ÷ 15 W (MacBook Air thermal envelope) */
    efficiency: [157, 175, 203, 250, 282],
    /* Die area mm² (published / estimated for M5) */
    dieSize: [119, 149, 92, 103, 105],
    /* Geekbench 6 Metal GPU compute */
    gpuRaster: [28000, 30500, 40100, 47800, 56000],
    /* Ray tracing relative score (M3 = 100, M1/M2 had no HW RT) */
    gpuRT: [null, null, 100, 200, 290],
    /* Neural Engine TOPS */
    neural: [11, 15.8, 18, 38, 61],
    /* Memory bandwidth GB/s */
    memBW: [68.3, 100, 100, 120, 153.6],
  };

  /* ── A-series data (flagship Pro chip per generation) ── */
  const A = {
    labels: ["A14", "A15", "A16", "A17 Pro", "A18 Pro", "A19 Pro"],
    year: [2020, 2021, 2022, 2023, 2024, 2025],
    process: ["5 nm", "5 nm", "4 nm", "3 nm", "3 nm", "3 nm"],
    /* Geekbench 6 Single-Core */
    singleCore: [2124, 2303, 2630, 2972, 3570, 3992],
    /* Geekbench 6 Multi-Core */
    multiCore: [4871, 5725, 6744, 7397, 8923, 10688],
    /* SC score ÷ 5 W (iPhone thermal budget) */
    efficiency: [425, 461, 526, 594, 714, 798],
    /* Die area mm² */
    dieSize: [88, 108, 114, 103, 105, 110],
    /* Geekbench 6 Metal GPU compute */
    gpuRaster: [10300, 13200, 15500, 20000, 26000, 33000],
    /* Ray tracing relative (A17 Pro = 100, earlier had no HW RT) */
    gpuRT: [null, null, null, 100, 130, 175],
    /* Neural Engine TOPS */
    neural: [11, 15.8, 17, 35, 35, 38],
    /* Memory bandwidth GB/s */
    memBW: [34.1, 34.1, 34.1, 34.1, 60, 60],
  };

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

  /* ── chart factory ── */
  function createChart(canvasId, data, opts) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;

    var values = data.values;
    var gains = gainLabels(values);
    var barColor = opts.color || blue;
    var barBg = opts.colorFaded || blueFaded;

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [
          {
            data: values,
            backgroundColor: barColor,
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
            display: !!opts.subtitle,
            text: opts.subtitle || "",
            color: mutedColor,
            font: { size: 11 },
            padding: { bottom: 8 },
          },
          tooltip: {
            callbacks: {
              afterLabel: function (ctx) {
                var g = gains[ctx.dataIndex];
                return g ? "Gen-over-gen: " + g : "";
              },
            },
          },
          datalabels: {
            display: true,
            anchor: "end",
            align: "end",
            color: mutedColor,
            font: { size: 11, weight: "500" },
            formatter: function (_v, ctx) {
              return gains[ctx.dataIndex];
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
      },
      plugins: [
        {
          /* inline datalabels fallback (no plugin needed) */
          id: "gainLabels",
          afterDatasetsDraw: function (chart) {
            var meta = chart.getDatasetMeta(0);
            var ctx2 = chart.ctx;
            ctx2.save();
            ctx2.font = "500 11px -apple-system, sans-serif";
            ctx2.fillStyle = mutedColor;
            ctx2.textAlign = "center";
            meta.data.forEach(function (bar, i) {
              var label = gains[i];
              if (!label) return;
              ctx2.fillText(label, bar.x, bar.y - 6);
            });
            ctx2.restore();
          },
        },
      ],
    });
  }

  /* ── chart definitions ── */
  var charts = [
    /* M-series */
    {
      id: "m-single-core",
      data: { labels: M.labels, values: M.singleCore },
      opts: {
        title: "Single-Thread",
        subtitle: "Geekbench 6 Single-Core",
        color: blue,
      },
    },
    {
      id: "m-multi-core",
      data: { labels: M.labels, values: M.multiCore },
      opts: {
        title: "Multi-Thread",
        subtitle: "Geekbench 6 Multi-Core",
        color: blue,
      },
    },
    {
      id: "m-efficiency",
      data: { labels: M.labels, values: M.efficiency },
      opts: {
        title: "Power Efficiency",
        subtitle: "GB6 SC score per watt (15 W envelope)",
        color: blue,
        unit: "pts/W",
      },
    },
    {
      id: "m-die-size",
      data: { labels: M.labels, values: M.dieSize },
      opts: {
        title: "Die Size",
        subtitle: "Die area in mm²",
        color: blue,
        unit: "mm²",
      },
    },
    {
      id: "m-gpu-raster",
      data: { labels: M.labels, values: M.gpuRaster },
      opts: {
        title: "GPU Raster",
        subtitle: "Geekbench 6 Metal",
        color: blue,
      },
    },
    {
      id: "m-gpu-rt",
      data: { labels: M.labels, values: M.gpuRT },
      opts: {
        title: "GPU Ray Tracing",
        subtitle: "Relative (M3 = 100). M1/M2 lack HW RT.",
        color: blue,
      },
    },
    {
      id: "m-neural",
      data: { labels: M.labels, values: M.neural },
      opts: {
        title: "Neural Engine",
        subtitle: "Peak TOPS",
        color: blue,
        unit: "TOPS",
      },
    },
    {
      id: "m-mem-bw",
      data: { labels: M.labels, values: M.memBW },
      opts: {
        title: "Memory Bandwidth",
        subtitle: "GB/s (unified memory)",
        color: blue,
        unit: "GB/s",
      },
    },
    /* A-series */
    {
      id: "a-single-core",
      data: { labels: A.labels, values: A.singleCore },
      opts: {
        title: "Single-Thread",
        subtitle: "Geekbench 6 Single-Core",
        color: orange,
      },
    },
    {
      id: "a-multi-core",
      data: { labels: A.labels, values: A.multiCore },
      opts: {
        title: "Multi-Thread",
        subtitle: "Geekbench 6 Multi-Core",
        color: orange,
      },
    },
    {
      id: "a-efficiency",
      data: { labels: A.labels, values: A.efficiency },
      opts: {
        title: "Power Efficiency",
        subtitle: "GB6 SC score per watt (5 W budget)",
        color: orange,
        unit: "pts/W",
      },
    },
    {
      id: "a-die-size",
      data: { labels: A.labels, values: A.dieSize },
      opts: {
        title: "Die Size",
        subtitle: "Die area in mm²",
        color: orange,
        unit: "mm²",
      },
    },
    {
      id: "a-gpu-raster",
      data: { labels: A.labels, values: A.gpuRaster },
      opts: {
        title: "GPU Raster",
        subtitle: "Geekbench 6 Metal",
        color: orange,
      },
    },
    {
      id: "a-gpu-rt",
      data: { labels: A.labels, values: A.gpuRT },
      opts: {
        title: "GPU Ray Tracing",
        subtitle: "Relative (A17 Pro = 100). Earlier lack HW RT.",
        color: orange,
      },
    },
    {
      id: "a-neural",
      data: { labels: A.labels, values: A.neural },
      opts: {
        title: "Neural Engine",
        subtitle: "Peak TOPS",
        color: orange,
        unit: "TOPS",
      },
    },
    {
      id: "a-mem-bw",
      data: { labels: A.labels, values: A.memBW },
      opts: {
        title: "Memory Bandwidth",
        subtitle: "GB/s (LPDDR)",
        color: orange,
        unit: "GB/s",
      },
    },
  ];

  /* ── render all on load ── */
  charts.forEach(function (c) {
    createChart(c.id, c.data, c.opts);
  });
})();
