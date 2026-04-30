# Coding Standards

<!-- Customize this file with your project's coding standards.
     The reviewer agent loads it during code review via @.sandcastle/CODING_STANDARDS.md
     so these standards are enforced during review without costing tokens during implementation. -->

## Style

- Use camelCase for variables and functions
- Use PascalCase for classes, types and React components
- File names should match the case of their primary export. If the file has many exports, prefer kebab-case
- Prefer named exports over default exports
- Prefer arrow functions over function declarations

## Testing

- Every public function must have at least one test
- Use descriptive test names that explain the expected behavior

## Architecture

- Keep modules focused on a single responsibility
- Prefer composition over inheritance
