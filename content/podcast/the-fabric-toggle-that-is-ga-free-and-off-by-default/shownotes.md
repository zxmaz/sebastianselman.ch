# Episode 5 — The Fabric Toggle That Is GA, Free, And Off By Default

- **Watch:** https://www.youtube.com/watch?v=I9UWOuc8MKA
- **Published:** 2026-09-10 · **Length:** 28:10
- **Hosts:** Estera Kot (CTO, Clouds on Mars), Sebastian Selman (consulting lead for Switzerland)

## Summary

One toggle dropped P95 query latency in a Fabric warehouse from 90 seconds to 15 seconds. Estera Kot walks through what that benchmark measured.

Estera Kot and Sebastian Selman unpack GPU acceleration for the Microsoft Fabric data warehouse, and the footnotes behind Bogdan Crivat's six-times speed-up.

We cover:
- Why the 6x figure is an average, not a per-query promise
- The 256 concurrent user anomaly in the TPC-H run
- How Databricks Photon prices acceleration you skip overnight
- Why dev and production on one capacity drain the same tank

## Chapters

- 0:00 Introduction: the LinkedIn post behind this episode
- 0:53 Who actually built GPU acceleration
- 1:42 One toggle, no re-architecture, plain Parquet in OneLake
- 2:43 Native Execution Engine: the same toggle in Spark
- 4:03 The TPC-H benchmark, compared apple to apple
- 5:43 What an F64 trial capacity proves
- 6:35 Why trial hardware differs from paid capacity
- 9:26 Night batches, morning gold layer
- 9:55 Bronze to silver in Spark, gold in the warehouse
- 10:39 Hundreds of Power BI models, one warehouse
- 12:59 The 256 concurrent user anomaly
- 14:06 Column counts and capacity limits
- 15:28 CoddSpeed, built with NVIDIA
- 16:00 VertiPaq in 2010 and what it changed
- 17:20 Compression as a Fabric unique IP
- 19:54 Why faster queries free up hardware
- 20:29 Sizing: F64, F128 and concurrent users
- 21:29 Databricks Photon and paying for acceleration
- 22:43 Dev and production on one capacity
- 24:30 Not GA yet: what the 6x number actually is
- 27:12 The acceleration that is GA and free

## Sources

- Bogdan Crivat (Microsoft), "I put a GPU behind Fabric Data Warehouse over a weekend and ran TPC-H at it" (the anchor post): https://www.linkedin.com/posts/bogdanc_i-put-a-gpu-behind-fabric-data-warehouse-share-7480295686303928320-epRV/
- Fabric Updates Blog, "We Put a GPU Behind Fabric DW" (full write-up, methodology and the 256-user anomaly): https://community.fabric.microsoft.com/t5/Fabric-Updates-Blog/We-Put-a-GPU-Behind-Fabric-DW/ba-p/5262382
- Microsoft Learn, What's new in Microsoft Fabric, July 2026 entry "Benchmarking GPU-accelerated Fabric Data Warehouse": https://learn.microsoft.com/fabric/fundamentals/whats-new
- "CoddSpeed: Hardware Accelerated Query Processing in Microsoft Fabric", SIGMOD 2026 Industrial Track, Best Industry Paper (the GPU engine behind Fabric DW, built with NVIDIA): https://www.microsoft.com/en-us/research/publication/coddspeed-hardware-accelerated-query-processing-in-microsoft-fabric/ (ACM: https://doi.org/10.1145/3788853.3803077)
- Fabric Updates Blog, "From research to product: Microsoft Fabric wins best industry paper at SIGMOD 2026 for GPU-accelerated data warehousing": https://community.fabric.microsoft.com/blog/fbc_fabricupdatesblogs/from-research-to-product-microsoft-fabric-wins-best-industry-paper-at-sigmod-202/5191608
- VertiPaq, the column-store engine behind Power Pivot / Power BI / SSAS Tabular (2010). No URL was cited on air; Marco Russo and Alberto Ferrari (SQLBI) are the usual explainers.

## Notes (from the YouTube description)

- GPU acceleration for the Fabric data warehouse entered early access preview in July 2026, after this conversation was recorded. It is not generally available.
- Clouds on Mars is a Microsoft Fabric Featured Partner. This episode was not commissioned or sponsored by Microsoft.
