# Codex Start Here

You are taking over a long-running project from another development session. The goal is to continue the existing design, not restart the project from scratch.

## First task

Do **not** modify anything yet.

1. Read `AGENTS.md` and every document in `docs/`.
2. Inspect the repository structure.
3. Inspect the current implementations of the backend registry/loaders/services/models and the frontend context/pages/components.
4. Run the existing test suite.
5. Compare the actual code to the documentation.
6. Report:
   - current architecture
   - current test status
   - incomplete/broken features
   - discrepancies between docs and code
   - the safest next implementation step

Then wait for the developer.

## Development philosophy

This project is being built iteratively. The developer often thinks about the desired user experience first and then works backward into the data model/UI. Preserve that workflow.

The application should eventually let a DM:

- build and browse a persistent fantasy world
- manage campaigns and campaign history
- manage NPCs, PCs, locations, artifacts, lore, events and maps
- link entities together
- see relevant information quickly during a session
- plan stories as flexible graphs rather than rigid documents
- record what players actually did
- track consequences and independent world clocks
- adapt the planned story without losing the original ideas

## Source hierarchy

When deciding whether something is canon, use this hierarchy unless the developer explicitly overrides it:

1. Current repository data/code and tests
2. Structured campaign/world export supplied with this handoff
3. Original campaign documents supplied by the developer
4. Explicit decisions made by the developer in conversation
5. Assistant proposals/design ideas — these are **not canon** until accepted

Where sources disagree, flag the discrepancy. Do not silently reconcile it.
