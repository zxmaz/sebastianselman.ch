# Business Mission Control — Episode 6: AI Pilots Are Designed To Pass. Production Is Not A Vacuum

[Watch on YouTube](https://www.youtube.com/watch?v=roPl_afwZfw) · Published 1 October 2026 · 19:43

**Speakers:** Estera Kot (CTO, Clouds on Mars) · Sebastian Selman (Consulting Lead Switzerland, Clouds on Mars)

_Transcript of the published episode, lightly edited for readability. Timestamps match the video._

---

**[00:00] Sebastian Selman:** Business Mission Control, Mission 006. Systems check. Coffee?

**[00:07] Estera Kot:** Oh yes, let's go.

**[00:09] Sebastian Selman:** Good. Numbers?

**[00:11] Estera Kot:** I sourced all of them.

**[00:13] Sebastian Selman:** Well then, let's strap in. This one starts with a hull breach. So two out of three. That is how many Swiss AI pilots never make it to production. And that's not a global estimate. That's measured here in Switzerland this year.

**[00:29] Estera Kot:** I guess you have a strong reference for this number. And yes, here is what should worry a board more than the failures. The pilots worked. The proof of concept, proof of value pilots, yeah, they are working. The demos are very good, nice, fast. And then the steering committee clapped. The 18 months passed and nothing landed in a P&L.

**[00:54] Sebastian Selman:** Yeah. So when I say two out of three, that is how many Swiss AI pilots never make it to production. I'm quoting the adesso GenAI Impact Report 2026. The alarming part for me is that there's no explosion. There's no alarm ringing. Nothing you could actually point to in the log.

**[01:13] Estera Kot:** Yeah. And this is how the artificial intelligence programs die. Not with a big bang, but with a small silent drift. Like a spacecraft. Just a degree off course. And at launch, nobody can see it. And 18 months later, what happened? You missed the planet.

**[01:35] Sebastian Selman:** So today's mission, for the record, please.

**[01:39] Estera Kot:** Find out why AI programs drift off course between roadmap and P&L. And bring back three course corrections you can fly next day. And yeah. Hey everyone. My name is Estera.

**[01:55] Sebastian Selman:** And I'm Sebastian. If you own an AI budget or you're about to ask for one, this transmission is for you.

**[02:03] Estera Kot:** So now let's start with saying the uncomfortable part first. So when an AI program stalls, everyone audits the technology. It's the wrong console. And the technology usually passed its tests three months ago during the proof of concept anyway.

**[02:23] Sebastian Selman:** But why does it always pass though? I mean, as a genuine question, if the tech were flaky, the pilot would catch it.

**[02:32] Estera Kot:** Yeah. It's because a pilot is designed to pass. So I've built these systems. Let me tell you what actually a pilot is. So you take the curated data, cleaned by hand for the demo. No drift, no monitoring, because there is nothing in production just to drift. No integration surface, no security, because it can just talk to the sandbox, not to your ERP. There is no permission model, because the three people are using it all the time, and all of them have admin rights. And a pilot proves that the model works in a vacuum. So production is not a vacuum. Production has a friction, a friction, and that friction is organizational.

**[03:28] Sebastian Selman:** Which does match what I see in Swiss accounts. The pilot impressed everyone, let's say in May, back in May. And in November, the same slide is still in the same deck, still labeled as pilot, with the same screenshots and the same caveats.

**[03:43] Estera Kot:** And in between, there was a security review with no owner. So it waits. Data access, nobody is allowed to sign off. So it also waits. A steering committee that meets monthly about a system that changes weekly, or even daily now with AI agents and GitHub Copilot. So basically everything waits. And six months are passing. Six months of waiting looks exactly the same as six months of crazy hacking, working, building that system. Within a week or two, we have a prototype. But then later on, we check for all of the accesses and production requirements. And this is why nobody catches the drift from the top, because we focus on value. And the value can be delivered when we have all of those integration points and enterprise-ready checkboxes.

**[04:40] Sebastian Selman:** So the adesso study, right, the GenAI Impact Report 2026, puts a number on the outcome. Of the companies that do run AI, 53% report revenue lift of 5% or more, according to the same report.

**[04:59] Estera Kot:** Yeah, we need to hold those two numbers together. And the crews that cross the gap get paid. And Beat Fluri, the CTO of Adnovum, named why most do not. 80% of organizations use lovely GenAI to see no actual business impact, because individual efficiency gains do not scale. And that's a fact; you will find a link to this report in the description of this video. So handing out licenses is not a program. A pilot without decision rights is a demo with a lovely budget.

**[05:45] Sebastian Selman:** So now the paradox. You would expect stalled programs to lose funding, but the opposite is actually happening.

**[05:53] Estera Kot:** Yep. Here BCG surveyed almost two and a half thousand executives, to be precise, 2,360 executives, for its AI Radar this year. 72% of CEOs now call themselves the primary AI decision maker. Doubled in one year. And 94% say they will keep investing even more, even if AI delivers no expected financial result within the next 12 months. So budgets are heading toward 1.7% of revenue, from 0.8 a year ago.

**[06:43] Sebastian Selman:** And I'm going to defend those CEOs, because I talked to them. Twelve months is nothing for a capability bet. So nobody demanded twelve-month returns from cloud migrations. And the companies that blinked early on, on cloud spend, are playing catch-up for the next decade. Patience is not necessarily a bug here.

**[07:08] Estera Kot:** Yes, patience with a scorecard is conviction. Patience without one is budget on autopilot. And cloud migrations could count servers decommissioned, licenses cut, workloads moved. Every quarter. And most AI programs today cannot answer one question: which number in the P&L is this supposed to move, and by when?

**[07:37] Sebastian Selman:** Because that is an argument for building the scoreboard, not necessarily for cutting the budget at month 12, right?

**[07:46] Estera Kot:** Yes, you are right, agree. And this is exactly the point. Let's keep the patience at the instrument panel. Deloitte says one in five organizations generates revenue through AI today, and three in four hope to. I love "hoping to". And hope is not an instrument. Fund AI like a mission: with a number, with an owner, and with a date. Not like a lottery ticket you promise not to check.

**[08:20] Sebastian Selman:** So we do half agree, right? The money is committed, the leadership attention is committed, but the mechanism that turns both budget and attention into results is the thing nobody has built yet. And that part I would sign. So, quick telemetry check, right? Before the fix. There is a number making the rounds. 95% of AI pilots fail, right? Keynotes, board papers, the financial press. Finanz und Wirtschaft ran it this summer next to an estimate of two and a half trillion dollars flowing into AI this year.

**[09:01] Estera Kot:** And this is where the scientist in me has to step in, because that number does not say what people think it says. So here the source is an MIT working paper, small sample. It measured one narrow thing: rapid, measurable P&L acceleration from bespoke GenAI pilots. And here that methodology was publicly criticized. You will find also the link to this methodology in the description. In my old academic life, we had a word for citing a study without reading its method section: sloppy. In business, it gets a whole keynote.

**[09:51] Sebastian Selman:** Okay. So which failure number survives your review then?

**[09:58] Estera Kot:** Two thirds of Swiss pilots never reach production. So, from adesso this year, method published. Gartner: 28% of AI use cases fully succeed. Top failure reason here: expected too much, too fast. As well, adding the links, you can check it. Going further, Gartner again, looking forward: over 30% of agentic AI projects cancelled by the end of next year. Different methods, same shape: serious failure rates, nowhere near 95.

**[10:39] Sebastian Selman:** I mean, the difference matters, right? 95% would basically say, do not even bother to engage with AI. Whereas only two thirds of the people not making it into production says there are winners, and they must be doing something specific.

**[10:57] Estera Kot:** Yes. And if a stat fits your narrative perfectly, check the methodology twice.

**[11:04] Sebastian Selman:** So the gap is operational. You promised three course corrections at the beginning of this podcast, huh?

**[11:11] Estera Kot:** Oh yes. So, Business Mission Control, move one: decision rights. And the best model for it is the room this show is named after. Before a launch, the flight director polls the room. Retro, Guidance, Surgeon. Each console has one owner. Each owner answers for one system, go or no go. Seconds, not weeks. Immediately. So nobody in that room wonders who owns the call, and nobody outside that room gets a vote. And now compare that to your AI program, where a data access request bounces between the CIO, the risk officer and the business owner for a few weeks, because each of them believes another one holds the pen.

**[12:18] Sebastian Selman:** So the move is: write the poll.

**[12:23] Estera Kot:** One page. Every AI decision that matters: data access, model changes, go-live, budget shifts, vendor swaps. One owner per call, who may say go and who may say no go. So have a full authority. And the first time you write that one-pager, two executives discover that they both thought they own the same console. That conversation is uncomfortable. And this is the most valuable meeting of the program.

**[12:58] Sebastian Selman:** Move two is cadence. And here I'll push back before you start, right? Because I sell to these organizations. A weekly decision meeting in a 10,000 or 100,000 person company is a fantasy. The executives you need will not show. And after three weeks, it decays into a status call run by delegates. I cannot put weekly steering into a proposal with a straight face.

**[13:26] Estera Kot:** And you are right about the failure mode, and wrong about the conclusions. So here the fix is not more meetings. It's a faster loop. In my platform years at Microsoft, telemetry did not wait for a review board, for every product, SaaS, IaaS, PaaS, whatever, like it's a product. We need to have solid telemetry that is kind of a signal of what users are doing and how they are interacting. Not waiting for the meeting, but bringing and asking the hard topics earlier on, based on the telemetry. The meetings are always, I'm calling them tax. Fine, weekly, biweekly, but we can check three KPIs answering two, three questions. What shipped? What is blocked? And who unblocks it by next day, by Friday? No slides, no in-between meetings, a short 24-hour decision SLA for anything that is written on the decision rights page. So here the cadence is not how often you meet, it's how long you take to decide and how long a decision is allowed to wait. A monthly steering committee is a parking lot.

**[14:57] Sebastian Selman:** I mean, biweekly with a 48-hour SLA, I could sell. That's a deal. Let's move to three.

**[15:05] Estera Kot:** Change budget at parity with technology. Here, NASA does not spend a decade building the vehicle and then hand the crew a lunch and learn. Crew training is a first-class line item. In AI programs, it's the line item that gets cut first: training, process redesigns, incentives, unglamorous work. Go, no go poll, a faster decision loop, crew training funded like a rocket. None of it needs a new platform and redesigning that platform again. All that is needed is just an executive who wants the number to move.

**[15:55] Sebastian Selman:** Okay. So give the crew the Monday morning version.

**[16:00] Estera Kot:** Okay. Challenge accepted. So, one question: ask who approved your last stalled AI decision, and when. If the answer takes a week to find, or a few days, you do not have a technology problem. You have a gap. Then this week: Monday, ask the question. Tuesday, draft the go, no go page. Even a wrong one, because the wrong page gets corrected in the next days, and a missing page stays missing for quarters. Continue day by day, and Friday, put the 15 minutes on the calendar with the names from that page.

**[16:45] Sebastian Selman:** So before the debrief, one thing we did not settle, and I want the audience on this. BCG says the CEO now owns AI in three companies out of four, double since last year. I think that is right and potentially healthy. Visible CEO ownership moves organizations. Do you think this could be theater?

**[17:08] Estera Kot:** Yeah, interesting point. And the calendar disagrees with the org chart. A CEO who owns AI on paper and gives it zero recurring minutes owns a press release. I would rather see a COO with real decision rights than a CEO with a slide. So we genuinely disagree here, right?

**[17:33] Sebastian Selman:** So we leave it open. Who should own AI in your company, and who owns it in reality?

**[17:40] Estera Kot:** Credit where it's due before we close. The sharpest framing of the drift problem comes from Simon Erdmann in Zurich, part of Clouds on Mars. Stalled transformations rarely blow up. They drift. His work on the operating shifts behind this is in the show notes, so you can reach out. Simon, if you are listening, the follow-up conversation is an open invitation.

**[18:13] Sebastian Selman:** Perfect. Mission debrief. The mission was to find out why AI programs drift and bring back three course corrections. The drift: two thirds of Swiss pilots die between demo and production, and it is operational, not technical. The corrections are a go, no go page, a decision loop measured in hours, not months, and crew training funded like the rocket.

**[18:44] Estera Kot:** And the Monday test: who approved your last stalled decision, and when. Every number from this transmission is in the show notes with the source. If your program is drifting, send this episode to the person who owns the budget. Not to the data team. They already know it.

**[19:05] Sebastian Selman:** Comments are open on YouTube. And if you fly with us on Apple Podcasts or Spotify, a follow means the next transmission reaches your cockpit on time. Next mission in two weeks.

**[19:16] Estera Kot:** Yeah. And this is Business Mission Control, somewhere between the roadmap and the P&L. Keep your trajectory honest.

**[19:25] Sebastian Selman:** Signing off.

**[19:41] Estera Kot:** Signing off.
