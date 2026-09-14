---
description: Summarize what was done this session — the work, the approach, and the concrete changes
argument-hint: "[optional focus, e.g. 'just the auth work']"
---

Produce a clear "ship summary" of the work done in this session so far. $ARGUMENTS

Adapt the summary to what the session actually involved — don't force sections that don't apply:

## What I did
2–5 sentences: the goal, and what was accomplished.

## How I did it
The approach and any key decisions or trade-offs made.

## Changes
Detect the type of work and report accordingly:

- **If code was written/modified:** list each file touched as `path` — created / modified / deleted, with a one-line note on what changed and why. Call out new dependencies, config, or anything that needs a migration/rebuild/restart to take effect.
- **If a document was written/edited:** list the documents touched and summarize what changed in each (sections added, rewritten, or removed) — content-level, not file-level.
- **If it was research/analysis only (no files changed):** skip the file list and give the key findings or conclusions instead.

## Notes
Only if relevant: anything unfinished, untested, follow-ups worth doing, or things the user should verify.

Keep it tight and factual — report what actually happened, including anything that failed or was skipped. Do not make new code or file changes while running this command; this is a summary only.
