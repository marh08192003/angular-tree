# Angular Tree

Angular Tree is a Visual Studio Code extension that scans your Angular
project, analyzes components, templates, selectors, imports, and routing
configuration, and generates an interactive component hierarchy tree.

This tool helps developers understand how Angular components relate to
each other, improving navigation, architecture comprehension, code
review, and refactoring.

---

## Features

- Scans Angular Standalone Components automatically.
- Detects:
  - Component selectors in templates.
  - `imports` in standalone components.
  - `loadComponent()` inside route configuration.
- Builds a full parent → child hierarchy tree.
- Supports collapsing and expanding nodes for large projects.
- Click any node to jump directly to its source file.
- Auto-refreshes the hierarchy every time you save a file.
- Displays the tree inside a custom WebView using D3.js.

---

## Usage

1. Open any Angular workspace.
2. Run the command:

```
Angular Tree: Show Angular Hierarchy Tree
```

3. A WebView panel will open showing the hierarchical structure of your
   component tree.
4. Click a node to expand or collapse its children.
5. Click the component label to open its `.ts` source file.

---

## Commands

| Command                      | Description                                 |
|------------------------------|---------------------------------------------|
| `angular-tree.showHierarchy` | Opens the Angular hierarchy tree view.      |

---

## Requirements

No additional configuration is required.
Works automatically with Angular Standalone Components.

Supported patterns:

- `@Component({ selector })`
- `imports: [...]`
- `<component-selector></component-selector>`
- Route lazy loading:

```ts
{
  path: '',
  loadComponent: () => import('./path/to/component')
}
```

---

## Extension Settings

This extension does not currently expose configuration settings.

---

## Known Issues

- Does not yet detect dynamic components created via `ViewContainerRef`.
- Does not analyze directives or pipes hierarchy.
- Only supports Angular Standalone; modules are ignored.

---

## Release Notes

### 1.1.0
- Added collapsible and expandable nodes for improved navigation in large projects.
- Tree state is preserved while navigating and reopening the view.

### 1.0.0

- Initial release.
- Full standalone Angular hierarchy detection.
- Template selector scanning.
- Import scanning.
- Route resolver support.
- Interactive D3.js tree renderer.

---

## License

MIT License.
