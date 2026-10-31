# Episode 2 — What Happens When the Cloud Goes Down? Smart Buildings, AWS and Resilience

- **Watch:** https://www.youtube.com/watch?v=b7j9M3qlpUk
- **Published:** 2026-07-02 · **Length:** 31:45
- **Hosts:** Estera Kot (CTO, Clouds on Mars), Sebastian Selman (consulting lead for Switzerland)
- **In-episode title:** What changed on March 1st

## Summary

Cloud resilience is no longer just an IT issue. It is now a board-level business risk.

What happens when the cloud goes down and your building depends on it? Estera Kot and Sebastian discuss how physical cloud infrastructure, smart buildings, building management systems and geopolitical risk are changing the way businesses should think about resilience.

We cover:
- why "the cloud" is still physical infrastructure
- what happens when a cloud-dependent building loses connectivity
- how HVAC, access control, elevators, energy optimization and fire monitoring can be affected
- why multi-zone redundancy may not be enough for critical systems
- what sovereign cloud, geo-redundancy and local edge mean in practice
- why CFOs, CEOs and legal teams should be part of cloud resilience decisions

## Chapters

- 00:00 Cloud data centers as physical targets
- 01:16 What happens when a smart building loses its brain
- 02:12 When cloud outage means building outage
- 05:10 Cloud-based BMS is becoming mainstream
- 09:11 Hour-by-hour impact on a commercial tower
- 18:26 Data centers, regions, paired regions and edge
- 20:34 Six levels of redundancy
- 26:19 Sovereign cloud plus local edge
- 28:25 Five takeaways for business leaders

## Sources

| Claim | Source |
|---|---|
| AWS drone strikes, March 1, 2026 | [CNBC](https://www.cnbc.com/2026/03/02/amazon-says-drone-strikes-damaged-3-facilities-in-uae-and-bahrain.html), [The Register](https://www.theregister.com/2026/03/02/amazon_outages_middle_east/) |
| 2 of 3 UAE zones down, 1 Bahrain zone down | [Tom's Hardware](https://www.tomshardware.com/tech-industry/iranian-missile-blitz-takes-down-aws-data-centers-in-bahrain-and-dubai-amazon-declares-hard-down-status-for-multiple-zones) |
| Banking/payments disruption (Careem, Emirates NBD, etc.) | [CNBC](https://www.cnbc.com/2026/03/03/iran-war-uae-drone-strikes-aws-data-centers.html), [The National](https://www.thenationalnews.com/business/2026/03/03/drone-strikes-damage-amazon-data-centres-in-uae-and-bahrain-disrupting-services/) |
| Second Bahrain attack, March 24 | [Al Jazeera](https://www.aljazeera.com/news/2026/3/24/amazon-says-aws-bahrain-region-disrupted-following-drone-activity) |
| Still not recovered as of April 7 | [CNBC](https://www.cnbc.com/2026/04/07/aws-iran-threats-us-tech-data-centers.html) |
| ME-CENTRAL-1 still showing an active multi-service operational issue as of June 21, 2026 (~16 weeks after the strike; the "late June" status quoted on air) | [AWS Health Dashboard, active event](https://health.aws.amazon.com/health/status?eventID=arn%3Aaws%3Ahealth%3Ame-central-1%3A%3Aevent%2FMULTIPLE_SERVICES%2FAWS_MULTIPLE_SERVICES_OPERATIONAL_ISSUE%2FAWS_MULTIPLE_SERVICES_OPERATIONAL_ISSUE_5E6B8_EF2498889B5) |
| Recovery will "take several months"; AWS urges migration; billing suspended; ME-CENTRAL-1 "unable to reliably support customer applications" | [AWS Health Dashboard](https://health.aws.amazon.com/), [Developing Telecoms](https://developingtelecoms.com/telecom-technology/data-centres-networks/20192-aws-says-restoring-uae-and-bahrain-cloud-regions-will-take-several-months.html), [Tom's Hardware](https://www.tomshardware.com/desktops/servers/amazons-middle-east-data-centers-damaged-by-iran-drone-and-missile-attacks-will-be-down-for-several-months-during-repairs-u-s-and-iran-currently-observing-an-uneasy-truce-but-renewed-strikes-possible-if-talks-break-down), [Network World](https://www.networkworld.com/article/4151880/amazon-waives-entire-months-aws-charges-after-iranian-drone-attack.html) |
| AWS Dec 2021 outage (~7.5 h broad, ~6 h Ring smart locks) | [Android Central](https://www.androidcentral.com/ring-and-parts-aws-are-down-right-now), [InfoQ postmortem](https://www.infoq.com/news/2021/12/aws-outage-postmortem/), [PBS News](https://www.pbs.org/newshour/nation/amazon-cloud-computing-outage-disrupts-snapchat-ring-and-many-other-online-services), [Futurism](https://futurism.com/amazon-outage-iot) |
| Iran target list (Amazon, Microsoft, Oracle, Palantir) | [CBS News](https://www.cbsnews.com/news/iran-war-tehran-us-tech-companies-targets-middle-east-drones-cyberattacks/) |
| Stargate AI data centers threatened | [TechCrunch](https://techcrunch.com/2026/04/06/iran-threatens-stargate-ai-data-centers/) |
| CrowdStrike incident, July 2024 | [Wikipedia](https://en.wikipedia.org/wiki/2024_CrowdStrike-related_IT_outages) |
| Uptime Institute outage data | [2024 Report](https://uptimeinstitute.com/resources/research-and-reports/annual-outage-analysis-2024), [2025 Report](https://uptimeinstitute.com/resources/research-and-reports/annual-outage-analysis-2025) |
| Harvard CO2 / cognitive function study | Allen et al., 2016, *Environmental Health Perspectives*, DOI: [10.1289/ehp.1510037](https://doi.org/10.1289/ehp.1510037) |
| 47% cloud BMS adoption | [ASHB 2025 Technology Adoption Survey](https://www.ashb.com/resources/technology-adoption-survey-2025) (n=308) |
| Energy cost per sq ft | EIA Commercial Buildings Energy Consumption Survey (CBECS) 2018 |
| German fire safety fines | NRW BauO 2018, Section 84; StGB Sections 222, 229 |
| Azure redundancy tiers (LRS/ZRS/GRS/RA-GRS/GZRS) | Microsoft Azure documentation |

**Further background reading:** data centers as a new warfare target ([Euronews](https://www.euronews.com/next/2026/03/12/data-centres-are-the-new-target-in-modern-warfare-during-iran-war-experts-say), [Data Centre Magazine](https://datacentremagazine.com/news/how-war-is-damaging-the-middle-easts-data-centre-ambitions)); Azure West Europe outage Oct 2023 ([The Register](https://www.theregister.com/2023/10/23/microsoft_azure_power_issue/)); Azure global WAN outage Jan 2023 ([ThousandEyes](https://www.thousandeyes.com/blog/microsoft-outage-analysis-january-25-2023)); Azure July 2024 incidents ([Azure Status History](https://azure.status.microsoft/en-us/status/history?trackingid=4L44-3F0), [CRN Australia](https://www.crn.com.au/news-network/security/2024/microsoft-blames-major-azure-outage-on-ddos-attack-staff-error)).
