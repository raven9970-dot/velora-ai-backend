AGENTS.md
Gunakan TypeScript
Gunakan Tailwind CSS
Jangan gunakan any
Buat kode modular
Tambahkan komentar untuk logika kompleks
Selalu buat unit test
Jangan install package baru tanpa alasan

# Root AGENTS
@"
# AGENTS.md
## Dev environment tips
- Use `pnpm dlx turbo run where <project_name>` to jump to a package instead of scanning with `ls`.
- Run `pnpm install --filter <project_name>` to add the package to your workspace so Vite, ESLint, and TypeScript can see it.
- Use `pnpm create vite@latest <project_name> -- --template react-ts` to spin up a new React + Vite package with TypeScript checks ready.
- Check the name field inside each package's package.json to confirm the right name—skip the top-level one.

## Testing instructions
- Find the CI plan in the .github/workflows folder.
- Run `pnpm turbo run test --filter <project_name>` to run every check defined for that package.
- From the package root you can just call `pnpm test`. The commit should pass all tests before you merge.
- To focus on one step, add the Vitest pattern: `pnpm vitest run -t "<test name>"`.
- Fix any test or type errors until the whole suite is green.
- After moving files or changing imports, run `pnpm lint --filter <project_name>` to be sure ESLint and TypeScript rules still pass.
- Add or update tests for the code you change, even if nobody asked.

## PR instructions
- Title format: [<project_name>] <Title>
- Always run `pnpm lint` and `pnpm test` before committing.

## Project Rules
- Follow existing patterns
- Keep code simple
- Write maintainable code
- Run tests before commit

## Skills
See .agents/skills/*
"@ | Out-File AGENTS.md -Encoding utf8

# Folder structure
New-Item -ItemType Directory -Force .agents\skills\frontend
New-Item -ItemType Directory -Force .agents\skills\backend
New-Item -ItemType Directory -Force .agents\skills\database
New-Item -ItemType Directory -Force .agents\skills\testing

# Frontend Skill
@"
# Frontend Skill

- Use reusable components
- Prefer existing UI patterns
- Avoid inline styling
"@ | Out-File .agents\skills\frontend\SKILL.md -Encoding utf8

# Backend Skill
@"
# Backend Skill

- Validate input
- Handle errors properly
- Keep business logic separated
"@ | Out-File .agents\skills\backend\SKILL.md -Encoding utf8

# Database Skill
@"
# Database Skill

- Avoid SELECT *
- Use indexes when appropriate
- Use migrations for schema changes
"@ | Out-File .agents\skills\database\SKILL.md -Encoding utf8

# Testing Skill
@"
# Testing Skill

- Add tests for new features
- Verify edge cases
- Run tests before PR
"@ | Out-File .agents\skills\testing\SKILL.md -Encoding utf8

Write-Host "✅ AGENTS.md setup selesai"