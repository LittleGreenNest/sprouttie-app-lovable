# Sprouttie Desk — build prompt

Paste the block below into a fresh Claude Code session opened on this repo.
Do not run it from an OpenSoftHR session; the two projects stay separate.

Written 2026-09-05, after building the equivalent desk for OpenSoftHR. The
anti-patterns at the bottom are the mistakes that version made first.

---

```
Build me a Sprouttie desk: one artifact, one URL, that I open at the weekend to
know what to ship and what to build next.

FIRST, before designing anything:
- Load the `sprouttie-brand` and `sprouttie-audience` skills. Use that palette
  and type, not a generic dashboard look, and not the OpenSoftHR teal.
- Read the Features tab in the Sprouttie Google Sheet. That tab is the reference
  for all feature decisions. Do not duplicate it into the artifact and do not
  invent a competing feature list. Link to it and pull only what is in flight.
- Check the content bank CSV for what is already written and unposted.
- Read CLAUDE.md in this repo for the app's real routes and plan tiers, so the
  build queue refers to things that actually exist.

CONTEXT THAT SHOULD SHAPE THE DESIGN
Sprouttie is a bilingual Mandarin/English baby flashcard tracker. App lives at
sprouttie.online, marketing at sprouttie.com. Plans are free, pdf and pro.

It is a weekend project. I am the product manager and the only person building
and distributing it. Distribution is one unified TikTok account (@renachiamg)
across 4 content tracks. As of 30 Aug 2026 there has been 1 external signup ever
and 0 active subscribers, so the audience persona is a hypothesis, not a finding.

Take that last point seriously. Do not build a metrics dashboard implying
traction that does not exist, and do not put a big-number KPI row at the top.
Any number shown must be one I can actually act on.

WHAT THE PAGE NEEDS

1. A CONTENT RUNWAY GAUGE at the top, always visible.
   Not vanity metrics. The one number that matters for a solo creator is how
   many weeks of ready-to-post content I have banked, and how long since I last
   posted. Runway going to zero is the real failure mode. Show weeks of runway,
   posts ready vs drafted, and days since last post.

2. A SHIP QUEUE, organised by content track, not by platform.
   Exactly one item in "Shipping now". Everything else is "Next up" or "Queued".
   Every ready item must carry FINISHED copy behind a Copy button: hook, caption,
   hashtags, and the on-screen text if it is a video. Not briefs, not angles.
   Text I can paste and post. If it is not written, mark it "to write" rather
   than faking readiness.

3. A BUILD QUEUE, separate from the ship queue.
   I am the product manager too, so this tracks what I am building: the feature
   or decision in flight, what is blocked, and open product questions awaiting
   my own call. Include the open Home redesign decision and the open Row 8
   question from the Features tab. Product decisions I have not made are the
   thing that quietly stalls everything, so surface them as questions, not tasks.

4. A RHYTHM view: the weekend operating cadence.
   This is a weekend project competing with a full-time job, so be realistic.
   Assume one slot per week, not four. Build the cadence so that no decision is
   ever made in the same sitting as the shipping. Include a rule for what happens
   when a weekend gets skipped, because it will.

DESIGN CONSTRAINTS
- Use the `db` capability so ticks and state persist. Publish as one artifact and
  keep the URL stable.
- Theme-aware, works in light and dark.
- No em-dashes anywhere in the copy. This applies to the post copy especially.

ANTI-PATTERNS, LEARNED THE HARD WAY ON MY OTHER PROJECT
- Do not organise by platform or by tool. Organise by the unit of work.
- Do not show me everything at once. A board with 26 visible items answers
  nothing. One thing should be obviously next.
- Do not build a status board that describes my work. Build the thing that
  contains it, so opening it means shipping rather than reading.
- Do not fold the always-on stuff into the queue. It becomes a card that never
  finishes.

Tell me honestly if any part of this is the wrong shape for Sprouttie before
you build it.
```

---

## Why the top gauge is runway, not metrics

The OpenSoftHR desk leads with Meta ad spend, because the real anxiety there was
reporting overspend to a boss. Sprouttie has no boss and no ad spend, so a spend
gauge would be theatre.

For a solo weekend creator the equivalent anxiety is running out of banked posts
and going quiet. Content runway measures that before it bites, and it is the same
"I don't know what to post" problem measured early rather than late.

## Known open decisions to carry into the build queue

- Home redesign: the directive-Home canvas is blocked on the stage-promotion rule.
- Features tab Row 8 question is still unanswered.
