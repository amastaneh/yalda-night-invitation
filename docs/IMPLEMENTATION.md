# Implementation plan

Keep the specified GitHub Pages + Workers + D1 architecture. Export only public static shells at /, /invite/ and /admin/. Fetch all event and household information after authorization. Use sessionStorage for expiring bearer sessions; exchange invitation secrets and remove query parameters before rendering private data. No analytics.

1. Initialize pnpm workspace, strict TypeScript, semantic tokens and optimized fonts.
2. Build a Persian editorial invitation with photographic hero, calendar, countdown and responsive forms.
3. Add normalized multi-event D1 schema, hash-only invitation tokens, scoped sessions and atomic RSVP updates.
4. Add optional pledges, received-only campaign progress, atomic food commitments, pomegranate challenge and cultural features.
5. Add password-based admin authentication, household management, exports/imports and configurable event/campaign settings.
6. Exercise API and browser journeys, review security and accessibility, build static output and deployment workflows.
7. Inspect mobile/tablet/desktop screenshots and refine the final UI.

## Visual direction

Midnight plum and warm ivory, pomegranate accents and fine gold rules. Lalezar only for expressive titles; Vazirmatn for Persian UI and Geist for Latin details. Large photographic composition with quiet negative space. Secondary experiences are clearly optional. Reduced motion is honored globally.

## Compatibility research

Official documentation reviewed: https://nextjs.org/docs/app/guides/static-exports, https://developers.cloudflare.com/d1/get-started/, https://orm.drizzle.team/docs/get-started/d1-new, https://tailwindcss.com/docs/installation/using-postcss, https://ui.shadcn.com/docs/installation/next, https://motion.dev/docs/react-accessibility. Stable package versions are resolved by pnpm and pinned in its lockfile; Drizzle's RC channel is intentionally excluded. Next export has no server runtime, Server Actions, request middleware or dynamic route handlers. Calendar generation is client-side from authorized event data. Best Buy Canada purchase destination verified against https://www.bestbuy.ca/en-ca/category/best-buy-gift-cards/20277.
