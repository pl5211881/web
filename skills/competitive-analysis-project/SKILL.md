---
name: competitive-analysis-project
description: Continue development of the local UX competitive analysis tool in /Users/v_chaijianxin/Documents/New project 2. Use when the user asks to continue this project, modify the competitive-analysis website, deploy or push it, debug model/API behavior, preserve its DESIGN.md constraints, or summarize the current project for another AI conversation.
---

# Competitive Analysis Project

Use this skill to resume work on the user's UX competitive analysis tool without rediscovering the whole project.

## First Steps

1. Work in `/Users/v_chaijianxin/Documents/New project 2`.
2. Read `DESIGN.md` before visual or layout changes.
3. For a full handoff summary, read `references/project-status.md`.
4. Check `git status --short` before editing; preserve user changes.
5. Prefer focused edits in `src/main.js`, `src/styles.css`, `server/index.js`, or `api/index.js` as appropriate.

## Project Commands

```bash
npm run dev
npm run build
npx vercel --prod --yes
```

Local URLs:

- Frontend: `http://localhost:5173/`
- API health: `http://localhost:3001/api/health`

Production:

- `https://competitive-analysis-rho.vercel.app`

## Non-Negotiable Design Rules

- Keep the app as a dark B-side analysis workspace, not a marketing page.
- Keep the primary color `#00BCBC`.
- Keep primary button and logo text white.
- Preserve the current structure: competitor discovery, upload screenshots, UX dimension analysis, output report.
- Do not restore the old standalone profile generation module.
- Keep competitor discovery before screenshot upload unless the user explicitly asks to remove it.
- Keep image limit at 9 per product.
- Keep export buttons hidden until a report exists.
- Keep report matrix content-only; do not show scores in the horizontal comparison matrix.

## Validation Workflow

After code or CSS changes:

1. Run `npm run build`.
2. If UI changed, run `npm run dev` and verify desktop and mobile in the browser.
3. Manually check upload slots, product name editing, image preview modal, model config modal, dimension picker, report rendering, export buttons, and responsive table scrolling.
4. If deploying, commit, push `main`, then run `npx vercel --prod --yes`.

## Reference

Read `references/project-status.md` for the latest project summary, completed features, constraints, next steps, and required test scenarios.
