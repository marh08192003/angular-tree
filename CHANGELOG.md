# Change Log

All notable changes to the "angular-tree" extension will be documented in this file.

This project follows the recommendations from
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-09

### Added

- Collapsible and expandable nodes in the hierarchy tree.
- Ability to visually manage large Angular projects by hiding and revealing subtrees.
- Improved usability for complex component hierarchies.
- Clear distinction between navigation action (click) and structure exploration (expand/collapse).

### Changed

- Tree rendering behavior: nodes are now interactive for expand/collapse instead of being always fully expanded.
- Improved initial tree readability for large projects.

### Technical Details

- D3.js hierarchy updated to support `_children` state for collapsible nodes.
- Tree layout updates now preserve expand/collapse state during interactions.
- No breaking changes to existing commands or APIs.

## [1.0.0] - 2026-02-07

### Added

- Initial public release of **Angular Tree**.
- Command `Angular Tree: Show Angular Hierarchy Tree`.
- Automatic scanning of Angular projects to detect:
  - Standalone components.
  - Lazy-loaded routes via `loadComponent`.
  - Nested routes using `children`.
  - Template-based parent-child relationships via selectors.
- Interactive hierarchy visualization using D3.js.
- Zoom and pan support for large component trees.
- Click on any node to open the corresponding component file in the editor.
- Persistent webview state when switching tabs (`retainContextWhenHidden`).
- Support for reopening the webview without losing the rendered tree.

### Technical Details

- AST-based route analysis using the TypeScript compiler API.
- Robust file system scanning scoped to `src/app`.
- Safe webview state persistence using `acquireVsCodeApi().setState`.
- Optimized backend–frontend handshake to avoid duplicated renders.

## [Unreleased]

### Planned

- Support for `loadChildren` (lazy-loaded modules).
- Visual distinction between route-based and template-based relationships.
- Manual refresh command for the hierarchy.
- Filtering and search within the tree.
