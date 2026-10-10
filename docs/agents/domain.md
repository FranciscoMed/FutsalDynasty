# Domain Docs

Engineering skills should read domain documentation before exploring relevant code:

- Read the root `GLOSSARY.md`, or `GLOSSARY-MAP.md` and the glossary for the relevant context if that map exists.
- Read relevant decisions in `docs/adr/`.
- If those files do not exist, proceed without flagging their absence; create them only when domain terms or decisions need to be recorded.

Use glossary terms in issue titles, refactor proposals, and tests. Surface conflicts with relevant ADRs instead of silently overriding them.

This repo uses a single-context layout: root `GLOSSARY.md` and `docs/adr/`.
