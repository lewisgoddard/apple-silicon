/* Generational Gains – M-series data + chart rendering */

(function () {
  "use strict";

  var blue = genGains.blue;

  /* ── M-series data (base chip per generation) ── */
  var M = {
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

  /* ── chart definitions ── */
  var charts = [
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
  ];

  charts.forEach(function (c) {
    genGains.createChart(c.id, c.data, c.opts);
  });
})();
