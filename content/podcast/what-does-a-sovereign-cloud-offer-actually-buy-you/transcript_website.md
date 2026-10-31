# Business Mission Control — Episode 7: What Does A Sovereign Cloud Offer Actually Buy You?

[Watch on YouTube](https://www.youtube.com/watch?v=fgpBN1dU32Q) · Published 29 October 2026 · 15:22

**Speakers:** Estera Kot (CTO, Clouds on Mars) · Sebastian Selman (Consulting Lead Switzerland, Clouds on Mars)

_Transcript of the published episode, lightly edited for readability. Timestamps match the video._

---

**[00:01] Sebastian Selman:** Business Mission Control, Mission 007. Systems check.

**[00:07] Estera Kot:** All consoles go. And today we check whose consoles they are.

**[00:14] Sebastian Selman:** So here's a timeline. This July, Switzerland was mid-debate about digital sovereignty. Geneva published a cantonal sovereignty strategy. A national center for digital sovereignty was staffing up. And in the same weeks, the federal government got breached through its SharePoint servers. Around 200 accounts compromised, internet access to the servers cut.

**[00:40] Estera Kot:** The country got hacked through the exact dependency it was holding a conference about. And a canton reported a similar incident one day later.

**[00:57] Sebastian Selman:** So everyone will now say the answer is sovereignty. Buy sovereign.

**[01:04] Estera Kot:** Except nobody selling sovereign will tell you what the word means. And a word that means everything prices at whatever the vendor wants.

**[01:17] Sebastian Selman:** Today's mission, for the record.

**[01:19] Estera Kot:** Define what sovereignty actually buys, in francs and in failure modes. And bring back a three-question test you can run on any sovereign offer that lands on your desk.

**[01:32] Sebastian Selman:** I am Sebastian. And if the word sovereign appears anywhere in your current RFP, this transmission is for you. So let's start with the market, because sovereign is on everything now. Integrators sell sovereign Microsoft clouds. Open source gets pitched as the sovereign middle way. Every canton wants a strategy.

**[02:00] Estera Kot:** Yeah. And as an architect, I have a problem, because those offers cover three different things, and the label does not say it. So thing one is legal control: whose law can reach your data, whose courts, and whose subpoenas. Thing two, operational control: who can actually run the system when the vendor is breached, sanctioned or gone. Thing number three, exit cost: what leaving takes, in francs and months.

**[02:44] Sebastian Selman:** Okay. So you mentioned three things: the legal control, the operational control and the exit cost. Can you make each of them concrete, because in an RFP they might blur.

**[02:58] Estera Kot:** Oh, very true. So legal control is the subpoena test. A foreign parent company can be compelled by its home jurisdiction, regardless of where the data center stands. Swiss soil does not stop a foreign statute reaching a foreign company. It means "your data stays in Switzerland" answers a real-estate question, not a jurisdiction question. Operational control is the two-in-the-morning test. So who rotates the keys? Who reads the logs in depth? Who can patch without a ticket to another continent, or another country? And exit cost is the gravity test. Here: data egress, rebuilt integrations, retrained people. All three are measurable. Almost no offer measures them for you. Now let's score a sovereign region from a hyperscaler against that. It buys you thing one, partially: Swiss jurisdiction, with caveats that live in the fine print. It buys you almost none of thing two. The people who can operate the platform at depth are the vendor's people, on the vendor's escalation chain.

**[04:27] Sebastian Selman:** Which the July breach made concrete. When the SharePoint vulnerabilities hit, the Bund did not patch its way out on its own schedule. It waited, like every other customer on the planet, for the vendor.

**[04:43] Estera Kot:** Yeah. And this is the honest definition of a dependency. Not who hosts your data, but who you wait for when it burns. And now the ledger nobody reads aloud. The federal audit office looked at the planned Swiss Government Cloud and projected it would run roughly 68% on foreign hyperscalers by 2032, and said the economic benefit was unproven.

**[05:20] Sebastian Selman:** And I will defend that, because, I mean, the alternative is worse. Switzerland is not going to rebuild a hyperscaler. The talent does not exist here at that scale. The capex does not exist, and the services gap would cost more than the dependency does. So renting the best infrastructure on the market is not a weakness. It's arithmetic.

**[05:41] Estera Kot:** Yeah, renting is fine. I rent. Clouds on Mars builds on rented infrastructure every day, and I will say that on any stage. What is not fine is renting and calling it sovereign. This mislabel is the problem, because it makes the board believe a risk is closed when it's merely rebranded.

**[06:06] Sebastian Selman:** Okay, so we agree on the split. Pragmatism, yes. But imprecise vocabulary, no.

**[06:14] Estera Kot:** Yeah.

**[06:15] Sebastian Selman:** But then price the vocabulary for me. If honest labels existed, what would the sovereign premium be worth paying?

**[06:23] Estera Kot:** Price it like insurance, because this is what it is. You pay a premium against a failure mode. For a marketing site, the failure mode of foreign jurisdiction is an inconvenience, premium worth roughly zero. For court records, the health data, for the systems a canton governs with, the failure mode is existential, and the premium is worth real money. And the ledger problem with the Government Cloud is not the 68%. It's that nobody published which workloads sit in the protected 32, and why. The percentage is the headline, but the allocation is the strategy.

**[07:18] Sebastian Selman:** And the audit office said exactly that, in its own language: benefit unproven. Not wrong. Unproven.

**[07:29] Estera Kot:** And a dependency you name honestly is a decision. A dependency you rename is a surprise with a delivery date.

**[07:42] Sebastian Selman:** Yeah. I think the sharpest counter-voice in the Swiss market right now comes from Infomaniak. Thomas Jacobsen's line: digital sovereignty is no longer theoretical but a concrete operational risk. And their definition is maximalist. Real sovereignty means controlling the whole chain: headquarters, voting rights, infrastructure, staff, reversibility.

**[08:10] Estera Kot:** On the definition, Jacobsen is right. That is what the word means. Full-chain control. Anything less is partial sovereignty and should be sold as such.

**[08:28] Sebastian Selman:** But.

**[08:29] Estera Kot:** But the conclusion does not follow that everyone should buy the full chain, meaning that full-chain control is expensive, and most workloads do not earn it. Switzerland built Apertus, a sovereign language model, on national supercomputing power. And this is what real sovereignty costs: years, institutions and the power bill. Worth it for the workloads that are existential, and absurd for your marketing websites.

**[09:07] Sebastian Selman:** So sovereignty is not a tier you buy. It's a decision you make per workload. Walk one example through Jacobsen's five links, so listeners can copy the move.

**[09:21] Estera Kot:** Yeah. Take patient records versus the hospital's marketing site. Same organization, opposite answers. Headquarters and voting rights: for the records, you want the operator to answer to Swiss law first, because this is who the court will actually reach. For the website, it's irrelevant. Infrastructure and staff: the records need people with Swiss clearance who can act without a foreign escalation chain. The two-in-the-morning test again. The website needs, for example, a CDN, very lovely ones. And reversibility: the records need a tested exit, rehearsed like a fire drill, because you will only ever need it on the worst day of your tenure. The website needs a backup.

**[10:26] Sebastian Selman:** Okay. So full chain for one workload, probably one workload in 50, and rented convenience for the other 49.

**[10:35] Estera Kot:** Per workload, I would say, with open eyes. The scandal is not that Switzerland rents cloud. The scandal would be not knowing which workloads must never be rented.

**[10:51] Sebastian Selman:** So, the test then. An offer lands on my desk. The word sovereign is in the title. Three questions.

**[10:59] Estera Kot:** Okay. Question one would be legal. Whose law can reach this data, and who enforces the answer? Not the marketing page, but the contract. If a foreign statute can compel disclosure, you have partial legal control, and the offer should be priced accordingly.

**[11:24] Sebastian Selman:** So most buyers would stop there, right? That is the whole sovereignty conversation in most RFPs I see.

**[11:32] Estera Kot:** Yeah. Which is why breaches keep surprising people. Question two: operational, and July wrote it for us. When this system is compromised, who holds the patch? Who holds the logs? And on whose clock do we recover? If the answer to all three is the vendor, you are a spectator with a contract. The Bund spent early August finding that out in public.

**[12:02] Sebastian Selman:** And question three is the one that finance will love.

**[12:06] Estera Kot:** Exit. What does leaving cost, in francs and in months, measured now and not in the crisis? Reversibility is the only sovereignty you can bank. If you cannot state your exit cost, your exit cost is whatever the vendor decides on the day you need it.

**[12:25] Sebastian Selman:** And what does a good answer sound like, so the listener recognizes one? Because every vendor will claim all three questions are covered.

**[12:34] Estera Kot:** A good answer is specific and dated. On legal: a contract clause naming the governing law and what happens on a foreign disclosure order, not a compliance badge. On operational: named roles on your side with real privileges, who holds keys, who reads the logs, and an incident drill you have actually run. On exit: a number, in francs, refreshed on a cadence, yearly, with the last export test dated. If any answer is an adjective instead of a noun, then score it zero and move on.

**[13:18] Sebastian Selman:** One thing we might read differently, and it goes to the audience. I think the sovereign-region offers from hyperscalers are a legitimate middle tier: partial sovereignty, honestly useful for most regulated workloads. Estera, do you think the naming does more damage than the tier does good?

**[13:41] Estera Kot:** So, a middle tier sold with a precise label, I would endorse tomorrow. Sold as sovereign, full stop, it teaches boards to stop asking the three questions, and this is the damage.

**[13:57] Sebastian Selman:** So, YouTube comments: is a sovereign hyperscaler region real sovereignty, useful middle ground, or a contradiction in terms? Best argument gets read in the next mission briefing.

**[14:13] Estera Kot:** Yeah, time for the mission debrief.

**[14:16] Sebastian Selman:** Yep. The mission was: define what sovereignty buys, and bring back the test. The definition: legal control, operational control, exit cost. Three different purchases, one misused word. The test: whose law, who recovers, and what does leaving cost.

**[14:36] Estera Kot:** And run it per workload, not per vendor. Show notes carry every source, including the breach coverage and the EFK numbers. The middle-tier question is live in the comments. You can follow us on Spotify or Apple Podcasts; that will bring you the next transmission.

**[14:58] Sebastian Selman:** Next mission: the cost floor. Why your data platform bill is rising, even if you bought nothing new.

**[15:07] Estera Kot:** And this is Business Mission Control, somewhere between the flag and the fine print. Keep your trajectory honest.

**[15:16] Sebastian Selman:** Signing off.

**[15:18] Estera Kot:** Signing off.
