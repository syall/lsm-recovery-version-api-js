# Changesets

This directory is managed by [Changesets](https://github.com/changesets/changesets).

## Adding a changeset

For every PR that changes published behavior, run:

```bash
npx changeset
```

and follow the prompts (bump type — patch/minor/major — plus a short
summary). This writes a markdown file into `.changeset/` describing the
change; commit it alongside your PR. A CI workflow uses these files to
open/update a "Version Packages" PR that bumps `package.json`'s version
and rewrites `CHANGELOG.md` — no publishing happens automatically (see
`.github/workflows/changesets.yml`, which intentionally has no publish
step yet).

Read more about the workflow in [our
documentation](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
