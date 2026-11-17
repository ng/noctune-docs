---
type: Social Post
title: 15. Website builder
description: LinkedIn draft for the website builder film, turning a practice's old website into a phone-first noctune site that is included with the subscription.
status: draft
tags:
  - linkedin
  - website-builder
---

# 15. Website builder

Draft only; not scheduled or published. The film was approved by Jonathan Ng on November 17, 2026. The company page posts **Post**, then Jon reposts it from his personal account with
**Personal repost (Jon)**.

Video (from `tutorials/episodes.json`):

- Web: `site-builder-web` → `walkthrough-captioned.mp4`

The builder footage is the real noctune editor and the real sites renderer, recorded against the
fictional Northstar Veterinary Clinic. The old website is a demo page, and reading it and writing
the first draft are simulated in the capture; both are labelled in the video.

## Post

```text
Clients check your website before they call.
Is it showing them this year's hours?

Your practice website now lives in noctune™, included with your subscription:

→ Give it your current site's address, and noctune writes a first draft from it
→ Edit each section in a simple form, with a live preview beside it
→ Add your own photos, or a short looping video across the top
→ Show your hours, the towns you serve, and a link to your online pharmacy
→ Publish to the address that comes with your subscription, or connect a domain you own

It's built for phones first: search-ready hours and services, fast pages, HTTPS and updates handled.

Practice websites usually cost $139–$299 a month through a vet web company, often with a setup fee, or $18–$40 a month on Wix before anyone writes the copy. With noctune, it's part of your subscription.

Read the draft before you publish. You know your practice; it only knows your old website.

What's the one thing clients can never find on your current site?

#VeterinaryMedicine #VetMed #PracticeManagement
```

## Personal repost (Jon)

Playful, first person, for the repost from Jon's personal account. It keeps the same facts as the
company post: noctune™ on the first mention only, "part of your subscription" (never "free"), and
the same price ranges.

```text
Confession: I've looked at a LOT of vet clinic websites.

The 2011 clip-art paw print. The hours page that still says "Closed for Thanksgiving." The "Book online!" button that leads to… a fax number. 🐾

So we built a website builder into noctune™.

Paste in your current site → noctune drafts a new one from it → tweak it in plain forms with a live preview → publish. Your own photos, a looping video across the top (clinic cat being majestic, optional), the towns you drive to, your pharmacy link. Phone-first, because that's where clients squint at your hours at 9pm.

The part I'm proudest of: vet web companies usually charge $139–$299 a month plus setup fees, and Wix runs $18–$40 a month before anyone writes a single word. With noctune, it's just… part of your subscription. No separate bill. No plugins to patch. We handle HTTPS, hosting and keeping it fast.

90 seconds of proof below 👇

Vets: what's the most outdated thing on your clinic's website right now? I promise not to screenshot it. (Much.)

#VetMed #VeterinaryMedicine #SmallBusiness
```

## First comment

```text
Watch the walkthrough and build yours: https://app.noctune.ai/website
```

## Replies for the first hour

- Who updates the website at your practice today: you, a manager, or an agency?
- Do clients book online, or call?
- Do you list a service area for house calls?

## Source checks

- Core `docs/noctune-sites.md` and `src/components/sites/` on `origin/main`
- Search-ready, fast and secure: Core `sites/src` on `origin/main` (schema.org `VeterinaryCare`
  data, sitemap, 301 redirects for old pages, cached pages, optimized images) and the start screen's
  "Secure, hosted, kept current: we handle HTTPS, updates and uptime". No ranking is promised.
- Pricing, public pages accessed November 17, 2026 (vendors are not named in the post):
  - Vetframe, <https://www.vetframe.com/pricing>: Standard $139 a month, Pro $249 a month.
  - Digital Empathy, <https://www.digitalempathyvet.com/pricing>: $199 a month plus a $2,750
    one-time build fee.
  - PetDesk / Vetstoria, <https://www.vetstoria.com/pricing/> (US visitors are sent to PetDesk,
    which shows no public price) and Vetstoria's new-clinic offer page: website $299. Search
    listings also show a Vetstoria custom plan at $344 a month plus a $4,500 setup fee, which could
    not be confirmed on a live page, so the range stops at $299.
  - EveryDVM, <https://everydvm.com/>: no public price found; not used.
  - Wix, <https://www.wix.com/plans>: Light $17.77, Core $29.77 and Business $39.77 a month on
    yearly billing (USD shown "for reference only").
