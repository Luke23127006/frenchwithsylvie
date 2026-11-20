# Repository instructions

## UI changes on the preview branch

- Before editing UI, check the current branch with `git branch --show-current`.
- On `feature/ui-preview`, a request to change UI permits writes only under `ui-preview/`. This includes components, styles, assets, mock data, tests, and supporting configuration for that UI change. Read the corresponding screen in `next-app/` if you need a reference.
- If the requested result requires changes outside `ui-preview/`, explain the scope conflict before taking that part on. Do not switch branches to work around this rule. Review the changed paths before handing off and preserve any pre-existing work.

For UI work, read [the French with Sylvie UI skill](ui-preview/.agents/skills/french-with-sylvie-ui/SKILL.md). Use the components and tokens from the app you are editing.
