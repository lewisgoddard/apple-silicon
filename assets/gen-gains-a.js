/* Generational Gains – A-series data + chart rendering */

(function () {
  "use strict";

  var orange = genGains.orange;

  /* ── A-series data (flagship Pro chip per generation) ── */
  var A = {
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

  /* ── chart definitions ── */
  var charts = [
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

  charts.forEach(function (c) {
    genGains.createChart(c.id, c.data, c.opts);
  });
})();
