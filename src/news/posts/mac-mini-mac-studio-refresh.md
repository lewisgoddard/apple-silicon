---
title: "Mac mini and Mac Studio get M6, M5 Pro, M5 Max and M5 Ultra"
date: 2026-08-25
summary: "Both desktops jump two generations on 22 September. The Mac mini gets Apple's first 2nm chip, the Mac Studio gets over 1 TB/s of memory bandwidth — and each has one configuration that quietly gives something up."
categories:
  [
    "m6",
    "m6-12-12",
    "m5-ultra",
    "m5-ultra-36-80",
    "m5-ultra-30-64",
    "m5-max",
    "m5-max-18-40",
    "m5-max-18-32",
    "m5-pro",
    "m5-pro-18-20",
    "m5-pro-15-16",
    "mac/mac-mini",
    "mac/mac-studio",
  ]
---

Apple's two small desktops are refreshed together on 22 September 2026. The [Mac mini](/devices/mac/mac-mini/) takes the [M6](/chips/m6/) and the [M5 Pro](/chips/m5/pro/); the [Mac Studio](/devices/mac/mac-studio/) takes the [M5 Max](/chips/m5/max/) and the [M5 Ultra](/chips/m5/ultra/). Only the M6 and the M5 Ultra are new silicon — the M5 Pro and M5 Max [shipped in the MacBook Pro back in March](/news/march-2026-releases/), and reach the desktop six months later.

### Mac mini: the M6, and a first for Apple silicon

The M6 is the first Apple silicon manufactured on TSMC's 2nm node (N2), and for now the only one — the M5 Ultra arriving the same day is 3nm, as is the rest of the [M5 family](/chips/m5/). It comes in a single [12c CPU / 12c GPU](/chips/m6/base/12-12/) configuration, and the Mac mini is the only machine that takes it. At the base tier the Mac mini skips the [M5](/chips/m5/) altogether, going from [M4](/chips/m4/) straight to M6.

|                                     | CPU                                    | GPU      | Neural Engine | Bandwidth  | Memory              |
| ----------------------------------- | -------------------------------------- | -------- | ------------- | ---------- | ------------------- |
| [M6 12c/12c](/chips/m6/base/12-12/) | 2 super + 4 performance + 6 efficiency | 12 cores | 32 cores      | 170.7 GB/s | 16 / 24 / 32 GB     |
| [M5 10c/10c](/chips/m5/base/10-10/) | 4 super + 6 efficiency                 | 10 cores | 16 cores      | 153.6 GB/s | 16 / 24 / 32 GB     |
| [M4 10c/10c](/chips/m4/base/10-10/) | 4 performance + 6 efficiency           | 10 cores | 16 cores      | 120 GB/s   | 8 / 16 / 24 / 32 GB |

The M6 is the only Apple chip so far with three CPU tiers, and the CPU has been rearranged at every step: the M4 ran 4 performance and 6 efficiency cores, the M5 swapped its performance cores for 4 super cores, and the M6 keeps 2 super cores and puts a middle tier back underneath. So the Mac mini's base chip arrives with **half as many super cores as the M5 it skipped**, and two more cores overall than either.

The base memory configuration rises too — the M4 listed an 8 GB option, while the M6 starts at 16 GB.

The Neural Engine doubles, 16 cores to 32 — the "dual Neural Engine" the [M6 family](/chips/m6/) page describes. No TOPS figure is published for it yet, so there is nothing to compare against the M5's 61 or the M4's 38. The GPU grows from 10 cores to 12, and from 160 execution units to 192 (1280 ALUs to 1536), moving to Apple's 10th-generation architecture with ray tracing; no TFLOPS figure is published for it either. The media engine is unchanged from the M5: one video decode engine, one encode, one ProRes engine and one AV1 decoder, covering H.264, HEVC, ProRes and ProRes RAW.

**The 16 GB Mac mini gives up the bandwidth bump.** Memory moves to LPDDR5X-10667 across a 128-bit bus (8 channels of 16 bits), for 170.7 GB/s, in 16, 24 and 32 GB configurations. That headline bandwidth only applies to the 24 GB and 32 GB models. A 16 GB M6 is limited to 153 GB/s — no better than the 153.6 GB/s an M5 gives you at any capacity. The base configuration Mac mini gets the new process, the new CPU layout and the bigger Neural Engine, but not the memory bandwidth gain.

### Mac mini: M5 Pro above it

|                                        | CPU                      | GPU      | TFLOPS | Bandwidth | Memory          |
| -------------------------------------- | ------------------------ | -------- | ------ | --------- | --------------- |
| [M5 Pro 18c/20c](/chips/m5/pro/18-20/) | 6 super + 12 performance | 20 cores | 10.27  | 307 GB/s  | 24 / 48 / 64 GB |
| [M5 Pro 15c/16c](/chips/m5/pro/15-16/) | 5 super + 10 performance | 16 cores | 8.21   | 307 GB/s  | 24 / 48 / 64 GB |

Both sit on a 256-bit bus at 307 GB/s with the same 24, 48 and 64 GB options, 16 Neural Engine cores and 61 TOPS, and the same single-engine media block. Pick the [15c CPU / 16c GPU](/chips/m5/pro/15-16/) Mac mini and you lose cores, nothing else.

### Mac Studio: M5 Max, where the smaller die loses much more than cores

|                                        | CPU                      | GPU      | TFLOPS | Bus     | Bandwidth | Memory           |
| -------------------------------------- | ------------------------ | -------- | ------ | ------- | --------- | ---------------- |
| [M5 Max 18c/40c](/chips/m5/max/18-40/) | 6 super + 12 performance | 40 cores | 20.53  | 512-bit | 614 GB/s  | 48 / 64 / 128 GB |
| [M5 Max 18c/32c](/chips/m5/max/18-32/) | 6 super + 12 performance | 32 cores | 16.42  | 384-bit | 460 GB/s  | 36 GB            |

The CPU is identical across both. The [18c CPU / 32c GPU](/chips/m5/max/18-32/) Mac Studio gives up a quarter of its memory bus, 25% of its bandwidth, and every memory option except one: **36 GB, take it or leave it**, against up to 128 GB on the [18c CPU / 40c GPU](/chips/m5/max/18-40/). That is the sharpest tier split anywhere in the M5 family, and it is invisible if you only read the core counts.

### Mac Studio: M5 Ultra, two M5 Max dies

The M5 Ultra is two M5 Max dies joined by UltraFusion, and the specs bear that out exactly. Every M5 Max figure doubles: 18 CPU cores become 36, 40 GPU cores become 80, the 512-bit bus becomes 1024-bit, 16 Neural Engine cores become 32, and 61 TOPS becomes 122. The media engine doubles too, to 2 video decode engines, 4 encode engines, 4 ProRes engines and 2 AV1 decoders.

|                                            | CPU                       | GPU      | TFLOPS | Memory            |
| ------------------------------------------ | ------------------------- | -------- | ------ | ----------------- |
| [M5 Ultra 36c/80c](/chips/m5/ultra/36-80/) | 12 super + 24 performance | 80 cores | 41.06  | 96 / 256 / 512 GB |
| [M5 Ultra 30c/64c](/chips/m5/ultra/30-64/) | 10 super + 20 performance | 64 cores | 32.85  | 96 / 256 GB       |

Both run their GPUs at 2005 MHz, and both are manufactured on TSMC's 3nm node.

Unusually for a binned part, the [30c CPU / 64c GPU](/chips/m5/ultra/30-64/) gives up nothing on memory bandwidth — both Mac Studio configurations run LPDDR5X-9600 across the full 1024-bit bus at **1228.8 GB/s**. The cut is capacity instead. The 30c/64c tops out at 256 GB, and 512 GB is exclusive to the [36c CPU / 80c GPU](/chips/m5/ultra/36-80/) — and not at launch: that configuration is listed as arriving in late October 2026.

The [M3 Ultra](/chips/m3/ultra/) it replaces in the Mac Studio now offers 96 GB only, having [lost its 512 GB option in March](/news/m3-ultra-drops-512gb/) and [its 256 GB option in May](/news/memory-options-trimmed/).
