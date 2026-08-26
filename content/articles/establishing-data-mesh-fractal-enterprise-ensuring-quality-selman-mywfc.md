---
title: "Establishing a Data Mesh in a Fractal Enterprise: Ensuring Data Quality and establishing Data Contracts"
slug: establishing-data-mesh-fractal-enterprise-ensuring-quality-selman-mywfc
date: 2025-05-30
byline: Sebastian Selman
lang: en
source: https://www.linkedin.com/pulse/establishing-data-mesh-fractal-enterprise-ensuring-quality-selman-mywfc/
summary: "[Disclaimer: The views expressed in this post are my own and do not reflect the views of my employer, hence the thoughts and perspectives shared here are entirely my own and should not be interpreted as official statements or positions of the company. This article is co-authored with the Researcher "
cover_image: "https://media.licdn.com/dms/image/v2/D4D12AQGNcAQ6UStrPw/article-cover_image-shrink_720_1280/B4DZbVP2gPG0AI-/0/1747334425108?e=2147483647&v=beta&t=phmFB-bt7H4VFk065MTbJHfrYpo8badJk8xRpDGSJ7c"
images: [establishing-data-mesh-fractal-enterprise-ensuring-quality-selman-mywfc-24df1be1a2.jpg, establishing-data-mesh-fractal-enterprise-ensuring-quality-selman-mywfc-6e94ddeb1d.jpg, establishing-data-mesh-fractal-enterprise-ensuring-quality-selman-mywfc-2711ce9b3b.jpg, establishing-data-mesh-fractal-enterprise-ensuring-quality-selman-mywfc-073f281c04.jpg]
captured_at: 2026-08-26T10:37:14.170Z
origin: linkedin
---
[Disclaimer: The views expressed in this post are my own and do not reflect the views of my employer, hence the thoughts and perspectives shared here are entirely my own and should not be interpreted as official statements or positions of the company. This article is co-authored with the Researcher (Frontier) of M365 CoPilot - #Microsoftadvocate #MSFTemployee]

### Data Mesh in a Fractal Organization

If your company’s “fractal” structure – with many semi-autonomous business units – demands a careful balance between local autonomy and central standards, a Data Mesh architecture is well-suited here, as it decentralizes data ownership to domain teams while federating governance across the enterprise[[14]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Finfo%2Emicrosoft%2Ecom%2Frs%2F157-GQE-382%2Fimages%2FEN-WBNR-SlideDeck-SRDEM109173%2Epdf&urlhash=uJZ4&trk=article-ssr-frontend-pulse_little-text-block)[[1]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Edatagalaxy%2Ecom%2Fen%2Fblog%2Fdata-governance-roles-in-data-mesh%2F&urlhash=mIRT&trk=article-ssr-frontend-pulse_little-text-block). Key principles of Data Mesh include domain-oriented data ownership, treating data as a product, self-service data platforms, and federated governance[[1]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Edatagalaxy%2Ecom%2Fen%2Fblog%2Fdata-governance-roles-in-data-mesh%2F&urlhash=mIRT&trk=article-ssr-frontend-pulse_little-text-block). In practice, this means each local team (domain) manages its own data pipelines and products, but follows shared standards for data quality, interoperability, and security set by a central governance function. The relevant shift here is that where historically you might have had a central team owning and managing the data, your organization will move now towards a set-up in which the central team "only" manages the standards creating

- the limits within which domains compliantly can take responsibility for their data.
- the rails on which and the conditions under which data can be shared between such domains in the business or even beyond the boundaries of the enterprise.

Two critical pillars in this scenario are data quality enforcement and data contracts. We need to ensure that data is high-quality “as far to the left” (early in the pipeline) as possible, ideally at the source systems. And we need to ensure that clear data contracts define the expectations and responsibility between data producers and consumers. And for data contracts to be of value, we must enable data democratization (easy data access for users) without compromising privacy or compliance. This is challenging in a federated environment – especially when central IT has limited direct control over the business units or domains – so success requires the right mix of technology (e.g. Fabric, Azure Databricks, Purview, etc.) and robust governance processes to get buy-in from local teams. It is not merely a technology challenge even more it is the challenge to create reliable relationships built on trust and responsibility, and technology can aid that, but it alone will not deliver on that ambition.

### This article addresses and exemplifies with an Azure native stack in mind:

- Enforcing data quality at the source (and why MDM tools are valuable).
- Data contracts at the Silver/Gold layers and how to negotiate, document, and enforce them, including privacy tools for sharing data safely.
- Technical setup on Azure using Microsoft Fabric, Azure Databricks, Microsoft Purview, and partner solutions to implement these concepts.
- Governance and organizational measures to manage data quality risks and prevent either “over-sharing” or overly siloed data, including necessary processes, roles, and stewardship functions.

## Shifting Data Quality “Left” to Source Systems with MDM

It is paramount to enforce data quality as early as possible – ideally at the point of data creation in source systems. Catching errors upstream prevents bad data from propagating downstream. Piethein Strengholt, a noted expert on data architecture, advises: “If it’s fast and fluid, break it apart into smaller pieces and leave it up to the domains. If it’s stable and it truly matters, consider using MDM.”[[9]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Eoreilly%2Ecom%2Flibrary%2Fview%2Fdata-management-at%2F9781098138851%2Fch10%2Ehtml&urlhash=ezpU&trk=article-ssr-frontend-pulse_little-text-block). In other words, dynamic domain-specific data can be handled within those domains, but critical master data that needs consistency enterprise-wide should be managed through Master Data Management (MDM). By “shifting left” data quality, we validate and clean data in the operational source or upon ingestion, rather than only in later analytical stages[[3]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fazure%2Fcloud-adoption-framework%2Fscenarios%2Fcloud-scale-analytics%2Fgovern-data-quality&urlhash=dcjK&trk=article-ssr-frontend-pulse_little-text-block). This approach ensures higher quality data feeds every downstream process. The challenge here is: At scale you will only identify the need to master data, once you have brought it out of the transactional realm into an analytical layer and are aiming to combine the data from different systems, be it for advanced analytics or to produce features to feed your next model training run. But isn't that "too late" since you'd want to fix those as far left as possible?

![Article content](/assets/img/establishing-data-mesh-fractal-enterprise-ensuring-quality-selman-mywfc-24df1be1a2.jpg)

Analytical flow from source to report, while you will be able to identify incongruencies in the analytical estate (here in green), they stem from the transactional systems (here in blue) and that is where you'd want to fix them.

So one key question to answer will need to be: If you only identify issues in the analytical estate, because that is where you'd often apply MDM and identify issues, how do you communicate or automagically enforce necessary changes back to the source systems?

### The Role of Master Data Management (MDM)

MDM solutions are key to enforcing quality and schema standards at the source. They create a unified, authoritative version of key business entities (clients, products, employees, etc.) and can push these clean records back to transactional systems. For example, an MDM hub can consolidate customer data from multiple country systems, resolve duplicates/inconsistencies, and then share the “golden record” back to each source system, enforcing a consistent schema and reference data across the enterprise. This effectively enforces a schema-on-write in the source landscape – aiming to create a virtuous feedback loop progressing your data quality closer to the ideal of writing only high-quality, conformant data already at the source.

Bear the advice of Strengholt in mind and do this only for the critical data elements which truly matter, just because you could technically master it, that does not mean you effectively are better of spending that energy:

> If it’s fast and fluid, break it apart into smaller pieces and leave it up to the domains. If it’s stable and it truly matters, consider using MDM.” Piethein Strengholt [[9]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Eoreilly%2Ecom%2Flibrary%2Fview%2Fdata-management-at%2F9781098138851%2Fch10%2Ehtml&urlhash=ezpU&trk=article-ssr-frontend-pulse_little-text-block)

Tools like Profisee, Semarchy, Reltio or CluedIn can be deployed for this purpose. They often provide data quality rule engines, matching algorithms, and stewardship workflows:

- Profisee* – a cloud-native MDM platform (available as a SaaS on Azure) with a powerful rules engine to validate data (if you can write an Excel formula, you can create rules in Profisee). It enables data validation at entry, preventing low-quality data from entering source systems.
- Semarchy – an MDM and data governance platform that allows creation of validation rules and consolidation survivorship rules through a user-friendly interface, ensuring data meets standards before being accepted as master data.
- Reltio – a cloud MDM known for handling large-scale master data with real-time updates; it can enforce standardization (like address cleansing, reference checks) as data is ingested into its hub.
- CluedIn – a slightly different approach, using a graph-based data integration that automates schema mapping and detects “dirty” data. CluedIn integrates natively with Microsoft Purview for governance. It provides metrics on data quality and uses machine learning (fuzzy logic) to identify and clean data issues across sources[[10]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fpurview%2Fdata-governance-master-data-management-cluedin&urlhash=ic1B&trk=article-ssr-frontend-pulse_little-text-block). For example, CluedIn can ingest data from dozens of sources (SQL databases, Salesforce, files, etc.), detect duplicates or anomalies, and suggest corrections which data stewards can then approve. Over time, the system learns how to auto-correct common issues[[10]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fpurview%2Fdata-governance-master-data-management-cluedin&urlhash=ic1B&trk=article-ssr-frontend-pulse_little-text-block). The cleaned, conformed data is then accessible for analytics or can be pushed back to source systems (schema-on-write).

In practice, implementing MDM in a Data Mesh usually means treating the MDM system as another domain (often a “core data” domain) that provides mastered data products to other domains. Each local domain must cooperate by supplying their source data to the MDM and consuming the mastered results. The payoff is significant: consistent identifiers and high-quality reference data (like a single global client list, standardized job or level codes in HR etc.) across all domains. This reduces reconciliation efforts later and improves trust in data.

### Enforcing Data Quality at Ingestion

Beyond MDM for master entities, all data pipelines should enforce quality checks as data moves from raw (bronze) to refined stages. In Azure, one can implement validation rules as close to ingestion as possible. For example:

- Azure Data Factory/Synapse Pipelines: Use data flows or pipeline activities to validate data (e.g. ensure required fields are present, values fall in expected ranges). Invalid records can be quarantined for review rather than loaded forward.
- Azure Databricks: Leverage Apache Spark with tools like Great Expectations (an open-source data validation framework) to define expectations for data quality at the end of the bronze stage. Databricks can run these expectations on incoming data batches and flag or reject records that don’t meet the criteria. This approach, using “expectation” tests, catches data quality issues at ingestion before they affect downstream data products[[3]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fazure%2Fcloud-adoption-framework%2Fscenarios%2Fcloud-scale-analytics%2Fgovern-data-quality&urlhash=dcjK&trk=article-ssr-frontend-pulse_little-text-block).
- Delta Lake (on Databricks or Azure Synapse/Microsoft Fabric): Delta Lake format inherently supports schema enforcement and evolution. When writing to a Delta table, one can enable strict schema checks so that any schema drift or unexpected data types cause an error. Delta also now supports Column Constraints (like NOT NULL or check constraints) on tables to prevent invalid data from being written. These features effectively enforce basic data contracts (schema and simple quality rules) at the data storage level.

By validating early and often in the pipeline, you ensure that the Silver layer (intermediate refined data) and Gold layer (curated business-ready data) receive only high-integrity data. This reduces the burden on end-stage cleansing and builds trust with data consumers. It also localizes data correction to the domains who know the data best. Microsoft’s guidance also notes: avoid offloading all cleanup to a central team; instead, have domain experts responsible for cleansing their data, since they have the context[[3]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fazure%2Fcloud-adoption-framework%2Fscenarios%2Fcloud-scale-analytics%2Fgovern-data-quality&urlhash=dcjK&trk=article-ssr-frontend-pulse_little-text-block). The central team should provide the tools and standards, but the domains fix the errors – this aligns with Data Mesh’s principle of domain responsibility for data quality.

### Example – Applying MDM “left”:

Imagine Your company has multiple country systems each with their own list of clients and candidates. Using an MDM solution [[15]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fpurview%2Fdata-governance-master-data-management%23partner-mdm-integration-with-microsoft-purview&urlhash=mD0d&trk=article-ssr-frontend-pulse_little-text-block), your company can create a Global Client Master domain:

- Local systems feed their client records to the MDM hub.
- The MDM matches and merges duplicates (e.g., “Contoso Corp” in France and “Contoso Corporation” in the USA are recognized as the same entity).
- A golden client profile is created with a unique ID and standardized attributes (official name, global ID, etc.), and that is pushed back to each local CRM system (enforcing consistency at the source).
- Now when data from different countries flows into the Data Lake, those records already share a common ID and standardized values, greatly simplifying downstream integration and ensuring higher quality (no duplicate or inconsistent client entries).
- Moreover, the MDM can enforce validation rules: e.g., a client record must have a valid country code from a standard list, a postal code in correct format, etc., before it’s considered mastered. This keeps bad data from ever entering analytics pipelines.

### Data Quality Metrics and Monitoring

Enforcing quality is not one-and-done; continuous monitoring is needed. Microsoft Purview (discussed later) provides data profiling and quality score capabilities aligned to the CMDC Framework [[16]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Emicrosoft%2Ecom%2Fen-us%2Fsecurity%2Fblog%2F2023%2F04%2F24%2Fgetting-started-with-the-cdmc-framework-microsofts-guide-to-cloud-data-management%2F%3Fmsockid%3D2043ce8c330166493f38db55329167f3&urlhash=tLci&trk=article-ssr-frontend-pulse_little-text-block). Each domain should define data quality KPIs (completeness, uniqueness, validity, accuracy, etc.[[3]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fazure%2Fcloud-adoption-framework%2Fscenarios%2Fcloud-scale-analytics%2Fgovern-data-quality&urlhash=dcjK&trk=article-ssr-frontend-pulse_little-text-block)) for their data products. For instance, a domain might track that 98% of records have valid email format or that customer addresses are 95% complete. If metrics fall below agreed thresholds, it triggers an improvement action by that domain’s data steward.

By capturing these metrics in a central dashboard (like in Purview or Power BI) and reporting them up to a Data Governance Board, Your company’s leadership gains insight into data health across domains[[3]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fazure%2Fcloud-adoption-framework%2Fscenarios%2Fcloud-scale-analytics%2Fgovern-data-quality&urlhash=dcjK&trk=article-ssr-frontend-pulse_little-text-block). This transparency can drive accountability: each domain knows it is being measured on data quality and is expected to improve it continuously.

## Data Contracts at the Silver/Gold Layers and Privacy-Preserving Sharing

Data Contracts are formal (or semi-formal) agreements between data producers (domain teams providing a data product) and data consumers (other teams or users) in the mesh. They specify what the data product contains, the quality/timeliness guarantees, and how consumers can use it. In a large enterprise Data Mesh, data contracts ensure reliability and set expectations, given that central oversight is limited.

Typically, data contracts come into play at the Silver or Gold layer – after raw data has been refined into a usable form:

- Silver layer: cleaned and partially transformed data, often used by data scientists or analytics teams for further processing. At this stage, contracts might cover schema and quality of these datasets that are shared for broader use.
- Gold layer: highly curated, business-friendly datasets or semantic models ready for consumption (reports, ML models, etc.). Here contracts ensure that business consumers get well-defined, stable data with guarantees (like “data will be updated by 8 AM CET daily”, “fields X, Y will not be null”, etc.).

It’s less common to implement data contracts on raw/bronze data because those are usually only used internally within a domain. Contracts are most valuable when one domain’s data is being used by others. Think of a contract as a service-level agreement (SLA) for data.

### What a Data Contract Defines

A data contract typically defines:

- The schema and semantics of the data product (which fields, data types, meaning of each).
- Quality expectations: e.g., no dummy/test records included, certain columns have at least 99% valid values, etc.
- Timeliness/frequency: how often data is updated or delivered, and possibly latency (e.g., “transactions are available within 1 hour of creation”).
- Availability/SLA: uptime or reliability of the data service (for instance, “95% uptime of the data pipeline”).
- Versioning policy: how changes to the data structure will be managed (e.g., semantic versioning – adding new columns is a minor version that is backward compatible, removing or renaming columns triggers a major version)[[8][8]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flivebook%2Emanning%2Ecom%2Fbook%2Fdata-mesh-in-action%2Fchapter-5%2F&urlhash=NOC0&trk=article-ssr-frontend-pulse_little-text-block).
- Owner and support: who owns the data product and who to contact for issues or requests.
- Usage terms or privacy constraints: any restrictions on how the data can be used (for example, “this dataset may be used for aggregate analytics but not to contact individual candidates directly” if there are privacy concerns).

Piethein Strengholt describes data contracts as akin to delivery or service contracts between producers and consumers[[8]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flivebook%2Emanning%2Ecom%2Fbook%2Fdata-mesh-in-action%2Fchapter-5%2F&urlhash=NOC0&trk=article-ssr-frontend-pulse_little-text-block). For example, a contract for a “Candidate Profiles Silver Dataset” might state: “This dataset contains all candidate profiles updated daily. It is guaranteed to have no test entries (only production data), and key fields like CandidateID, Name, Email are 100% populated. The data is refreshed by 02:00 CET daily with a 99% on-time rate. Schema changes will follow semantic versioning; breaking changes require 4 weeks’ notice.” Such a contract gives consumers confidence in using the data and a clear understanding of what to expect.

Data contracts also improve transparency in a federated environment. They “provide insights into who owns what data products and what is being consumed by whom and for what purpose,” as Strengholt notes[[7]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fmuckrack%2Ecom%2Fpiethein-strengholt%2Farticles&urlhash=CgP-&trk=article-ssr-frontend-pulse_little-text-block). In other words, the existence of a contract (often registered in a catalog) means:

- There is an identified owner responsible for the data product.
- There is defined purposes for which the data provided may be used (especially if GDPR regulations apply).
- One can discover users, downstream processes or teams depending on this data (if the contract is cataloged, consumers can register through it).
- Standards are set for that data product’s quality and delivery, which helps manage dependencies confidently – pipelines can be built with the contract in mind.

### Negotiating and Documenting Contracts

In practice, establishing a data contract requires communication between the producing domain team and consuming teams. This is a social process as much as a technical one:

- Negotiation: The producer says “here is what I can provide, at this frequency, with these known limitations.” Consumers convey their needs “we need the data by X time with Y accuracy for it to be useful.” They iteratively agree on a middle ground that is feasible and meets business needs. For instance, a consuming Finance team might request that HR’s employee data product includes a “termination_date” field and is updated daily; the HR data team might need to adjust their pipeline or explain if daily is too frequent and come to an agreed schedule. IT security might later apply to use this data, e.g. to remove access rights of users after their "termination_date".
- Documentation: Once agreed, the terms of the contract should be documented in a place accessible to all stakeholders. Microsoft Purview can serve as a repository for this documentation. Purview allows creating a Business Glossary and metadata descriptions for data assets – the contract details can be captured in the description, or attached as a reference document. Purview’s upcoming “data product” feature in the Catalog could encapsulate contract metadata (like SLA, owner, refresh frequency) fields for each data product entry. If not using Purview, teams might use a Confluence page or a SharePoint site to record data contracts. The key is that it’s written and visible.

From a technology standpoint, one can also treat data contracts “as code.” For example, define a JSON/YAML file that declares the schema and constraints for a data product. This file lives in source control. Data pipeline code (in Databricks or Azure Data Factory) can read this contract definition and enforce it (e.g., by asserting the data schema matches, column X has no nulls if contract says non-null). Some organizations have started building frameworks to automate contract enforcement in CI/CD, where if a producer changes the schema file, automated tests check backward compatibility and notify consumers. While this is an evolving practice, the Azure stack can support orchestration via DevOps pipelines and tests and enforce orchestration with Azure Data Factory.

Enforcement of the contract happens through a combination of:

- Automated validation: e.g., a daily job that checks whether the delivered data met the agreed row count or freshness and sends alerts if not.
- Data quality checks embedded in the pipeline (as discussed, using Great Expectations or Purview’s data quality scans) to ensure quality metrics stay within contract bounds.
- Change management process: if a breaking change is needed, the producer must communicate it (perhaps through a Change Request in a tool or at a governance forum) and update the contract documentation. Consumers get a transition period to adapt.

Microsoft Purview can help by showing data lineage – if a producer is about to change something, lineage can reveal which downstream processes might break, so they know whom to notify. Additionally, Purview’s Data Policies (if used) might enforce column-level security which is a part of a “contract” around sensitive data (for example, contract might stipulate that certain personal data fields will be encrypted or not shared – Purview policies could technically enforce that across Azure data services).

Example: A contract for “Global Sales Gold Dataset” is registered in Purview with an owner, refresh schedule, schema, and quality expectation that “99% of transactions have a valid associated customer ID.” The Sales data team has implemented Great Expectations checks so that if more than 1% of transactions come in with missing customer ID, the pipeline fails and alerts them. Thus, the contract quality clause is enforced in code. Meanwhile, any consumer can look in Purview to see the dataset’s definition and owner, and they know whom to call if something is amiss (e.g., if one day the data is late, they contact the owner as per the contract).

### Privacy Techniques for Sharing Sensitive Data

Often, the Silver layer contains detailed data that may be sensitive (personal data, financial details, etc.). Sharing such data widely – even within the company – raises privacy and compliance concerns. Data contracts should also incorporate data privacy requirements. For example, a contract might specify that certain fields will be masked or that data will only be shared in aggregate form. In your architecture, you may use specialized tools to obfuscate or protect sensitive information as part of delivering data products. Let’s discuss some potential solutions:

- Microsoft Presidio: This is an open-source data protection and de-identification SDK from Microsoft. Presidio can automatically detect Personally Identifiable Information (PII) in text or structured data (names, phone numbers, addresses, etc.) and then anonymize or mask it[[6]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fmicrosoft%2Egithub%2Eio%2Fpresidio%2F&urlhash=iQEQ&trk=article-ssr-frontend-pulse_little-text-block). It uses a combination of NLP Named Entity Recognition and pattern matching. In practice, Presidio can be integrated into Azure Databricks notebooks or Azure Functions. For example, as the HR domain creates a Silver dataset of employee records to share globally, they could run it through Presidio to redact social security numbers or free-text comments that might contain personal info. This ensures that by the time the data is in a shared layer, direct identifiers are removed or tokenized. Presidio enables the principle “privacy by design” – embedding privacy checks into the pipeline itself. (It’s worth noting Presidio’s detection isn’t 100% foolproof[[6]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fmicrosoft%2Egithub%2Eio%2Fpresidio%2F&urlhash=iQEQ&trk=article-ssr-frontend-pulse_little-text-block), but it significantly reduces risk and can be combined with human review or additional rules for high sensitivity data.)
- Decentriq Data Clean Rooms: Decentriq is a SaaS platform (available via Azure Marketplace) that provides secure data clean rooms powered by Azure Confidential Computing. In a data clean room, multiple parties can contribute data which gets joined or analyzed together, but no party can see the other’s raw data – only aggregated results come out. Decentriq uses technologies like Trusted Execution Environments (enclaves), synthetic data generation, and differential privacy to ensure that data remains encrypted even during analysis and that only permitted insights are revealed[[5]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fazure%2Fconfidential-computing%2Fpartner-pages%2Fdecentriq&urlhash=zsf8&trk=article-ssr-frontend-pulse_little-text-block). For your company, this could be useful in scenarios where data from separate domains or external partners needs to be combined without exposing all details. For instance, if your company wanted to analyze outcomes by joining their internal HR data with an external training vendor’s data, a clean room could allow the analysis (finding correlations between training and performance) without either party fully sharing their underlying datasets. Within the enterprise, if certain business units are very sensitive about data (due to legal reasons), a clean room approach can be an option to still derive group insights. Decentriq’s platform is relatively no-code making a truly complex technical challenge surprisingly accessible to business users who are expected to know or even own the data, but might not be very technical users – data owners can set it up quickly and define allowed queries. It enforces that results are only shown if they meet privacy thresholds (like minimum counts) to prevent re-identification[[5]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fazure%2Fconfidential-computing%2Fpartner-pages%2Fdecentriq&urlhash=zsf8&trk=article-ssr-frontend-pulse_little-text-block).
- Sarus (Differential Privacy): Sarus is a solution focused on applying differential privacy (DP) to data analytics. Differential privacy provides a mathematical guarantee that the output of an analysis does not compromise any single individual’s data, by adding carefully calibrated noise to results[[13]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Esarus%2Etech%2Fproduct%2Fdifferential-privacy&urlhash=-5PF&trk=article-ssr-frontend-pulse_little-text-block). Sarus allows analysts to query sensitive datasets without seeing raw data, ensuring that all query results are “blurred” enough to protect individuals[[4]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Esarus%2Etech%2F&urlhash=bAzP&trk=article-ssr-frontend-pulse_little-text-block). It can even generate synthetic data that mirror the statistical properties of the real data, which analysts can use as a safe substitute[[4]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Esarus%2Etech%2F&urlhash=bAzP&trk=article-ssr-frontend-pulse_little-text-block). In practice, Sarus can be deployed on Azure (it integrates with Azure Confidential computing as well[[4]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Esarus%2Etech%2F&urlhash=bAzP&trk=article-ssr-frontend-pulse_little-text-block)) as a layer on top of databases or data lakes. Analysts run their SQL or machine learning on the protected environment; Sarus intercepts and alters queries or results to enforce privacy[[4]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Esarus%2Etech%2F&urlhash=bAzP&trk=article-ssr-frontend-pulse_little-text-block). This is especially relevant if your company wants to open up large sensitive datasets (like detailed salary information, or personal candidate data) to data scientists for modeling. Using Sarus, the data scientists could train models or get insights without ever seeing raw personal data, and the output (model or aggregate) has DP guarantees (meaning even if someone tried to infer an individual's data from the model, it’s statistically prevented). Sarus essentially allows maximum analytical value from data with minimal privacy risk – analysts “work on data without ever seeing it,” as the company says[[4]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Esarus%2Etech%2F&urlhash=bAzP&trk=article-ssr-frontend-pulse_little-text-block).

In summary, these privacy-enhancing technologies help to enforce that sharing of data products doesn’t violate privacy/security policies:

- Use Presidio in pipelines to anonymize sensitive fields (e.g. mask names or IDs in a Silver dataset that will be widely accessible).
- Use clean rooms (Decentriq) for cross-entity collaboration, ensuring no raw data leaves its owner even when generating combined insights.
- Use differential privacy tools (Sarus) to allow broad analysis on sensitive data by injecting noise so that only statistical insights emerge, not exact personal details.

For your company, instituting such measures means local teams and business units can be more comfortable participating in the data mesh, since they know that when they share data, it can be protected according to enterprise standards. A data contract can explicitly note if a dataset has been privacy-sanitized (e.g., “Dataset X has been run through Presidio to redact PII” or “this is a differential privacy-protected data product”).

Sharing Silver layer data often requires these techniques – e.g., a Silver dataset of “All employee records” might be useful for data scientists across the group, but it must have direct identifiers removed (Presidio) and perhaps only be accessible in a controlled environment (Sarus or a Fabric sandbox) to prevent misuse. By the Gold layer, usually data is aggregated or less sensitive, but if not, privacy tools should still be applied as needed. Embracing these privacy solutions is crucial to democratize data safely, avoiding the pitfall of either oversharing sensitive data or, conversely, over-restricting access such that data can’t be used for decision-making. We’ll return to governance processes around this balance later.

## Technical Blueprint: Azure Implementation for Data Quality and Data Contracts

With the concepts established, let’s map them to a practical Azure architecture blueprint using Microsoft’s stack and integrated partner solutions. The goal is an industrialized data management framework where quality is built-in and governance is automated as much as possible, to scale across Your company’s enterprise.

### Data Ingestion and Lakehouse Layers (Fabric, Databricks, Lake)

Microsoft Fabric is a new unified analytics platform that can greatly simplify a Data Mesh implementation. It provides an all-in-one SaaS experience with components for data integration (Data Factory in Fabric), data engineering (Spark), data warehousing (Synapse), data science and real-time analytics – all on top of OneLake (a single logical data lake for the organization)[[12]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fpurview%2Funified-catalog-data-quality-fabric-lakehouse&urlhash=Vi-A&trk=article-ssr-frontend-pulse_little-text-block). Each domain team could be given their own Fabric workspace to build their data products, all of which land in the shared OneLake (with security isolating as needed). Fabric natively integrates with Purview for cataloging and governance[[12]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fpurview%2Funified-catalog-data-quality-fabric-lakehouse&urlhash=Vi-A&trk=article-ssr-frontend-pulse_little-text-block).

A typical flow:

- Bronze layer (raw data): Data from source systems (e.g., one of your company-branch’s transactional DB, or SaaS apps like Salesforce) is ingested via Azure Data Factory (in Fabric or standalone) or Azure Databricks Autoloader into Azure Data Lake Storage (which in Fabric is called “OneLake”). Files might be stored in their raw form (CSV, JSON) or directly as Delta format for streaming ingestion. Data Contracts Relevance: At this stage, no external contract yet – it’s internal to the domain. But even here, adhere to internal agreements such as using standardized file schemas, etc.
- Silver layer (cleaned & conformed): Domain data engineers use Azure Databricks or Fabric Data Engineering (Spark) to transform raw data into cleaned datasets. They apply the data quality validations: e.g., using Great Expectations or Fabric’s built-in Data Quality (Fabric has recently introduced data quality features integrated with Purview)[[11]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fpiethein%2Emedium%2Ecom%2F&urlhash=NqSF&trk=article-ssr-frontend-pulse_little-text-block). If records fail checks, they can either be corrected via reference data (like using an MDM output) or flagged. The silver data is typically stored in Delta Lake tables in OneLake/ADLS, partitioned appropriately. In Azure Databricks, one might implement Delta Live Tables pipelines with quality constraints. Delta Live Tables allows you to define expectations; it can drop or quarantine bad data automatically and keep track of quality metrics. In Microsoft Fabric, data pipelines can call Microsoft Purview’s Data Quality scanning on the results. Purview’s unified data catalog now supports profiling and quality score computation for Fabric Lakehouse tables[[12]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fpurview%2Funified-catalog-data-quality-fabric-lakehouse&urlhash=Vi-A&trk=article-ssr-frontend-pulse_little-text-block). The results (e.g., completeness %, validity %) are stored in Purview and visible to governance teams. This creates a feedback loop: if Silver data quality declines, it’s immediately evident. The schema of silver tables should be managed explicitly – using Databricks notebooks with schema definitions or Power Query definitions in Fabric Dataflows. This schema essentially becomes part of the eventual data contract.
- Gold layer (curated data products): Domain teams aggregate or model the Silver data into business-focused datasets. For example, silver might have detailed timesheets; gold might have a “Revenue by Region” table or a star schema dimensional model for reporting. Gold datasets are often served through Azure Synapse Analytics or Fabric Warehouse if relational, or Power BI datasets for semantic models. At this point, the data contract for the product is finalized. The gold layer tables/views are what external teams will query. The contract covers this interface: e.g., a Power BI dataset “Global Sales Analytics” with defined measures and dimensions comes with a contract of how often it’s updated and what it contains. Technically, these gold datasets can be registered in Purview with a “Data Product” entry, tagging the owner and contract details. If using Fabric, the Power BI dataset can even carry sensitivity labels from Purview to ensure compliance (Power BI and Purview integration allows classification to flow).

Azure Databricks and Microsoft Fabric can coexist: Piethein Strengholt discussed integration patterns where heavy data engineering might happen in Databricks, then the refined data is available in Fabric for easy consumption[[11]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fpiethein%2Emedium%2Ecom%2F&urlhash=NqSF&trk=article-ssr-frontend-pulse_little-text-block). Your company could use Databricks for the more open-ended data science work (where Python/Scala code and custom algorithms are needed) and Fabric for standardized pipelines and serving data to end users. They integrate via OneLake or ADLS - Databricks can read/write to the same Delta tables that Fabric uses.

Key Azure services to implement enforcement and contracts:

- Azure Schema Registry / Databricks: If data is flowing via event streams (e.g., Kafka or Event Hubs), using a Schema Registry with Avro/JSON schema can enforce schemas on streaming data at ingestion – another form of contract on data format.
- Azure Functions or Logic Apps: can be used to automate notifications – e.g., if a data quality validation fails or a contract SLA is missed, trigger an alert or create a work item for the data owner to investigate. Alternatively you could also use Microsoft Fabric’s Data Activator: Leverage real-time intelligence to proactively monitor SLA breaches or data quality issues. Automatically trigger alerts, create work items, or initiate corrective actions directly based on criteria set within the Data Activator framework, ensuring swift response and compliance.
- Logging and Monitoring: Azure Monitor logs or Databricks monitoring can track pipeline run success, data volume, etc. This can indirectly measure if contract obligations are met (e.g., “did the job complete by its scheduled time?”).

### Microsoft Purview for Data Catalog, Lineage, and Governance

Microsoft Purview is the heart of governance in this blueprint. It acts as the enterprise data catalog and governance portal:

- Cataloging & Metadata: As each domain builds data products, they register them in Purview. Purview will scan the Azure Data Lake (OneLake) and Databricks metastores to pull in table definitions, columns, and even data samples. It stores technical schema as well as allows adding business context (descriptions, owners, tags, connecting physical data to glossary terms).
- Business Glossary: Central data governance can define standard business terms (e.g., “Definition of FTE” or “What constitutes a ‘Client’”). These can be linked to data assets so that all domains use consistent definitions, which is crucial for a decentralized org to avoid misunderstandings.
- Data Lineage: Purview automatically captures lineage for data moving through Azure Data Factory or Databricks. This means you can see, for example, that a Gold table in Finance domain is derived from a Silver table in HR domain. This lineage is invaluable for managing data contracts – it shows dependencies graphically. If the HR team wants to change their Silver data, they can see which Gold products (and thus which contracts) might be impacted. It also helps data consumers trace back the source of data for trust (“this report ultimately sources from system X via these transformations, okay.”).
- Data Quality & Profiling: As mentioned, Purview’s Data Quality in the Unified Catalog feature allows governance teams to configure data quality scans. These scans compute metrics like completeness, uniqueness, etc., and can even apply custom rules. For example, Purview could be set to regularly check the “Candidates Silver Table” for the percentage of missing emails or invalid phone numbers. The results are stored as part of the metadata, giving a quick view of quality status to anyone looking at that dataset[[3]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fazure%2Fcloud-adoption-framework%2Fscenarios%2Fcloud-scale-analytics%2Fgovern-data-quality&urlhash=dcjK&trk=article-ssr-frontend-pulse_little-text-block). Over time, Purview can show trends if quality is improving or degrading.

Sensitivity Labels & Access Policies: Purview integrates with Azure Information Protection labels. Data can be tagged as Highly Confidential, etc., in the catalog. Purview can also push access policies to certain Azure services (like Storage, SQL, Synapse) to control who can see what data. While still evolving, this means if a column is tagged sensitive, Purview could ensure only authorized roles can access it, fulfilling a part of the “enforcement” aspect of contracts dealing with privacy. For instance, a contract might say “salary data is restricted to Finance analysts”; Purview could enforce that via dynamic data masking or ACLs (Access Control Lists) on the corresponding data asset.

In our context, Purview is where data contracts live (as metadata) and where compliance is tracked. A data contract could be partially documented by:

- The dataset’s metadata properties (owner, SLA, refresh schedule field, quality metrics).
- A linked Glossary term or Policy that outlines usage terms.

Moreover, Purview’s insight reports can highlight if any data product is not meeting governance standards, helping proactively manage issues.

### Integrating MDM and External Data Quality Solutions

While Purview is great for cataloging and monitoring, it is not itself an MDM or data cleaning tool. This is where integration with the earlier mentioned MDM solutions comes in:

## Recommended by LinkedIn

[![Keeping An Eye On Your Data](/assets/img/establishing-data-mesh-fractal-enterprise-ensuring-quality-selman-mywfc-6e94ddeb1d.jpg) Keeping An Eye On Your Data Jonathan Reichental, PhD 3 years ago](https://www.linkedin.com/pulse/keeping-eye-your-data-jonathan-reichental-ph-d-)

[![Shadow IT & Dark Data](/assets/img/establishing-data-mesh-fractal-enterprise-ensuring-quality-selman-mywfc-2711ce9b3b.jpg) Shadow IT & Dark Data Heiko Specht 5 months ago](https://www.linkedin.com/pulse/shadow-dark-data-heiko-specht-kkhdf)

[![Data Governance: Why Data Mesh and Microsoft Fabric are a good fit.](/assets/img/establishing-data-mesh-fractal-enterprise-ensuring-quality-selman-mywfc-073f281c04.jpg) Data Governance: Why Data Mesh and Microsoft Fabric… Ali Nadre, MSc 3 years ago](https://www.linkedin.com/pulse/data-governance-why-mesh-microsoft-fabric-good-fit-ali-nadre)

- Microsoft provides integration between Purview and these MDM ISVs (Independent Software Vendors for Master Data Management). For example, Purview + Profisee integration (available via Purview’s partner connectors) allows mastered data from Profisee to be visible in the Purview catalog. So, if Your company uses Profisee to master customer data, Purview can list the “Customer” entity and show which source systems feed it and which domain owns it. Data stewards can even initiate actions in Profisee from Purview’s interface, establishing a governance workflow.
- Similarly, Purview + CluedIn integration is offered. CluedIn can push its discovered metadata and lineage into Purview, and vice versa. In effect, CluedIn could serve as the backend that does the heavy lifting of data unification and cleaning, and Purview as the frontend to view the results and govern them. If CluedIn is detecting data quality issues or duplicates, those could surface as alerts in Purview.

Azure Databricks can also integrate with MDM or DQ tools by API. For instance:

- A Databricks ETL notebook could call the Profisee API to get a reference data set of standardized country codes to validate a Bronze dataset.
- Or after preparing a Silver table, Databricks can call a Quantexa service or function to do entity resolution across records.

Speaking of Quantexa: this is a powerful tool for contextual data quality and entity resolution. Quantexa’s Decision Intelligence platform can link disparate data to find relationships (for example, linking a client appearing in two systems by fuzzy matching of name/address). Recently, Quantexa introduced “Unify” for Microsoft Fabric to perform AI-powered entity resolution within the Fabric environment[[2]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Equantexa%2Ecom%2Fpress%2Fquantexa-introduces-ai-powered-workload-for-microsoft-fabric%2F&urlhash=_mwc&trk=article-ssr-frontend-pulse_little-text-block). This can automatically match and consolidate records of the same entities (people, organizations, locations) across huge data volumes with high accuracy (they report linking 60 billion records with 99% accuracy)[[2]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Equantexa%2Ecom%2Fpress%2Fquantexa-introduces-ai-powered-workload-for-microsoft-fabric%2F&urlhash=_mwc&trk=article-ssr-frontend-pulse_little-text-block). Quantexa running inside Fabric means:

- It reads data from OneLake, cleanses and matches it (e.g., finds that “John Doe” in one dataset is the same as “J. Doe” in another).
- It can output a knowledge graph of connected entities and also write back the unified view into OneLake for others to use[[2]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Equantexa%2Ecom%2Fpress%2Fquantexa-introduces-ai-powered-workload-for-microsoft-fabric%2F&urlhash=_mwc&trk=article-ssr-frontend-pulse_little-text-block).
- It provides data quality dashboards in Power BI to show issues like what percentage of records were merged or potential duplicates that need human review[[2]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Equantexa%2Ecom%2Fpress%2Fquantexa-introduces-ai-powered-workload-for-microsoft-fabric%2F&urlhash=_mwc&trk=article-ssr-frontend-pulse_little-text-block).

In our blueprint, we might use Quantexa for domains like customer data or candidate data where entity duplication is a challenge. For example, each country might have the same multinational client under slightly different names – Quantexa can identify those and produce a common identifier or link, improving quality for analytics without necessarily forcing every source through a rigid MDM process. It complements MDM by handling cases where we might not have a single global key upfront. By integrating Quantexa’s results into the data pipeline, Your company ensures higher data usability (no accidental double-counting of what is actually the same client) and better quality for machine learning (more complete data on each entity).

Other tools like Great Expectations (GX) can be directly integrated in Azure Databricks or even Microsoft Fabric notebooks (Fabric supports Python notebooks where you could pip install GX). There’s guidance for using GX in Fabric to validate data as it flows. This could be part of each domain’s engineering blueprint – e.g., a standard GX test suite for each new data asset, and storing the test results (pass/fail) which can be surfaced in Purview or logs. Great Expectations can also output Data Docs (HTML summaries of data tests) that could be published for transparency.

### Technical enforcement of contracts:

- We can implement a “contract test harness.” For each data product, especially if delivered as a data share or API, create automated tests that run (perhaps nightly) to verify the contract. For example, test that “no schema change occurred unless version was incremented” (this could be done by comparing the current schema in Purview or in the database to a saved schema snapshot), or test that “data was delivered by the agreed time” (by checking timestamps/row counts in the table).
- If any of these tests fail, raise an alert to both producer and consumer stakeholders. Azure Monitor or Logic Apps or Fabric RTI (Real Time Intelligence) could be used to send an email or Teams message to a governance channel: “Alert: Data Contract breach – Dataset X not updated today by deadline.”
- In Azure, one could also use Event Grid to notify of certain events (like Data Factory pipeline failure or delay) which might indicate an SLA miss, and have subscribers (functions) that handle those events (maybe by creating an incident ticket).

One more important aspect is making data discoverable to consumers (part of democratization). Purview’s catalog is key, but also Power BI as a self-service tool can be leveraged. With Fabric, data items in OneLake can be directly analyzed by Power BI. Data contracts could be tied into the Power BI usage by endorsing certified datasets. For instance, a Gold dataset that meets all quality criteria and has an active contract with business sign-off can be marked “Certified” in Power BI, telling all users this is a trusted source for, say, “Finance Actuals”. Power BI and Purview exchange metadata, so a user browsing Purview finds the dataset and sees it’s certified and maybe sees the contract summary and then can click to open it in Power BI for analysis.

All these Azure components are managed with Infrastructure-as-Code (ARM/bicep or Terraform) and DevOps pipelines to ensure reproducibility across environments (Dev/Test/Prod for each domain’s data pipelines). This also ensures that standards like data quality checks are deployed uniformly.

## Governance, Processes, and Roles for Sustained Data Quality and Access Management

Technology alone is not sufficient – organizational governance is crucial. Given the limited central IT power and the need for local domain buy-in, a federated governance operating model is recommended. This means establishing enterprise-wide standards and oversight, but executing data quality and sharing policies through the domain teams in a coordinated way.

### Federated Data Governance Structure

1. Central Data Governance Board/Council: Form a board comprising members from central data office (e.g., Chief Data Officer, Data Governance Lead) and representatives from key domain teams (perhaps each business unit appoints a Data Governance Champion). This board sets the policies, standards, and frameworks. For example:

- Define what metrics define “data quality” for the company and target thresholds (e.g., completeness > 95% for critical data).
- Approve a standard template for data contracts, and decide where they are documented.
- Set rules for data classification (what data is sensitive vs open) and privacy requirements (possibly declaring “personal data must only be shared via anonymized methods” as a policy).
- Decide on tools and approaches (like endorsing the use of an MDM tool, deciding that all domains must use Purview, etc.).
- Crucially, this board will adjudicate on any cross-domain data issues. Because in a decentralized environment, conflicts can arise (one domain’s data changes can affect another). The board provides a venue to resolve such issues and enforce accountability.

The Data Governance Board should meet regularly (e.g., monthly) and include business stakeholders, since data quality and sharing is as much a business concern as IT. Including domain representatives ensures local teams have a voice in policy-making – which is key to getting their buy-in. They won’t feel policies are just imposed by central; they helped create them. This addresses the political challenge that local units with bigger budgets might block central initiatives – by having them at the table, you turn them into owners of the solution.

2. Data Owners and Data Stewards in Domains:

- Data Owner (Domain): Usually a senior person in the business domain (e.g., Head of HR Systems for HR domain) who is ultimately accountable that the data produced by that domain is accurate, secure, and fit for purpose. This person signs off on data contracts from the producing side and allocates resources to data improvement as needed.
- Data Stewards (Domain): These are the hands-on guardians of data quality in each domain. A data steward’s duties include monitoring data quality metrics, investigating issues, coordinating cleansing efforts, and ensuring metadata is up to date for their domain’s data products. They “own” the data contract details daily. As DataGalaxy describes, stewards ensure domain data is high-quality, work across teams to fix issues, maintain metadata, and enforce governance policies locally[[1]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Edatagalaxy%2Ecom%2Fen%2Fblog%2Fdata-governance-roles-in-data-mesh%2F&urlhash=mIRT&trk=article-ssr-frontend-pulse_little-text-block). They also collaborate with other domain stewards when data crosses boundaries.
- Data Product Managers (if applicable): In a data mesh, some organizations appoint a data product manager for each data product or for each domain’s portfolio. This role treats data as a product – engaging with consumers to understand requirements, prioritizing improvements, and managing the lifecycle (much like a software product owner or manager). They would be involved in negotiating contracts and making sure the data product meets consumer needs.

3. Central Data Platform & Governance Team ( IT ):

- A small central team in IT (maybe the “Analytics Platform Team” or “Center of Excellence”) that maintains the core platform (Fabric, Purview, Databricks) and builds re-usable pipeline frameworks. This team ensures the tooling for quality checks, MDM integration, and security are working. They also help domains onboard to the platform and provide advisory on implementing standards. For instance, if a domain lacks a skilled data engineer to set up Great Expectations, the central team might assist initially.
- This team also monitors overall compliance. They use Purview’s reports or custom monitors to see if domains are following the rules (e.g., ensuring all critical datasets are cataloged, checking that PII information has proper labels). They do not fix data quality – that’s for domains – but they might flag issues. Essentially, they are the custodians of the governance framework.

4. Data Governance Office / CDO: If Your company has a Chief Data Officer or equivalent, that function plays a policy-setting and evangelism role. It coordinates between business and IT, ensures alignment with privacy offices (GDPR compliance), and importantly drives cultural change. The CDO’s office would sponsor training programs for local teams to understand data governance and quality best practices. They also help measure the business impact of improved data quality (e.g., show that after implementing these practices, decision-making speed or accuracy improved, etc., to maintain buy-in).

### Key Processes to Establish

To operationalize the above structure, certain processes need to be defined:

Data Product Onboarding Process: Whenever a domain wants to create a new data product (say a new dataset to share), there should be a process:

1. Design Phase: Domain data team drafts what the product will be, and identifies potential consumers.
2. Contract Definition Meeting: Producers meet consumers (facilitated by data steward or product manager). They discuss requirements and draft the data contract (covering scope, schema, SLAs, privacy considerations).
3. Approval: Possibly the Data Governance Board or a subset must approve the new product and contract – mainly to ensure it meets standards and doesn’t duplicate something that exists.
4. Registration: The product is registered in Purview with all metadata, and the contract details recorded.
5. Technical Setup: Central platform team helps ensure pipelines, quality checks, and security are configured according to the contract (for instance, setting up Purview scans or enabling encryption or obfuscation).
6. Announcement: The new data product is advertised on whatever data marketplace or portal Your company uses, so that others know it’s available. This fosters re-use and prevents shadow systems.

Data Quality Issue Resolution Process: Despite best efforts, issues will arise (e.g., a data feed fails and some data is missing, or an unexpected data anomaly is discovered). For this:

- Users/consumers need a way to report data issues. This could be as simple as raising a ticket or as integrated as a feature in the data catalog (“flag data issue” button). Consumers should report issues back to producers (as noted in MS guidance: consumers report inconsistencies via a feedback loop[[3]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fazure%2Fcloud-adoption-framework%2Fscenarios%2Fcloud-scale-analytics%2Fgovern-data-quality&urlhash=dcjK&trk=article-ssr-frontend-pulse_little-text-block)).
- Once reported, the domain data steward assesses the issue. If it’s within their control (e.g., data entry error in source), they coordinate with the source system owners to fix it at the root. If it’s a contract breach (e.g., data was delivered late or incomplete), the steward addresses the cause (maybe pipeline failure) and communicates to affected consumers along with a remediation ETA.
- If issues persist or are severe, escalate to the Data Governance Board. For example, if a particular domain chronically delivers poor data affecting others, the board might intervene to allocate more resources to that domain or adjust the contract.
- Maintaining a data quality log and improvement backlog is useful. Each domain can maintain a list of known data quality improvement tasks (like “improve address completeness for candidates in Region X”) and this can be tracked, showing continuous improvement.

Change Management for Data Contracts:

- If a producer wants to change something that impacts the contract (like modify schema or reduce update frequency), they must follow a formal process. Typically, they inform all consumers (perhaps via the catalog or an email distribution that Purview can manage) and maybe bring the proposal to the governance board if it’s major. There should be a required notice period (e.g., 2 sprints notice).
- During that notice period, consumers have the opportunity to raise concerns or adapt their systems. The change is done in a controlled fashion (maybe running old and new schema in parallel for a time).
- The contract document and metadata are updated accordingly once all agree.
- Conversely, if consumers need something new (like a new field), they request a contract update through the steward; the producer evaluates feasibility, etc. This is much like Agile backlog refinement between producer and consumer teams.

Access Request and Approval: Data democratization doesn’t mean open free-for-all, especially for sensitive data. A clear process should define how someone in Your company requests access to a data product:

- Ideally, the data catalog (Purview) can serve as the request interface. A user finds a dataset and clicks “Request Access”. This triggers a workflow to the data owner.
- The data owner (and maybe steward) reviews the request: Does this person have a legitimate need? Is the data classified such that it requires manager or legal approval? Perhaps for public data, auto-approve; for confidential data, require the person’s manager and the data domain’s steward to approve.
- Once approved, implement access: this could mean adding the user to an Azure AD group that has read permissions on the underlying data in a lake or giving them access to a Power BI dataset, etc. Ideally automate this with Purview’s policy engine or at least with scripts to avoid manual errors.
- Record the access grant in a log for compliance (who has access to what).
- Include a periodic review – e.g., every 6 months, data owners should review who all has access to their domain’s sensitive data and revoke those no longer needed. Alternatively you can automate accesses being revoked unless consumers re-subscribe every x months.

This process helps avoid oversharing risk – ensuring only authorized people get access and there is traceability. It also fights the risk of data not being accessible – by making the request process easy and visible, users are less likely to try to bypass governance. A frustration in many companies is not knowing where to get data or waiting too long for approval; by streamlining this, we encourage proper usage of the data marketplace instead of renegade approaches.

- Privacy & Compliance Review: Integrate with existing privacy office processes. For example, if a domain wants to release a new data product that includes personal data, perhaps require a quick Privacy Impact Assessment where the DPO (Data Protection Officer) or a privacy steward reviews the plan (are we masking fields? do we have consent? etc.). They might mandate using a technique like Decentriq or Sarus for certain highly sensitive use-cases. Having privacy stakeholders involved from the start prevents legal issues later and also reassures local teams that compliance is being addressed centrally (so they feel safer sharing their data).

### Balancing “Democratization” vs “Control”

Managing the risk of oversharing vs data inaccessibility is essentially balancing openness with security:

To prevent oversharing (leaking sensitive info), the governance framework sets clear data classification and handling rules. Each data product should be classified (Public/Internal/Confidential/Restricted, etc.). This classification then determines the controls:

- For highly sensitive data, enforce that it only exists in a secure environment (such as an enclave or only aggregate outputs). Or ensure it’s available only to specific personas. For example, raw personal data might never be put in a broad-access lake at all – instead only the anonymized version is in the mesh.
- Use automated scanners (Purview) to detect sensitive data in any new dataset and flag it. If a domain accidentally put a file with unmasked PII into the lake, Purview can identify that (via built-in detectors for phone, email, etc.) and immediately an alert can be sent to the steward to remediate (maybe by running Presidio retroactively or moving it to a restricted area).
- Non-compliance with data handling (e.g., someone sharing data outside the approved channels) should be addressed with the support of management – basically make it known that circumventing governance is not okay. However, also ensure the governance is not so draconian that people feel the need to circumvent it to do their job.

To prevent under-sharing (data silos and inaccessible data), the culture and leadership need to emphasize the importance of data sharing for enterprise benefit. Some points:

- Incentivize local teams: If a local business unit fears that sharing their data gives up “control” or doesn’t benefit them, align incentives. For example, include successful data product adoption as one of their KPIs, or ensure they also consume others’ shared data to drive home mutual benefit. Often, once domains see useful data coming in from others, they’re more willing to reciprocate.
- Show quick wins: Start with a use case where sharing data clearly yields value (perhaps a combined report that helps multiple countries, or a machine learning model that improves something using cross-domain data). When local teams see positive outcomes and maybe even cost savings (maybe centralizing some reports means they do less work locally), they will be more amenable.
- Self-service tools: Provide user-friendly tools like Power BI and a rich catalog so that accessing data is not a convoluted IT request. The easier it is to find and use data (within allowed bounds), the more people will use the governed path rather than saying “forget it, I’ll export my own copy”.
- Training and Communication: Regularly communicate the governance processes and their benefits. If people know, “I can request data through Purview and I’ll likely get it in a day if approved” they are less frustrated than if they don’t know how to get it at all. Also, train data stewards in each domain to be ambassadors who help users navigate these processes.

### Roles that need to be staffed

Summarizing the roles implied above, Your company should ensure the following roles/functions are in place:

- Chief Data Officer (CDO) or equivalent leader to champion data as an asset and oversee data strategy.
- Data Governance Lead/Manager (possibly under the CDO) to run the governance program day-to-day, coordinate the council, maintain policies.
- Platform Owner/Lead (within IT) for the data platform (Fabric & Purview). This person ensures the platform meets all stakeholder needs and evolves with scale[[1]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Edatagalaxy%2Ecom%2Fen%2Fblog%2Fdata-governance-roles-in-data-mesh%2F&urlhash=mIRT&trk=article-ssr-frontend-pulse_little-text-block).
- Domain Data Owners for each major domain (HR, Finance, Sales, etc.).
- Domain Data Stewards for each domain (could be full-time in larger domains or a responsibility taken by a business analyst/IT person in smaller ones). Their role is critical for quality management and serving as liaison with central governance[[1]](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Edatagalaxy%2Ecom%2Fen%2Fblog%2Fdata-governance-roles-in-data-mesh%2F&urlhash=mIRT&trk=article-ssr-frontend-pulse_little-text-block).
- Data Engineers/Analysts in each domain who actually build and maintain the pipelines and data products, following the standards.
- Data Product Managers or Data Analysts who interface with business users to manage requirements and ensure the data product is usable and valuable.
- Privacy Officer / Security Officer involvement to ensure compliance aspects are handled (they might not be dedicated to data mesh only, but they should be part of the governance workflow).
- Support roles: If using tools like CluedIn or Quantexa, there might be specialist roles for those (e.g., an MDM specialist who configures matching rules in the MDM, or a Quantexa analyst who fine-tunes entity resolution rules).

In a scenario of limited central IT budget, not all these roles are full-time hires. Often one person can wear multiple hats (e.g., the same person might act as platform lead and also as one of the central governance members; a domain’s IT manager might act as data owner and steward if needed). The key is that responsibilities are clearly assigned, even if not everyone’s title is “Data Steward”. We want to avoid ambiguity like “everyone thought someone else was responsible for data X, so no one fixed its quality”.

### Continuous Governance and Adaptation

Implementing such a framework is an iterative journey. Your company should start small – perhaps pilot in a couple of domains with cooperative teams – and then refine the processes. Over time:

- Regularly review the governance processes effectiveness (through the Board). Are access requests being handled in a timely way? Are data contracts actually being followed or are there frequent breaches? Use these insights to adjust processes or invest in better tooling.
- Evolve the technology: as the wider Microsoft ecosystem releases new features (Fabric is evolving quickly), adopt those that help (for example, automated data contract tracking if it were to become a feature).
- Keep communication channels open: a Community of Practice for all data stewards across domains can help them share tips and challenges, creating a support network. This bottom-up communication often catches issues early (e.g., if a policy is too burdensome, stewards can raise it and the governance team can refine it).

Last but not least, executive support and culture must reinforce that data is a shared asset. Leaders at Your company should celebrate successes of data sharing (e.g., “thanks to data from X and Y domains, we achieved Z insight that helped business”). When local teams see recognition and positive outcomes, it builds trust. Conversely, leaders should discourage the “my data, my silo” mindset – perhaps even including collaboration in performance reviews. Over time, with the right tech foundation and governance, the organization will move toward treating data with the same rigor as finances – governed, audited, and employed to maximum benefit.

## Conclusion

In summary, establishing a Data Mesh in a large, distributed enterprise requires both robust technology enablement and strong federated governance. By using Microsoft’s data stack – Azure Databricks, Microsoft Fabric, and Purview – complemented with MDM and privacy-enhancing tools, we can create a standardized yet flexible data architecture. Data quality is continuously improved “from the left” by validating at source and using MDM to unify core data. Meanwhile, data contracts at the consumption layers ensure each data product comes with clear expectations, documented in Purview and enforced via pipeline checks and governance oversight.

This approach addresses the twin risks of poor data quality and improper data sharing. Technically, it industrializes data management with automation for quality checks, metadata cataloging, and privacy protection (masking or clean rooms), forming a blueprint that domains can follow. Organizationally, it establishes the roles, processes, and committees needed to maintain standards and align domain teams with the enterprise vision. By involving local teams in governance and providing them with the tools and autonomy to manage their data products, we secure their buy-in – they remain empowered owners of their data, now contributing to a larger mesh ecosystem.

The result is a scalable, democratized data environment: Local domain experts ensure data is high quality at the source, central governance ensures it’s cataloged, safe, and interoperable, and all users can discover and utilize data products confidently through well-defined contracts. Your company can then truly treat “data as a product” and reap the benefits of better analytics and decision-making at scale, while keeping both data quality and data privacy under control.

If you're still reading - thank you for sticking around.

## References

[1] [Data governance roles for data mesh environments - DataGalaxy](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Edatagalaxy%2Ecom%2Fen%2Fblog%2Fdata-governance-roles-in-data-mesh%2F&urlhash=mIRT&trk=article-ssr-frontend-pulse_little-text-block)

[2] [Quantexa Introduces AI-Powered Workload for Microsoft Fabric](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Equantexa%2Ecom%2Fpress%2Fquantexa-introduces-ai-powered-workload-for-microsoft-fabric%2F&urlhash=_mwc&trk=article-ssr-frontend-pulse_little-text-block)

[3] [Data quality - Cloud Adoption Framework | Microsoft Learn](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fazure%2Fcloud-adoption-framework%2Fscenarios%2Fcloud-scale-analytics%2Fgovern-data-quality&urlhash=dcjK&trk=article-ssr-frontend-pulse_little-text-block)

[4] [Sarus - The Privacy Layer for Analytics & AI](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Esarus%2Etech%2F&urlhash=bAzP&trk=article-ssr-frontend-pulse_little-text-block)

[5] [Decentriq | Microsoft Learn](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fazure%2Fconfidential-computing%2Fpartner-pages%2Fdecentriq&urlhash=zsf8&trk=article-ssr-frontend-pulse_little-text-block)

[6] [Home - Microsoft Presidio - GitHub Pages](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fmicrosoft%2Egithub%2Eio%2Fpresidio%2F&urlhash=iQEQ&trk=article-ssr-frontend-pulse_little-text-block)

[7] [Articles by Piethein Strengholt’s Profile - Muck Rack](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fmuckrack%2Ecom%2Fpiethein-strengholt%2Farticles&urlhash=CgP-&trk=article-ssr-frontend-pulse_little-text-block)

[8] [5 Data as a product - Data Mesh in Action - Manning Publications](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flivebook%2Emanning%2Ecom%2Fbook%2Fdata-mesh-in-action%2Fchapter-5%2F&urlhash=NOC0&trk=article-ssr-frontend-pulse_little-text-block)

[9] [Chapter 10. Modern Master Data Management - O'Reilly Media](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Eoreilly%2Ecom%2Flibrary%2Fview%2Fdata-management-at%2F9781098138851%2Fch10%2Ehtml&urlhash=ezpU&trk=article-ssr-frontend-pulse_little-text-block)

[10] [Microsoft Purview and CluedIn Master Data Management (MDM)](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fpurview%2Fdata-governance-master-data-management-cluedin&urlhash=ic1B&trk=article-ssr-frontend-pulse_little-text-block)

[11] [Piethein Strengholt – Medium](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fpiethein%2Emedium%2Ecom%2F&urlhash=NqSF&trk=article-ssr-frontend-pulse_little-text-block)

[12] [Data Quality for Fabric Lakehouse in Unified Catalog](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fpurview%2Funified-catalog-data-quality-fabric-lakehouse&urlhash=Vi-A&trk=article-ssr-frontend-pulse_little-text-block)

[13] [Differential Privacy Page - Sarus](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Esarus%2Etech%2Fproduct%2Fdifferential-privacy&urlhash=-5PF&trk=article-ssr-frontend-pulse_little-text-block)

[14] [FY22 Field Landing -](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Finfo%2Emicrosoft%2Ecom%2Frs%2F157-GQE-382%2Fimages%2FEN-WBNR-SlideDeck-SRDEM109173%2Epdf&urlhash=uJZ4&trk=article-ssr-frontend-pulse_little-text-block) [info.microsoft.com](https://www.linkedin.com/redir/redirect?url=http%3A%2F%2Finfo%2Emicrosoft%2Ecom&urlhash=8iKe&trk=article-ssr-frontend-pulse_little-text-block)

[15] [Master Data Management in Microsoft Purview | Microsoft Learn](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flearn%2Emicrosoft%2Ecom%2Fen-us%2Fpurview%2Fdata-governance-master-data-management%23partner-mdm-integration-with-microsoft-purview&urlhash=mD0d&trk=article-ssr-frontend-pulse_little-text-block)

[16] [Data protection with Microsoft Purview and the CDMC framework | Microsoft Security Blog](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Emicrosoft%2Ecom%2Fen-us%2Fsecurity%2Fblog%2F2023%2F04%2F24%2Fgetting-started-with-the-cdmc-framework-microsofts-guide-to-cloud-data-management%2F%3Fmsockid%3D2043ce8c330166493f38db55329167f3&urlhash=tLci&trk=article-ssr-frontend-pulse_little-text-block)
