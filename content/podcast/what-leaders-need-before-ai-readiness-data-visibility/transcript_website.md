# Business Mission Control — Episode 1: What Leaders Need Before AI Readiness: Data Visibility

[Watch on YouTube](https://www.youtube.com/watch?v=WqGvHDi91A8) · Published 24 April 2026 · 28:06

**Speakers:** Estera Kot (CTO, Clouds on Mars) · Sebastian Selman (Consulting Lead Switzerland, Clouds on Mars)

_Transcript of the published episode, lightly edited for readability. Timestamps match the video._

---

### Teaser

**[00:05] Estera Kot:** The way how you write the data transformations may differ. Sometimes, of course, the tool, but also the way how you combine the different methods that you run on your data, on your files.

**[00:18] Sebastian Selman:** Now you're getting me excited. The question is, is there a way of marrying the reality that enterprises face nowadays with the tooling that can deliver on their requirements?

**[00:30] Sebastian Selman:** If executives are willing to accept that not everything is going to be there from day one, they could get their hands on data that is relevant to their decision making within weeks.

### Conversation

**[00:44] Estera Kot:** Hey everyone, welcome. This is Estera, and today with me I have a special guest.

**[00:49] Sebastian Selman:** I'm Sebastian.

**[00:50] Estera Kot:** Hey Sebastian.

**[00:52] Sebastian Selman:** Hello, pleasure being with you.

**[00:54] Estera Kot:** And usually we record that Fabric Espresso, a very technical, architects, engineering related podcast. But right now we are switching to describing the reality of those different tools, the complexity of them, but for executives and for business. So the name of this series, of this podcast is going to be.

**[01:19] Sebastian Selman:** Business Mission Control.

**[01:21] Estera Kot:** Why Mission Control?

**[01:23] Sebastian Selman:** My target within these conversations probably would be to get access to your big, beautiful brain that I know is full of technical expertise, but take a look at it from a business perspective and ask, okay, what's in it for the business stakeholders? Because I think if we're unable to connect technical development to business value, it's an interesting nerdy hobby, but, and like I say nerd with the utmost respect for people, don't get me wrong, but it needs to eventually translate into value for society, right?

**[02:03] Estera Kot:** Agree, and whatever we are doing, it's a mission. That's why Business Mission Control.

**[02:11] Sebastian Selman:** I wanted to talk with you about the question of how enterprises deal with historically grown data architectures and enterprise data estates sprawling across a multiplicity of tools, right?

**[02:31] Estera Kot:** You mean mess puzzles?

**[02:33] Sebastian Selman:** Yeah, a lot of people like to talk about data mesh. I think we need to start with data mess first. I think the reality that I observe with many enterprises that I'm in touch with is that they either do not have a clearly defined data strategy. It might be implicit. There for sure is people who have preferences or opinions, but it's never been written down properly. That's one thing that I observe for, I mean, not for all, but for many. The second thing that I would observe is even if it is written down, it has not necessarily been executed with rigor and discipline. Let's imagine a large enterprise. You've got maybe some central domain or a mother organization that maybe has, through mergers and acquisitions, acquired several divisions or subdivisions. But if you are now C-level in the mother organization, in the holding of maybe a holding structure, you've got no means to run analytics across the entire data estate. You've got no means of putting data into perspective. So while you might have access to the reporting for Business Unit 1 or the reporting of Business Unit 2, it's really difficult to compare Business Unit 1 and 2 to one another.

**[04:05] Estera Kot:** Or have the data that in fact you need to lead a company. At the same time, we need trends and the data on the level that we can combine and simulate, like have a digital twin of the company.

**[04:16] Sebastian Selman:** Exactly. So what we end up with is maybe functional business units, but a leadership team on the highest level of the enterprise that doesn't have the data or the insights into their data that they would need to actually come to data-driven decisions. So to summarize, I think what you observe in many places is either you don't have a data strategy, at least it's not explicit, and it has not been agreed upon that this is how we do things here. So it might be a paper somewhere, but it definitely is not yet at least reality. Or you have an implicitly lived data strategy that probably is different for different parts of your business, and that does not have a cohesion or a common red thread that pulls everything together so that you can do data-driven decision making.

**[05:16] Estera Kot:** Agree. Because once we have data, we can have data-driven decisions, and then we can have data ready for AI. At the same time, okay, you wrote a data strategy. Usually, like those big four, five, whatever the number is, they spend a significant number of weeks just on writing your data strategy. And once they finish, the strategy needs to be updated. This strategy in many times is based on the pillars, objectives, not on choosing a single platform. So they are leaving you with a decision whether I should go with a tool named A or tool named B.

**[05:56] Sebastian Selman:** So one thing that happened over the last 50 years, maybe, is if you look at product life cycles or production life cycles and the methodologies that describe how things are being done in enterprises, and you then look at the visuals that represent those methodologies. So that's three steps, right? They move from linear visualizations increasingly into loops and cycles and cyclical models, right? So we've moved increasingly from waterfall to agile, from...

**[06:42] Estera Kot:** You mean from structure to the mess?

**[06:44] Sebastian Selman:** Well, from structure to the mess, but also from one way that was suitable to coping with reality in the past to something that is more suitable to coping with reality as it currently is. And I think the methodologies are the sediment of people working through problems and finding ways that work for them. One thing that apparently seems not only to be a buzzword, but also seems to be working better for enterprises, is moving into cyclical models and reducing delivery timelines and working in increments and accepting that something is not done, but is a living product that will require being updated.

**[07:29] Estera Kot:** I would love to ask you for some tangible example.

**[07:32] Sebastian Selman:** Okay, so if in the 1980s, I'll say, you were developing a product, likelihood of that not being a software product, but being a physical product generally was higher. I think if we were to look at GDP across any nation in the 1980s, you would have a lot more of that GDP being driven by actual manufacturing rather than service companies or software companies. And if you compare that to modern data, you would find that a lot more of GDP is being driven by services and software.

**[08:12] Estera Kot:** And you mean the services and software is not perfect, I mean, not fully ready as from the physical products, we expect some perfection, some readiness certification.

**[08:26] Sebastian Selman:** Potentially.

**[08:28] Estera Kot:** Standards.

**[08:28] Sebastian Selman:** We do also expect standards and certification in software nowadays, but still, if you compare production companies in the 1980s and how teams were being run back then, with how software teams or squads are being run nowadays, there is a reason that the Spotify model is the Spotify model and everybody knows of, not everybody, many people know and try to emulate the Spotify model. So the point that I'm trying to get to is we might need to accept that things are not perfect in favor of them being available and working. But that is only acceptable if we shorten the distance between the business who's using that product and the part of the organization who's producing that product. So I think one movement that we will need to see in organizations in order to be successful is that they reduce the gap between business and IT and that we observe less of what is commonly referred to as throwing things over the fence. And throwing things over the fence could be requirements, like this is what I need to be done, deal with it, dear IT. But it also can refer to the other direction of throwing things over the fence where you basically build something and say, well, this is how it is now, dear business, cope with it, next update will only come in two years after the next budget run. Both are unacceptable.

**[10:07] Estera Kot:** So the way how we create the software has changed. In the past, Waterfall, we could, as you mentioned, collect the requirements, build the product, then offer, sell it. At the same time, right now, we have this concept of proof of concept, proof of value, doing lots of pilots. Why? Basically, because we need to test the technology on your environment, on your data, instead of, yes, in the beautiful theory, in a book, it works, or on a paper, it works. And at the same time, you have different data, different data types. The way how you write the data transformations may differ. Sometimes, of course, the tool, but also the way how you combine the different methods that you run or on your data, on your files, also, they differ.

**[11:02] Sebastian Selman:** Is there a way of marrying the reality that enterprises face nowadays with the tooling that can deliver on their requirements?

**[11:14] Estera Kot:** Yeah, I think that here, I have this metaphor of, again, I love personally, I love Dysons. This is not an ad.

**[11:22] Sebastian Selman:** Dyson as in the vacuum cleaner.

**[11:24] Estera Kot:** Vacuum cleaner, yes. I have two. And when I look at the history of Dyson, again, this is an amazing product, building also hair dryers and different types of machine, but the engine is always the same. And I believe that fundamentally, they changed how we clean our homes, because they have one engine, one tube, and lots of extensions and things that you can basically change to make sure that you can deal with carpet, wooden floor, everything.

**[12:00] Sebastian Selman:** You've got a small attachment for the small corners in your flat to clean out your car or whatever.

**[12:09] Estera Kot:** And you buy different models of Dyson and connect them. Everything works. And you don't need a cable. That's the change. You don't need a cable anymore, because it's just portable. And if you take a look, it's kind of an analogy of, okay, we have different data sources, different tools that every department bought for themselves. We have different ERP system. And

**[12:38] Sebastian Selman:** System as in one or many ERPs? Because I've seen both.

**[12:43] Estera Kot:** Yes. So basically, fully agree, we can have whatever the creativity of the employees.

**[12:51] Sebastian Selman:** Insert a number of ERPs and CRMs and business units specific.

**[12:56] Estera Kot:** But at the end, it's just about exporting Excel files, right? Majority of the business people, like majority of the tech people are still using, calculating, forecasting, just with the use of Excels. And having so many different tools, we just... Let's take a look at the data. Again, at the end, there are just strings or text. There are some characters. There are some numbers. Of course, there are some files, but this kind of a more rare scenario. Usually, we are talking about just the numbers.

**[13:30] Sebastian Selman:** Okay, so you're primarily focused on structured or semi-structured data here.

**[13:34] Estera Kot:** So it's a beautiful case when, okay, so we need a Dyson, a tool that has some endings that...

**[13:42] Sebastian Selman:** Some adapters to suck in all of that data.

**[13:45] Estera Kot:** Exactly, to connect to the source and then, yeah, to take it for the further processing. That's why if we take a look at the modern data platforms, they are calling lakehouses. Whether the houses are either close to the sea or the lake, it doesn't really matter. But for us, it means that basically I can connect to any data sources coming from very different tools. Sometimes those tools can be still on-premise, meaning that you don't have to use cloud or one cloud. You can use a very different one. Let's start with warehouses, systems where we start tabular data, structured data, and we needed to have a system that is running all the time. And we are paying for using that, in storing the data, but also running the server all the time. And the change, the fundamental change coming with lakehouses is that storage is decoupled from compute. It means that you have the structured data and also unstructured. But now let's focus on the most typical scenario, the structured data saved in the storage. But many times you can have on-premise, so local, but also in a cloud. Storing data in a cloud is super cheap. It's just a few bucks for petabytes of data. And what's the most costful is the engine, as I mentioned, because storage is decoupled from compute, you pay separately for the storage and separately for the compute. So if you do not process this data, if you do not query, visualize, and so on, you do not pay because you just store. And lakehouses, so the modern data architecture based on lakehouses, are giving you functionalities which we known for many years coming from data warehouses, the warehousing world, at the same time with lower costs. Structured data, the data that we usually have coming from the different systems, for example, finance, sales, HR, whatever the tool they are using, the most popular are saving the data in those formats, so tabular data. So data in the form of the table. At the same time, the entire world of the IoT is about the stream of data, the entire world about the legal forms is the world of files, PDFs, and so on. And having one system that we're storing both, meaning tabular, structured and unstructured, unstructured meaning files is a beauty because many times if we want to, for example, have a system where I can just ask a query to my data about find me some invoice, which I spent, for example, a thousand of francs or more, then this system needs to have like those both types of data structured, tables, maybe registry of invoices, and unstructured, having the physical invoice, like physical, I mean digital, but still I want to take a look. How

**[17:07] Sebastian Selman:** do we go about and solve this?

**[17:10] Estera Kot:** So now let's talk about the solution. And there are a few that are on the market that we can recommend or discuss at the same time as a former member of Microsoft Fabric Product Group was part of building this service, which is for me, Dyson, Dyson for the enterprises that they do not have either a time to stop their business or rewrite and then execute the data strategy. And they want to just have one tool that will meet the, you know, confront the reality that it is what it is. We want to get the 360 on our business. So we have so many different tools, so many different data sources that wants to produce the data to the dashboards for execs. That's why Microsoft Fabric as a solution that is meeting the market, meeting the reality of the enterprises, but also small and medium customers is the way to go.

**[18:17] Sebastian Selman:** Okay. So basically you're saying if my reality is that I've got nicely running business units, but no overview whatsoever of what's going on, or at least not an overview that would provide the data to me so I can make good decisions. All right. Let's step into the shoes of a CFO who needs to do financial planning. How is she or how is he going to be able to do that if they don't have a good understanding what the current cash flow looks like across the entire business and not just in single business units and then they need to do what the computations in their head or pivot a few Excel tables, because let's face it, that probably is the reality of too many people. You're saying one way forward would be let the business units do what they're doing because nobody's got time or budget to change that reality now.

**[19:20] Estera Kot:** Yeah.

**[19:21] Sebastian Selman:** But enable the C-suite or the holding or whatever is the higher level organizational unit to bring that data together with different adapters and ways of bringing data in very similar to your beloved Dyson as a metaphor. How do I go about bringing that together and establishing the data foundation so that I can take decisions? Can you talk me through what that process would have looked like in the past and how that would be different with modern tooling?

**[20:05] Estera Kot:** I would love to go into super details and also show you.

**[20:09] Sebastian Selman:** No, no, I mean, can you give us a short summary of what that could look like because I know you're able to go into detail.

**[20:16] Estera Kot:** So in a nutshell, we have to decide about, okay, one format for the data, ideally the open format, meaning the standard that at the end do not vendor lock us with choosing some tool. At this point, the state of the art is Delta Lake, Delta tables. So, okay, we have data sources. We know that we want to move them, transform them to the form of Delta tables and in between, we will use something called Data Factory or some similar tool that we basically connect with different sources. Even though there are some in cloud, some of those sources are in AWS, GCP, on-premise, SAP, very often a scenario. But basically we're using Data Factory, data pipelines. We are connecting to them and either moving or creating a live connection, mirroring that data to cloud and saving them, allowing them to land on something what we are calling OneLake. And here, OneLake, imagine what do you use for your storage in a cloud, OneDrive or One... I do OneDrive. OneDrive is for the personal data, so the storage in cloud for your personal data. Whereas the OneLake is exactly the same, but for the corporate data.

**[21:44] Sebastian Selman:** So you're saying part of the magic is that you have an open format with Delta Lake. And the other part is that you've got access to a connective tissue that can bring in data from disparate sources. Yes. So independent of whether that is on-prem or in the cloud, whether it is with one provider or another, whether it is your CRM data, your ERP data, independent of which structure it is in, we can either create a copy into OneLake or we can virtualize it. Yes. Meaning we can establish a connection that allows me to query that data wherever it currently resides.

**[22:29] Estera Kot:** Once the data, as you mentioned, is on OneLake, meaning that either physically or in a virtual way, now we just need one tool that is one BI tool that is integrated with that storage. In that case, natively, Power BI is integrated with OneLake, meaning that you build a dashboard report in Power BI and some of the data will be there available. So we just have primarily three elements. One is the data sources that are yours. Then we have ability to move them to OneLake and then a hop to Power BI.

**[23:10] Sebastian Selman:** Okay. So fundamentally, if I need to improve my decision-making, I want to do data-driven decision-making. Currently my data estate does not mean doing so. One way of going about it is connect the data to OneLake, be that through shortcuts, through virtualization, through mirroring, whatever means you're choosing. That is one way of bringing together stuff that currently is not connected. And then on top of this collection of data that previously was sitting in silos, I can establish one semantic model, one way of representing how maps into one another and establish business intelligence on top of that. I can create charts and diagrams and trends.

**[23:58] Estera Kot:** Or Copilot will create that.

**[23:59] Sebastian Selman:** Or Copilot can obviously go and do that for me. What does that do with our timeline?

**[24:06] Estera Kot:** Yeah, I think that the timeline to get the value with this new approach is, again, depends on the cases, but we are talking about proof of concept within and proof of value for your data within a week, two, three, sometimes a month, rather than half a year of the implementation just to test on your data with the old approach. So the time is drastically reduced, improved for our gain that we will see quickly the value. But also, and again, last Friday, it was leading a session in Vienna about combining the newest functionalities coming from MCP servers with GitHub Copilot. And I've proven from 24x up to more than 100, acceleration in how you deal and how you create the solutions on top of those modern data platforms. And when we switch, instead of clicking, going through different UIs, looking for configuration. So if you change this approach with a repetitive code-based approach, you can get and build a skeleton of the solution within the one hour. And of course, it's not going to be perfect, but good enough to get something tangible and then improve it. Because we are talking about 80-20 rule here, and the 80 is going to be done with the help of the new approach.

**[26:00] Sebastian Selman:** But that also means you're not going to deliver the full thing.

**[26:04] Estera Kot:** No, I will, but chunk by chunk. And also tell me about the full thing, meaning what's the definition of done? At the beginning, you mentioned waterfalls. Imagine you are going to the tailor and the first visit is on measuring you. The second is on trying and fitting you. And then the more you have, the more visit you have, you get the better result.

**[26:31] Sebastian Selman:** Okay.

**[26:32] Estera Kot:** Like tailored for you.

**[26:34] Sebastian Selman:** Tailored for you. But you also described that we're going to go from source to report within.

**[26:41] Estera Kot:** If I'm talking about showing you the value that you don't have to wait months for a report. But if you are having like 500 reports, then we have a different discussion. But here I'm showing, like I'm telling you that this story of connecting sources with the end system used by execs, it doesn't have to be so long.

**[27:04] Sebastian Selman:** So would you agree with the following? If executives are willing to accept that not everything is going to be there from day one, they could get their hands on data that is relevant to their decision making within weeks, instead of having half a year of strategizing and then half a year of probably RFPs and vendor management and then half a year of implementation.

**[27:36] Estera Kot:** If you want to get something quick and fast, this is the approach. You summarized that beautifully. Sebastian, thanks a lot. So this is our kickoff of the Business Mission Control. I'm so grateful that we had this discussion.

**[27:52] Sebastian Selman:** I'm super grateful for you sharing your thoughts and perspective, which I always highly appreciate.

**[27:58] Estera Kot:** And we'll keep going and continuing that.
