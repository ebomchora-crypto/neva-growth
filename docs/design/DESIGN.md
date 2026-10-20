# NEVA GROWTH — DESIGN ENGINE SPECIFICATION

> Version: 2.0 | Scope: websites, landing pages, SaaS interfaces, dashboards and commercial web applications.
> Purpose: turn user intent into a distinctive, coherent, responsive, accessible and implementable design system.
> This is an original operational specification inspired by observable practices in agentic website builders. It is not an official Lovable document.

## 0. NON-NEGOTIABLE RULE

Do not begin writing production UI before deriving a project-specific visual direction. The design is not a collection of attractive components: it is a coherent system of narrative, brand, typography, layout, imagery, color, motion and interaction. Any tool or model that receives this document must apply its principles to the CURRENT business, audience, assets, constraints and codebase rather than blindly reproducing the examples.

### Priority order
1. User's explicit, current requirements and supplied brand assets.
2. Safety, accessibility, truthfulness, functionality and existing code integrity.
3. Project-specific design brief / design-spec, if present.
4. Existing project design tokens and established patterns, unless a redesign is explicitly requested.
5. This design specification.
6. Generic defaults.

When rules conflict, honor the higher priority; record any consequential tradeoff. Never claim that a screenshot was inspected, build was run, form is connected or API works without evidence from a real tool.

## 1. DESIGN-FIRST PIPELINE

### Stage A — Discover
Extract: business type, product/service, intended audience, conversion goal, primary CTA, tone, content, competitors/references, mandatory features, assets, language, performance needs, existing design system and requested degree of redesign. Distinguish known facts, reasonable design assumptions and details that must remain placeholders. Avoid blocking with unnecessary questions: make reversible assumptions for minor missing details.

### Stage B — Brand and creative thesis
Write one sentence explaining the aesthetic rationale for this project. Select ONE dominant direction (e.g. editorial industrial, tactile organic, brutalist typographic, warm institutional, contemporary luxury, confident technical), optionally ONE secondary accent. Define 3–5 visual principles and 3–5 anti-patterns. Reject generic 'premium modern', 'clean and professional' as complete directions: they do not constrain composition.

### Stage C — Information architecture
Map conversion objective to section order. Every section needs a business reason and one clear focal point. Design copy hierarchy alongside layout; do not insert random paragraphs to fill space. Build a purposeful narrative: problem/value → evidence/offer → differentiators → mechanism → objections → CTA, adapted to project type. Do not impose this exact order if the user has supplied a stronger structure.

### Stage D — Design tokens
Derive a project-specific semantic token sheet. Define 5–8 named color roles, typography pairing, type scale, content widths, spacing scale, grid, radii, borders, shadows, surfaces, breakpoints, focus ring and motion variables. Verify WCAG contrast and state visibility. Prefer a disciplined palette and one recognizable motif over numerous gradients and effects.

### Stage E — Component architecture
Create a reusable component inventory: header, hero, buttons, cards, feature blocks, proof, testimonials, pricing, FAQ, forms, footer, empty/error/loading/success states. Component reuse must NOT make every section look the same: vary density, alignment, rhythm and treatment within shared tokens.

### Stage F — Implementation
Build the actual page using the requested stack or established project stack. Use semantic HTML, real links, working keyboard access, appropriate ARIA, robust validation, responsive layouts and deliberately chosen motion. Add dependencies only when the design requires them. Preserve existing features outside scope.

### Stage G — Visual QA
Render at representative widths (mobile ~375, tablet ~768, desktop ~1440; adjust to project), capture screenshots if tools exist, compare against design spec, and fix hierarchy, line wrapping, horizontal overflow, image cropping, rhythm, CTA prominence and color contrast. Inspect console/build/runtime logs. No tool access means report NOT VERIFIED, never pretend.

## 2. VISUAL-DIRECTION DECISION ENGINE

Do not use the same composition across industries. Choose concepts based on the offer, perceived risk, emotional state of buyer, content requirements and brand cues.

| Business situation | Recommended direction | Visual evidence | Avoid |
| --- | --- | --- | --- |
| Law / professional expertise | editorial authority, reserved confidence | serious type, generous whitespace, portraits/documentary imagery | fake awards, neon dashboards, excessive motion |
| Solar / engineering | optimistic precision, credible infrastructure | projects, installations, diagrams, measured figures | unexplained futuristic 3D, invented savings |
| Clinic / aesthetics | calm confidence, human care | authentic spaces, restrained details, clear information | exaggerated before/after, medical promises |
| Luxury retail | art-direction-first commerce | strong art photography, asymmetry, elegant type | generic SaaS card grids |
| Restaurant / hospitality | sensory editorial | strong food photography, hours/menu/reservation | random tech visual metaphors |
| SaaS / AI | product-led clarity | real UI previews, workflow diagrams, interaction demos | fake dashboard screenshots, meaningless glow |
| Property / real estate | architectural editorial | property imagery, filters, location context | fictitious listings presented as real |
| Automotive | precision & performance | dynamic photography, technical details | unbounded parallax and unverified specs |
| School / education | warm, legible, approachable | explanatory flows, trust, accessible navigation | childish layouts for mature audiences |

The table guides decisions but does not override a supplied identity. Each generated site needs 1–2 unique signature elements derived from its brand/content (e.g. a distinctive hero crop, custom typographic lockup, restrained interaction, interactive project selector). Distinctive does not mean maximal animation.

## 3. COMPOSITION RULES

- Establish a clear focal hierarchy: one dominant hero headline, one supporting proposition, one primary CTA. Secondary CTA must be visibly subordinate.
- Prefer layout intent over safe repetition: alternate large editorial blocks, focused grids, whitespace and proofs. Do not stack five identical cards sections.
- Use grids intentionally: 12-column desktop, 6–8 tablet, 4 mobile as useful mental models, not arbitrary CSS requirements.
- Control max line length: prose often ~55–75 characters; hero headings can be narrower and more sculptural.
- Make section transitions deliberate: variation in background, alignment, image placement and density must support the narrative.
- Avoid default hero pattern (badge + huge gradient title + two pills + generic dashboard) unless the business truly calls for it.
- Establish consistent section spacing with occasional purposeful exceptions. Adjacent elements should communicate grouping.
- Hero should communicate what the business offers before decorative effects draw attention.
- Use asymmetry and negative space with purpose; preserve visual balance and reading order.

## 4. TYPOGRAPHY

Choose typography from brand intent. Prefer two complementary families at most; system fallbacks required. Use optical sizes and line heights appropriate to the role. Avoid ultra-thin text over photography, huge text breaking on mobile, and excessive uppercase body content. Define H1/H2/H3/body/caption/button scales using clamp() where useful. Headline wrapping must be designed, not accidental. Establish visual contrast between editorial and utility text without sacrificing legibility.

Example starting point (adjust per brand):

```css
:root {
  --font-display: 'Manrope', 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --step--1: clamp(.78rem, .75rem + .15vw, .875rem);
  --step-0: clamp(1rem, .96rem + .2vw, 1.125rem);
  --step-1: clamp(1.25rem, 1.15rem + .45vw, 1.6rem);
  --step-2: clamp(1.7rem, 1.45rem + 1.1vw, 2.5rem);
  --step-3: clamp(2.5rem, 1.9rem + 2.7vw, 4.5rem);
  --step-4: clamp(3.3rem, 2.2rem + 4.8vw, 7rem);
}
```

These are illustrative values, NOT mandatory global styling.

## 5. COLOR AND MATERIALS

- Establish semantic roles: background, foreground, muted, surface, elevated, border, accent, accent-foreground, danger, success, focus.
- Verify contrast for real text and states; visual elegance does not justify illegibility.
- Limit dominant hues; use accents at points of action and meaning.
- Ensure photographs, gradients and 3D assets share consistent color temperature.
- Avoid blurred glass cards by default. Use glass effects only where depth is a meaningful part of the direction.
- Never automatically apply the Neva Growth agency palette to every client project. Client branding overrides agency branding.

## 6. PHOTOGRAPHY / IMAGERY / 3D

Choose a coherent image treatment: documentary, editorial, studio, product macro, technical illustration or conceptual 3D. Prefer meaningful subject matter and crop over generic stock. Assets must have proper rights. If a tool cannot fetch or generate imagery, provide explicit asset slots with accurate alt text and no misleading claim of availability. Do not fake a real person, office, client testimonial, property, project or result.

For 3D / WebGL: use only when there is a clear content or experience benefit; provide static fallback, mobile performance fallback, reduced-motion handling and sensible loading states. Do not sacrifice page usability for effects.

## 7. MOTION SYSTEM

Define an animation hierarchy:
1. Micro-interactions: button hover/focus, toggles, menus (subtle, immediate).
2. Reveals: section entrances that reinforce reading flow (short duration, stagger sparingly).
3. Transitions: navigation/modal/view changes, avoiding disorientation.
4. Signature animation: at most one or two memorable effects serving the concept.

Guidelines: animate transform/opacity whenever possible; avoid heavy scroll handlers, layout thrashing and persistent motion. Honor `prefers-reduced-motion`; content must never remain invisible if JavaScript, intersection observers or animations fail. Do not add parallax to everything. GSAP is optional, not mandatory.

## 8. RESPONSIVE EXPERIENCE

Treat mobile as a separately composed interface, not a desktop screenshot squeezed to 375px. Check tap sizes, menu operation, CTA placement, hero stacking, image crop, cards, sticky elements, tables, long words and keyboard behavior. Never conceal crucial business information on mobile. Avoid `overflow-x: hidden` as the only fix for layout bugs; identify the actual element causing overflow.

## 9. FUNCTIONALITY AND CONTENT INTEGRITY

- CTAs lead somewhere valid or have an explicit pending-integration state.
- Forms validate input, display loading/success/error and submit to a real configured destination. Without integration, label behavior as demonstrative; never fabricate submissions.
- Contact data, prices, testimonials, logos, outcomes, accreditations and metrics must come from supplied/verifiable sources or be clearly marked as placeholders.
- Components must work with mouse, keyboard and touch.
- External links have correct targets and safe rel attributes where needed.
- Respect privacy and avoid collecting unnecessary personal information.

## 10. ACCESSIBILITY / PERFORMANCE

Use semantic landmarks, ordered headings, adequate touch targets, visible focus states, text alternatives, form labels and error messages. Check contrast to WCAG AA targets where applicable. Defer offscreen media, optimize image sizes, avoid unnecessary JavaScript and prevent layout shift with set image dimensions/aspect ratios. Keep interaction responsive on low-end devices. Target measured outcomes rather than unsupported numeric performance claims.

## 11. DESIGN QA RUBRIC (0–5 EACH)

Score each dimension from 0 to 5 with evidence, then prioritize failures:
- Brand relevance and industry fit
- Originality without gimmicks
- Information hierarchy
- Typography and rhythm
- Layout/composition consistency
- Image quality and coherence
- CTA and conversion clarity
- Interaction correctness
- Mobile responsiveness
- Accessibility and performance

**Hard fails**: broken build, fake functional claim, inaccessible main CTA, massive mobile overflow, content hidden by animation, invalid core navigation. Do not announce 'production-ready' if hard fails exist. A high visual score cannot override broken behavior.

## 12. PRE-CODE DESIGN SPEC OUTPUT CONTRACT (V1 MINIMAL; PREFER V2 IN §29)

Before coding a new page, produce this structured object internally or store it in `design-spec.json`:

```json
{
  "project": {"type": "", "industry": "", "audience": "", "primaryGoal": "", "locale": "pt-BR"},
  "creativeThesis": "",
  "visualDirection": {"primary": "", "secondary": "", "principles": [], "antiPatterns": [], "signatureDetails": []},
  "tokens": {"colors": {}, "typography": {}, "spacing": {}, "grid": {}, "radius": {}, "motion": {}},
  "informationArchitecture": [{"id": "hero", "goal": "", "headlineIntent": "", "layout": "", "proof": "", "interaction": ""}],
  "assets": [{"purpose": "", "source": "supplied|licensed|generated|placeholder", "status": "available|missing"}],
  "integrations": [{"feature": "", "status": "configured|pending"}],
  "responsiveNotes": [],
  "qaRisks": []
}
```

Do not pass entire reference pages or irrelevant huge documents into the model if retrieval can return selected summaries. Reference selection should be based on industry, visual direction, audience and component needs; use at most a small focused set per operation unless a larger research pass is specifically required.

## 13. REFERENCE LIBRARY — RETRIEVAL CONTRACT

Each reference should store: `id`, `url`, `source`, `industry`, `style`, `layoutPatterns`, `typography`, `palette`, `imagery`, `motion`, `componentTags`, `qualityNotes`, `licensingNotes`, `previewPath`, `embedding` (optional). Query by industry + direction + task. Return condensed insights, not raw markup. Never assume a URL has been fetched if the fetch tool was not called. Never recreate another brand's proprietary assets, copywriting or unique identity verbatim.

Selection weights (starting heuristic, tune with real tests): business relevance 30%, visual direction 25%, layout/component applicability 20%, asset feasibility 15%, accessibility/performance fit 10%. Reject mismatches even if they look impressive.

## 14. PROJECT TYPES

### Landing pages
One strong CTA, persuasive sequence, trust evidence, measurable form flow, clear contact paths; no fake social proof.

### SaaS marketing
Explain actual product, show real interface or labeled concept, provide plan clarity, explain integration/security only when confirmed.

### Admin dashboard
Prioritize information density, tables, states, loading, errors, filtering and accessibility over decorative hero sections. All data sources identified.

### Business website
Clear services, genuine projects, about, location/contact, structured navigation and credible visual storytelling.

### Ecommerce
Product discovery, variants, cart, checkout state, taxes/shipping disclosures as applicable; do not falsely claim payment integration.

## 15. CHANGE REQUESTS / REDESIGNS

For small changes, inspect and patch only the smallest responsible file/component. For redesigns, map preserved business logic, routes, data contracts, forms and interactions before modifying presentation. Keep a rollback/version checkpoint where the environment supports it. Never destroy user-created content during a visual rewrite.

## 16. ANTI-GENERIC PATTERNS (ENFORCED)

Reject unprompted: purple-to-blue gradient hero, endless glass cards, arbitrary floating blobs, emoji as corporate iconography, identical section templates, fake counters, excessive text animations, irrelevant 3D spheres, template-looking testimonial carousels, placeholder copy disguised as real copy, meaningless badges, default mock dashboards, stock imagery disconnected from the service, persistent motion that fights reading. These can be used ONLY if specifically justified by the creative thesis and audience.

## 17. PROJECT ACCEPTANCE CHECKLIST

- [ ] User intent and primary CTA are reflected in the actual page.
- [ ] Creative thesis is specific enough to distinguish the project from another industry.
- [ ] Section sequence has a coherent reason.
- [ ] All repeated colors/spacing/typography use tokens.
- [ ] All primary UI elements work; no fabricated integrations.
- [ ] Desktop/tablet/mobile were checked if rendering tools are available.
- [ ] Build/test results are reported truthfully.
- [ ] Images and claims are sourced, licensed or clearly placeholders.
- [ ] Reduced motion and keyboard navigation were considered.
- [ ] All hard fails are fixed or disclosed.

## 18. EXAMPLE: SOLAR COMPANY (ILLUSTRATIVE, NOT DEFAULT)

Creative thesis: "Engineering precision with an optimistic, sunlit editorial character." Direction: warm off-white, near-black, copper/solar amber used sparingly, confident geometric sans, wide architectural photography, modular grid derived from solar panels; restrained line-drawing transitions. Hero: striking installation photo with a left-aligned declarative value proposition and verified CTA. Proof: real installations and verifiable certifications. Motion: one subtle panel-grid entrance + lightweight section reveals. Avoid: fake solar savings calculations, glowing orb as hero, AI-generated 'customer reviews'.

## 19. EXAMPLE: LAW PRACTICE (ILLUSTRATIVE, NOT DEFAULT)

Creative thesis: "Quiet authority built through editorial restraint." Direction: warm bone background, charcoal typography, muted bronze accent, large serif headlines with straightforward sans utility text, documentary office imagery, narrow editorial text columns. Proof: genuine credentials and specializations; no guarantees or fabricated awards. Motion: understated reveals. Mobile: direct phone/contact options and readable service overview.

## 20. EXAMPLE: AI SAAS (ILLUSTRATIVE, NOT DEFAULT)

Creative thesis: "Product confidence conveyed through real workflows." Direction: crisp typography, neutral surfaces, strong contrast, one controlled accent hue. Hero shows authentic product UI, not fantasy screens. Features use short use-case flows. Interactive demos must use actual state and realistic sample data labeled clearly. Motion reinforces how the product works rather than distracting from functionality.

---

**Integration note:** This file is not magic. It must actually be injected into the design planning stage or retrieved by a tool before code generation. Prefer to pass the relevant sections plus a concise `design-spec.json` to the coding agent. If the current architecture sends the document once without executing QA or rendering, results will remain limited.

# PART II — ADVANCED ART DIRECTION & OBSERVABLE QUALITY ENGINE (V2)

> **Scope and provenance.** This is an original, implementable design-engineering playbook based on public patterns of agent-assisted website creation, plus established visual/UX engineering practices. It does **not** claim access to Lovable's current private prompts, hidden model routes, proprietary reference database or rendering infrastructure. The instructions below require actual backend orchestration to become executable.
>
> **Application rule.** A design instruction is only considered "applied" when it influences the saved design spec and the resulting code. A verification step is only considered "passed" when a real tool produced verifiable evidence.

## 21. CREATIVE DIRECTION: SPECIFIC VISUAL LANGUAGES

Choose one primary art direction and, only if justified, one secondary modifier. Document why it fits the brand, buying situation, and content. Never use the following as empty labels; apply their listed structural consequences.

### 21.1 Editorial / premium institutional
- **Signature:** compelling typography, art-directed photography, quiet authority, deliberate whitespace, magazine-like rhythm.
- **Composition:** oversized headline and documentary visual, off-center columns, restrained borders, alternating open/dense spreads. A single proof strip is often stronger than a 4-card grid.
- **Type:** one distinctive display serif OR expressive sans paired with neutral functional type; elegant yet readable body sizes.
- **Motion:** subtle editorial reveals, soft image masks, minimal fixed elements.
- **Never:** fake rankings, generic product-dashboard hero, indiscriminate parallax, thin text over weak-contrast photography.
- **Useful for:** legal, architecture, premium consulting, high-end hospitality.

### 21.2 Neo-brutalist / expressive typography
- **Signature:** audacious hierarchy, strict geometry, graphic contrast and material honesty.
- **Composition:** modular blocks, sharp edges, purposeful overlaps, typographic banners, visible grid logic.
- **Type:** robust display type with disciplined body type. Preserve genuine legibility; expressive does not mean illegible.
- **Color:** limited high-contrast fields; one deliberate vivid accent if brand-appropriate.
- **Motion:** sharp state changes, purposeful text tracking or clipped entry; avoid strobing, chaotic perpetual animation.
- **Never:** decorative roughness with no identity rationale, uncontrolled overlaps on mobile, unreadable typography.
- **Useful for:** creative studios, music, cultural events, youth brands (when audience warrants it).

### 21.3 Swiss / rationalist / modern corporate
- **Signature:** typographic precision, tight editorial grid, consistency and clarity.
- **Composition:** rigorous alignment, asymmetric but ordered column spans, small utility labels, spacious negative space.
- **Type:** carefully tuned neo-grotesk or geometric sans; contrast via scale/weight, not excessive font families.
- **Motion:** precise and almost invisible; interactions carry more value than entrance effects.
- **Never:** lifeless monochrome because "minimal" was interpreted as no personality.
- **Useful for:** B2B, engineering, professional services, fintech subject to brand requirements.

### 21.4 Cinematic / immersive storytelling
- **Signature:** strong art direction, chapter-based pacing, dramatic photography or 3D with controlled performance.
- **Composition:** large controlled scenes, guided progression, transition between editorial sections, clear way back to navigation and CTA.
- **Type:** legible overlays backed by gradient masks or separate text panels.
- **Motion:** one dominant narrative sequence; user can still read and interact without scroll-jacking.
- **Never:** lock main content behind animation, hijack scrolling by default, rely on WebGL without fallback.
- **Useful for:** product launch, automotive, immersive portfolios, select luxury projects.

### 21.5 Organic / tactile / human-centered
- **Signature:** warm surfaces, human photography, controlled irregularity, inviting typography.
- **Composition:** soft transitions, flexible editorial blocks, naturally cropped photography, subtle texture.
- **Type:** approachable text and expressive but controlled headings.
- **Motion:** gentle transforms and fade, no artificial bouncing on serious conversion flows.
- **Never:** childlike motifs for adult medical/financial decisions, fake candid staff photography.
- **Useful for:** wellness, education, food, community, boutique commerce.

### 21.6 Product-led SaaS / utilitarian premium
- **Signature:** real application interface, honest workflows, clear affordances, credible utility.
- **Composition:** workflow-led hero, genuine product screenshots with consistent device/browser treatments, outcomes linked to UI, expandable technical detail.
- **Type:** clean hierarchical sans, carefully differentiated UI labels and marketing copy.
- **Motion:** workflow demonstrations, controlled transitions and hover details.
- **Never:** fantasy dashboards containing invented KPIs, generic blue-purple glow as brand substitute.
- **Useful for:** SaaS, developer tools, automation, AI interfaces.

### 21.7 Architectural / spatial minimalism
- **Signature:** confident proportions, materiality, photographic hierarchy, generous canvas.
- **Composition:** monumental images, thin informational side columns, precisely aligned captions, spatial sequence.
- **Motion:** gentle panorama or image reveal; preserve control over zoom/crop.
- **Never:** stock city skylines substituted for the client's real properties/projects.
- **Useful for:** architecture, real estate, interiors, premium construction.

### 21.8 E-commerce editorial
- **Signature:** product and merchandising imagery lead; commerce interactions remain frictionless.
- **Composition:** controlled product density, readable price/variation states, campaign editorial mixed with catalog clarity.
- **Motion:** product detail transitions and preview states rather than generalized scroll spectacle.
- **Never:** hide shopping actions in decorative interactions, display fictional availability/prices as real.
- **Useful for:** fashion, beauty retail, specialty products.

### Direction selection record (mandatory)
```json
{
  "primaryDirection": "editorial institutional",
  "modifier": "architectural precision",
  "whyThisDirection": "High-trust professional service with a long consideration cycle",
  "visualPrinciples": ["confident typography", "authentic imagery", "quiet negative space"],
  "explicitRejections": ["glowing orbs", "generic glass cards", "fake award strip"],
  "signatureMove": "offset image + cropped serif statement on the hero",
  "performanceCeiling": "CSS-first, no WebGL",
  "referencesActuallyInspected": []
}
```

## 22. ART-DIRECTION DECISION PROTOCOL (NOT RANDOM STYLE PICKING)

1. **Extract stakes:** is the audience buying a high-trust service, a visual product, a technical tool or a commodity? What information reduces risk?
2. **Derive mood from evidence:** brand identity, supplied assets, audience, vertical, differentiators. Do not assume all solar companies or law firms should look alike.
3. **Generate three distinct concepts internally:** describe each in a short *visual thesis*, one hero composition, one typographic approach and one signature motion.
4. **Select using explicit trade-offs:** score 0–5 for brand fit (30%), information clarity (25%), asset feasibility (20%), differentiation (15%), engineering/performance feasibility (10%). Save selection rationale.
5. **Reject fake differentiation:** adding gradients, rotating 3D objects or randomly alternating layouts does not establish art direction.
6. **Lock key decisions:** after approval or first implementation, avoid changing the whole look for a minor edit. Reopen art direction only for explicit redesigns or evident design failures.
7. **Use supplied references correctly:** references reveal desired *principles* and quality; do not copy source-specific trademarks, exact component layouts, images, or text.

### Signature-element constraint
Every high-design landing page must have **one identifiable brand-specific detail**, such as a typographic motif, a unique process diagram, a striking crop, a non-generic metric presentation backed by data, or a meaningful transition. Limit to two if motion-rich. Any signature detail must support the communication objective and remain functional with reduced motion.

## 23. HIGH-FIDELITY COMPOSITION SYSTEM

### 23.1 Global geometry (starting ranges, not mandatory pixel laws)
| Property | Desktop baseline | Tablet baseline | Mobile baseline |
| --- | --- | --- | --- |
| Content max width | 1120–1440px depending on brand | fluid with 24–40px gutters | fluid with 16–24px gutters |
| Primary grid | 12 logical columns | 6–8 logical columns | 4 logical columns / flex stacks |
| Hero height | content-led; frequently 70–100svh | content-led | auto, no clipped text |
| Section padding | often 80–160px | often 64–112px | often 48–88px |
| Text measure | 55–75ch for prose | 50–70ch | limited by viewport |
| Headline size | responsive `clamp()` | responsive `clamp()` | avoid accidental 1-word-per-line |
| CTA target | comfortably touchable | comfortably touchable | aim for ≥44×44 CSS px where practicable |

Large spacing isn't automatically luxury. Use intentional variation in section density to create rhythm; ensure no page has eight identically sized sections unless the content genuinely warrants it.

### 23.2 Five approved hero *composition families*
- **Editorial split:** 5/12 text, 7/12 image; deliberate baseline alignment, tiny credential eyebrow, expressive H1. Mobile reorders with semantic reading preserved.
- **Monumental type:** giant short statement, clipped or guided visual below, one obvious CTA; ideal only if message is short enough.
- **Immersive media:** photo/video as environment, strong contrast protections, controls and fallback; never let image erase product clarity.
- **Product-led:** genuine UI with concise promise and clearly labeled sample state; show interaction when functional.
- **Data-backed thesis:** headline + one *verified* dominant metric + proof/case-study link, not arbitrary animated numbers.

Before choosing one, write `heroChoiceReason` and `heroRisks`; reject hero compositions that do not fit available assets/copy.

### 23.3 Section-level arrangement contract
For EACH proposed section save:
- `businessPurpose`: what concern or motivation the section addresses.
- `singleMessage`: one sentence; if multiple unrelated claims, split the section.
- `layoutFamily`: editorial spread, asymmetric quote, project case-study, timeline, visual process, comparison, accessible grid, FAQ, etc.
- `visualFocus`: text, authentic photography, technical illustration, live UI, proof.
- `proofStatus`: verified/supplied/placeholder/none.
- `interaction`: explicit behavior, or none.
- `rhythm`: dense/medium/open and transition from preceding section.
- `mobileAdaptation`: which elements stack, reorder or simplify.
- `assetRequirements`: what exactly must be sourced before production.

### 23.4 Section-specific prescriptions
**Hero:** answer "what, for whom, why credible, what next" in first viewport; keep one primary conversion path. Design the line-break intention deliberately but do not hard-code fragile `<br>` breaks at all widths.

**Trust/proof:** prefer one real case study with context over four decorative testimonials. Display logos, awards, certifications, guarantees and results only with permission and supporting facts. A missing proof asset is a content dependency, not a license to invent one.

**Features/services:** use comparative layouts that illustrate real differences. Do not present six equal-sized cards when services vary dramatically in importance. Pair claims with meaningful media or process illustrations.

**Process:** show actual steps and sensible sequencing, not generic "discover/design/deliver" filler if the business operates differently. Make mobile steps readable without forced horizontal scrolling.

**Gallery/projects:** art-direct crops, aspect ratios, transitions and captions; keep image quality and provenance. No invented customer/project photographs framed as real work.

**Pricing/comparison:** one dominant recommended option only when there is genuine information to justify it. Real terms, accessibility and mobile table behavior matter more than fancy animation.

**FAQ:** include actual objections; use real accessible disclosure state with keyboard support; do not make up regulated/legal promises.

**Forms/CTA:** visible labels, required-field markers, errors, pending state, confirmed destination. Treat missing backend as an explicit integration dependency, not a success toast.

**Footer:** serve wayfinding and legitimacy: contact, real legal/business details (when supplied), privacy link if applicable, relevant links. Avoid 30 empty links.

### 23.5 Composition QA: failure signatures
- Every section centered with the same width and three card columns → monotonous hierarchy.
- Gradient titles on every heading → absent typographic authorship.
- Hero huge but does not explain offering → conceptual spectacle with no conversion clarity.
- Generic human photos unrelated to business → false tone/credibility.
- Floating images or badges without actual meaning → visual noise.
- Mobile hero squashes content into 100vh → clipped or inaccessible information.

## 24. DESIGN TOKEN ENGINE — BUILD A SYSTEM, NOT RANDOM CSS

Create a semantic foundation and separate primitive numbers from roles. New projects may define tokens; existing projects must extend established tokens unless full redesign is requested.

```css
:root {
  /* Semantic colors: project must replace these example values */
  --color-page: #f5f4f1;
  --color-text: #172121;
  --color-muted: #546160;
  --color-panel: #ffffff;
  --color-border: #c9d1cf;
  --color-accent: #126a66;
  --color-accent-text: #ffffff;
  --color-focus: #075cc9;

  /* Layout primitives */
  --layout-max: 1280px;
  --gutter: clamp(1rem, 3.8vw, 4.25rem);
  --section-y: clamp(3.5rem, 7vw, 8rem);
  --space-1: .25rem; --space-2: .5rem; --space-3: .75rem;
  --space-4: 1rem; --space-6: 1.5rem; --space-8: 2rem;
  --space-12: 3rem; --space-16: 4rem; --space-24: 6rem;
  --radius-sm: .375rem; --radius-md: 1rem; --radius-lg: 1.5rem;
  --ease-emphasis: cubic-bezier(.2,.7,.15,1);
  --duration-short: 160ms;
  --duration-medium: 420ms;
}
.container { width: min(calc(100% - 2 * var(--gutter)), var(--layout-max)); margin-inline: auto; }
.section { padding-block: var(--section-y); }
:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
```

**Type policy:** specify display/body families, real available weights, loading strategy and fallback; use `font-display: swap` if self-hosting appropriate assets. Use `clamp()` for type scales, but test text at both narrow and wide limits. Locale matters: Portuguese headings may be longer than English mock copy.

**Token validation:** report computed CSS values for a sample headline, paragraph, CTA and secondary surface; verify sufficient contrast. Do not merely write tokens and then ignore them in the components.

## 25. MOTION DIRECTION: STORYBOARD + IMPLEMENTATION CONTRACT

### 25.1 Each animation requires justification
Document for every nontrivial animation:
`element`, `purpose`, `trigger`, `startState`, `endState`, `durationOrScrollRange`, `easing`, `stagger`, `mobileBehavior`, `reducedMotionBehavior`, `failureFallback`, `performanceRisk`.

### 25.2 Motion tiers
- **Tier 0 / utility:** focus, hover, pressed, loading, accordions; accessible and essential.
- **Tier 1 / editorial reveal:** short opacity and transform entrance, limited stagger; content readable if scripts fail.
- **Tier 2 / coordinated sequence:** section-linked reveals and illustration state transitions; use motion only to explain relationships.
- **Tier 3 / signature experience:** pinned media, mask transitions, WebGL interactions or elaborate choreography only when requested/justified by business and runtime budget. Never silently escalate to Tier 3.

### 25.3 GSAP + ScrollTrigger usage guidelines
- Install GSAP only if the project needs timeline orchestration or scroll-linked motion; CSS is enough for most hover/focus states.
- Prefer transform (`x`, `y`, `scale`, `rotation`) and opacity; avoid animating width/top/left on every frame.
- `gsap.context(...)` must scope selectors to the owning component. Revert on unmount to prevent duplicate triggers.
- When SSR is enabled, initialize animation in client effects only. Avoid touching `window`/`document` during server rendering.
- `ScrollTrigger` should not pin whole mobile pages by default; mobile scenes often need simpler alternatives.
- Use `gsap.matchMedia()` or equivalent to vary animation per viewport and user motion preference.
- Any animated item must remain visible with disabled JS and under `prefers-reduced-motion: reduce`.
- Limit heavy scrubbing and expensive measurements; be aware of hydration/layout shift with fonts and imagery.

#### Example: scoped React motion with honest fallback
```tsx
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function EditorialReveal({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // fromTo creates end state only after JS starts: content stays readable without JS.
      gsap.fromTo('[data-reveal]', { autoAlpha: 0, y: 22 }, {
        autoAlpha: 1, y: 0, duration: 0.75, ease: 'power2.out',
        stagger: 0.08, scrollTrigger: { trigger: root.current, start: 'top 85%', once: true }
      });
    }, root);
    return () => ctx.revert();
  }, []);
  return <div ref={root}>{children}</div>;
}
```
**Usage note:** `[data-reveal]` must exist on intended children; for reduced-motion users it receives no inline hiding. Before choosing this over plain CSS, verify that the extra bundle and JS are warranted.

### 25.4 Storyboards instead of random animation
Provide a table with `scene`, `onScroll/interaction`, `visualChange`, `userBenefit`, `reducedMotionAlternative`. Example for premium solar:
1. Hero: subtle crop reveal of a real installation → focuses attention on credibility.
2. Proof: numbered, sourced case study expands → explains outcomes.
3. Technical process: drawn electrical flow on scroll (or static diagram) → teaches installation steps.
4. CTA: simple focus/hover and clear submit state → supports action.

**Scroll safety:** keep native scroll; do not block wheel/touch/keyboard inputs; never require completion of an animation to access a CTA or section. If any user interaction fails when animations are disabled, it is a functional defect.

## 26. WEBGL / 3D EFFECT DECISION GATE

Allow 3D only when ALL apply: (a) product/brand story genuinely benefits; (b) fallback asset exists; (c) target device budget permits; (d) design has a clear loading/failure state; (e) keyboard and reduced-motion flows are preserved; (f) interaction has a tangible purpose. Otherwise use photography, SVG, CSS or video with appropriate controls. If enabled, use lazy scene initialization, reduced pixel density for lower-end devices and explicit canvas cleanup. Do not assume that adding Three.js or React Three Fiber improves the result.

## 27. SMART REFERENCE LIBRARY — DATA MODEL AND SEARCH PIPELINE

### 27.1 Intake
Each reference object should have (minimally):
`id`, `url`, `title`, `industryTags`, `visualStyleTags`, `layoutPatternTags`, `sectionTags`, `colorNotes`, `typeNotes`, `imageNotes`, `motionNotes`, `desktopPreview`, `mobilePreview`, `sourceCapturedAt`, `licenseInfo`, `qualityNotes`, `verifiedFetched`.

A URL alone is **not** analyzed design information. If a fetch/screenshot tool cannot inspect it, mark as `unverified` and do not quote inferred properties. Embeddings can help discovery but do not substitute actual visual inspection.

### 27.2 Retrieval steps
1. Filter for relevant *task type* (landing, ecommerce, admin app). A dashboard reference is usually invalid for a solar-service hero.
2. Find candidates by industry, target user, design direction and needed section/layout components.
3. Inspect cached preview and extracted attributes, verifying provenance. If expired/unknown and fetching is available, refresh the evidence.
4. Score each candidate: `0.30 * industryFit + 0.25 * directionFit + 0.20 * sectionFit + 0.15 * feasibleAssets + 0.10 * accessibilityFit` (all inputs normalized 0–1).
5. Reject hard mismatches even at high aggregate score: copyright conflict, inaccessible pattern, missing key media, irrelevant product type.
6. Select **two or three diverse references** rather than top three near-duplicates; no one visual family may dominate unless clearly justified. Preserve the reasoning and evidence.
7. Synthesize *design primitives*: section rhythm, headline/image proportion, typographic contrast, motif, motion pattern, negative space. Never ask the coding agent to blindly "clone this URL".
8. Save a `referenceSelectionLog` recording `selected[]`, `rejected[]`, score, reason, inspected evidence and timestamp.

### 27.3 Avoid the retrieval trap
If the library has 30 SaaS references but the request is for a law firm, **do not use SaaS examples simply because they are available**. Switch to neutral design principles, user-supplied references, or a real external retrieval tool. Mark that sector coverage is missing. Populate the library by sector and composition type over time.

### 27.4 Reference extraction brief
For each inspected source generate **at most 12 observations** covering: positioning, hero alignment, typography characteristics, scale contrast, section narrative, whitespace, images, border/material treatment, CTA visibility, mobile strategy, purposeful motion, and implementation complexity. Attribute what is observed vs inferred. Do not reproduce exact text/assets.

### 27.5 Safe source-to-project transformation
`reference observation` → `general design principle` → `original application specific to user's content` → `verification screenshot`. Maintain provenance if needed, but do not present inspiration as a design partnership or approval by original creators.

## 28. VISUAL QA: REAL SCREENSHOTS, NOT IMAGINED OUTPUT

### 28.1 What the agent must inspect
Take full-page and first-fold captures, where tooling supports them, at:
- Mobile: ~375×812 viewport (also test 320px when possible).
- Tablet: ~768×1024.
- Desktop: ~1440×900 (and optionally 1920px).

Capture one stable state (fonts/images loaded enough for inspection) and, for motion-rich pages, capture at least one meaningful interactive or scrolled state. Record the actual viewport and URL with each screenshot. Beware screens with dynamic banners, async content and animation timing.

### 28.2 Technical starter: Playwright screenshot and overflow audit
```ts
import { chromium } from 'playwright';

const baseURL = process.env.PREVIEW_URL;
if (!baseURL) throw new Error('PREVIEW_URL is required');
const browser = await chromium.launch({ headless: true });
const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];
for (const v of viewports) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.locator('body').waitFor();
  await page.evaluate(() => document.fonts.ready);
  // Use deterministic screenshot state; test actual motion separately.
  await page.screenshot({ path: `screenshots/${v.name}.png`, fullPage: true, animations: 'disabled' });
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    primaryHeading: document.querySelector('h1')?.textContent?.trim() ?? ''
  }));
  console.log({ ...v, ...layout, overflow: layout.documentWidth > layout.viewport + 2, errors });
  await page.close();
}
await browser.close();
```
**Prerequisites:** package installed, preview running, `screenshots/` directory created, and runtime permits a browser. This captures evidence; it does not itself evaluate aesthetics. Do not falsely report success if a screenshot could not be captured.

### 28.3 Visual inspection checklist (each viewport)
- **First fold:** can a visitor identify what is offered and find the primary action immediately?
- **Typography:** designed line breaks, no widows/orphans when avoidable, no clipped descenders, body legibility.
- **Layout:** alignment consistency, visual balance, appropriate whitespace and section contrast.
- **Assets:** no broken images, accurate aspect ratio, intentional crop, sufficient resolution, no watermarks.
- **Conversion:** CTA stands out, buttons are not visually mistaken for labels, trust proof near decisive action.
- **Responsive:** no horizontal overflow, navigation and sticky elements work, footer readable, touch targets available.
- **Accessibility:** reading order matches visual order, focus rings visible, contrast, form labels and live feedback.
- **Motion:** no permanent hidden state, no jank during scroll, reduced-motion functional.
- **Content integrity:** no fabricated clients, results, testimonials or live integrations.

### 28.4 Visual defect record
Each finding must have: `id`, `viewport`, `element`, `observed`, `expectedFromSpec`, `severity 1-5`, `reach 1-5`, `confidence 0-1`, `likelyCause`, `targetFile`, `proposedPatch`, `status`, `verificationEvidence`.

Prioritize by `severity × reach × confidence`, but **hard failures override any ranking**. A caption spacing adjustment must not displace fixing an unreadable hero or broken CTA.

### 28.5 Iterative repair policy
**Cycle 0:** baseline capture, build, runtime errors, comparison to spec.
**Cycle 1:** repair hard failures, missing or hidden content, overflow, nonfunctional primary CTA.
**Cycle 2:** repair hierarchy, composition, type and poor asset treatment.
**Cycle 3:** polish subtle rhythm, transitions and coherent imagery; stop if it starts compromising function.

After every fix, recapture affected viewport(s) and run affected checks. Maximum three refinement cycles by default, unless a critical bug remains; disclose unresolved issues. Never regenerate unrelated pages based solely on aesthetics.

### 28.6 Visual acceptance scoring
Score ten dimensions 0–5, with evidence: brand relevance, originality, narrative clarity, hierarchy, composition, typography, assets, motion appropriateness, responsive execution, accessibility/interaction. A suggested internal target is ≥40/50 with no dimension under 3, **plus zero hard fails**; this is a team rubric, not a proven predictor of user outcomes or real-world design awards.

When screenshot access is absent, return `visualReview.status = "not_verified"`; evaluate code heuristics separately and do not report an invented visual score.

## 29. COMPLETE `design-spec.json` V2 CONTRACT

Save this before high-scope new site generation or redesign. Extend only as needed and use arrays for provenance so missing evidence is visible.

```json
{
  "schemaVersion": "2.0",
  "project": {
    "name": "Example business",
    "industry": "professional-services",
    "type": "landing-page",
    "locale": "pt-BR",
    "audience": "Local clients seeking a credible service",
    "primaryConversion": "qualified-contact",
    "brandAssetsStatus": "partial"
  },
  "creative": {
    "thesis": "Precise editorial clarity for a high-trust service",
    "primaryDirection": "editorial institutional",
    "modifier": "architectural precision",
    "principles": ["quiet confidence", "authentic proof", "deliberate scale"],
    "forbiddenPatterns": ["glass card wall", "invented metrics", "gradient headline"],
    "signatureElement": "asymmetric project case-study spread",
    "conceptSelectionReason": "Brand fit outweighs decorative spectacle"
  },
  "content": {
    "knownFacts": ["service descriptions provided by client"],
    "missingFacts": ["verified testimonials", "office photography"],
    "claimVerificationPolicy": "missing evidence means omit or label placeholder"
  },
  "designSystem": {
    "colors": { "page": "#f5f4f1", "text": "#172121", "accent": "#126a66" },
    "typography": { "display": "specified-in-project", "body": "specified-in-project", "scale": "fluid" },
    "layout": { "maxContentWidth": "1280px", "desktopGrid": 12, "mobileGutter": "20px" },
    "spacing": { "section": "clamp(3.5rem, 7vw, 8rem)" },
    "materials": { "cardRadius": "16px", "borderStyle": "subtle" }
  },
  "referenceSelectionLog": {
    "retrievalStatus": "unavailable",
    "selected": [],
    "rejected": [],
    "observations": []
  },
  "sections": [
    {
      "id": "hero",
      "businessPurpose": "communicate offering and invite contact",
      "singleMessage": "clarity and trust",
      "layoutFamily": "editorial split",
      "visualFocus": "client-supplied professional photo",
      "proofStatus": "missing",
      "rhythm": "open",
      "interaction": "navigate to contact form",
      "mobileAdaptation": "text-first stacked, no fixed-height crop",
      "assetRequirements": ["client-supplied photography"]
    }
  ],
  "motionPlan": {
    "tier": 1,
    "library": "css",
    "scenes": [],
    "reducedMotion": "all content visible and actions functional"
  },
  "integrations": [
    { "name": "contact form", "status": "pending", "requiredAction": "connect actual endpoint" }
  ],
  "testPlan": { "viewports": [375, 768, 1440], "interactionCases": ["navigation", "cta", "form state"] },
  "qa": {
    "build": "not_run",
    "runtime": "not_checked",
    "visualReview": "not_verified",
    "openIssues": []
  }
}
```

The example values are **not** a universal default; replace them according to actual project evidence. `design-spec.json` is an executable contract between agents only if implementation code and tests consume its fields. Use a schema validator or typed parser in the orchestration layer where possible.

## 30. MULTI-STAGE PROMPT / CONTEXT ROUTING

**Goal:** prevent a giant design document from being injected without selection, leaving the coding model with incoherent requirements.

1. **Context scout** inspects existing project conventions, brand assets and user request; returns compact facts, dependencies and limitations.
2. **Reference selector** consumes only reference metadata and previews relevant to the brief; it returns cited observations, never an unverified claim about URL content.
3. **Creative director** consumes brief + selected reference insights + DESIGN relevant chapters; emits `design-spec.json` with deterministic fields.
4. **Implementation planner** reads the existing file tree and maps sections/components to actual files and dependencies; keeps unaffected files untouched.
5. **Coding agent** receives only the relevant spec and project files, writes actual patches and updates state.
6. **Quality gate** runs build + browser/tool tests, records evidence and defects.
7. **Visual critic** inspects screenshots with a vision-capable model *if available*, ties findings back to design intent and identifies minimal corrective patches.
8. **Patch agent** fixes only verified issues and repeats necessary tests; version checkpoint allows rollback.

A single strong model may perform multiple roles in distinct calls. A long file is a reference **knowledge base**, not a substitute for tool calls. Summaries should capture decisions, not just raw prompt history.

### Suggested state machine
`BRIEFED → REFERENCED|REFERENCE_UNAVAILABLE → DESIGNED → PLANNED → BUILT → BUILD_VERIFIED|BUILD_UNVERIFIED → RENDER_VERIFIED|RENDER_UNVERIFIED → ACCEPTED|PARTIAL`

Never set `ACCEPTED` because the model printed "done". Keep machine-readable verification states and log execution outcomes. Reuse previous `design-spec.json` on follow-up edits, updating only what user changed.

## 31. ORIGINALITY WITHOUT COPYING OR CHAOS

Do not match one public reference one-to-one. Build a style synthesis of 2–3 compatible observations and brand-specific content. Originality checks:
- If logos, fonts, words or photos are the same as the reference without permission, remove/replace.
- If the section order and layout geometry are nearly identical across different clients, revisit the concept.
- If the site is "different" only because of neon gradients or entrance animation, reconsider.
- If readability and conversion suffer from showmanship, simplify.
- If the design would still make sense after replacing all brand names with any other company, it is insufficiently specific.

## 32. ART DIRECTOR REVIEW QUESTIONS

Before code: Why this composition? What must the user notice in 3 seconds? Which single image drives the hero? What is the strongest verified proof? What typography expresses this identity? Which site cliché was intentionally rejected? What will mobile look like independently of desktop?

After rendering: Does the screenshot match the creative thesis? Is the page recognizably designed for THIS client? Are type, imagery and layout coherent? Does each animation communicate or just delay? Is the CTA visible before and after scrolling? Are any elements fake, decorative, or nonfunctional? What changed from the baseline and what evidence supports improvement?

## 33. DETAILED PAGE RECIPE — PROFESSIONAL SERVICES

**Art direction:** editorial, trustworthy, tactile but restrained. **Proposed page narrative:** unique proposition → specific practice/service with genuine details → who it helps → authentic credentials and process → contact pathway → truthful FAQs. **Hero:** typographic scale with documentary asset, not stock gavel or gold abstract sphere. **Motion:** Tier 0–1. **QA priority:** readable copy, verifiable claims, direct CTA, safe mobile header. **Reject:** "10,000 clients" counters without data and fake badges.

## 34. DETAILED PAGE RECIPE — SOLAR & ENGINEERING

**Art direction:** sunlit infrastructure with geometric precision, not generic AI neon. **Proposed narrative:** type of installation and region → how service works → real project proof → technical choice/process → quote request. **Hero:** site photography, blueprints or real installations when available; if no images, compose with editorial grid + meaningful diagram. **Signature:** tasteful panel grid or step illustration. **Motion:** Tier 1, optional Tier 2 for explanatory diagram. **QA:** no unsupported energy savings/ROI guarantees.

## 35. DETAILED PAGE RECIPE — SaaS / AI PRODUCT

**Art direction:** authentic product-centric utility with a credible original visual motif. **Narrative:** what the product enables → real interface or clearly labeled prototype → key workflow → use cases → trust/integration claims with documentation → pricing and CTA. **Hero:** product evidence over fantasy analytics. **Motion:** interface state transitions, short workflow demo, reduced-motion alternative. **QA:** show true states, real navigation, no mock API described as functional.

## 36. OUTPUTS BY ROLE AND HANDOFF RULES

| Role | Input | Required persisted output | Must NOT do |
| --- | --- | --- | --- |
| Brief analyzer | request, code/brand context | `brief.json` (or equivalent) | fabricate facts |
| Reference selector | metadata + inspected previews | `referenceSelectionLog` | assert unread URLs were viewed |
| Art director | brief + observations | `design-spec.json` | write full app before concept is chosen |
| Implementation planner | spec + file tree | scoped file/task plan | refactor unrelated areas |
| Coding agent | plan + spec + real tools | changed source files | fake builds / integrations |
| Visual reviewer | real captures + spec | prioritized defect log | critique screenshot it never saw |
| QA runner | executing environment | build/tests/interaction evidence | mark failures as passed |

## 37. NON-NEGOTIABLE QUALITY GATES V2

1. `design-spec.json` exists for new pages or redesigns and contains a specific visual thesis.
2. Every section has a purpose and intentionally selected composition.
3. The output does not visually duplicate one generic template across industries.
4. Claims, people, testimonials, financial data, awards and integrations are honest.
5. Code compiles **if and only if build was actually executed and passed**; otherwise status is unverified.
6. 375/768/1440 visual checks are recorded when browser is available; otherwise explicitly unverified.
7. Responsive overflow and primary interaction defects are hard failures.
8. Reduced-motion and no-JS fallback are tested where tooling permits.
9. Refined output retains working features and user code; no unrelated churn.
10. Final report includes **implemented**, **tested**, **not tested**, **pending integrations**, and screenshot references when actually created.

## 38. V2 IMPLEMENTATION WARNING

This document is not proof that the runtime supports browser screenshots, code execution, image generation, web search, Vite AST mapping or any specific API. The backend **must** expose working tools and tool-result messages. If an agent receives only this text but cannot read source files, launch a preview and inspect screenshots, it can produce guidance and code but cannot complete the full design-quality loop. Report missing capabilities explicitly instead of hallucinating them.
