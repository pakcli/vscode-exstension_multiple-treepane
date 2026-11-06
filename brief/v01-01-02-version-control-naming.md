---
title: Multiple TreePane - Version Control & Octates Naming Specification
version: v01-01-02
status: canonical
dependencies:
  - "[[modular-architecture-standard]]"
  - "[[zero-hardcoded-variables]]"
  - "[[asci-tree-codeblock-standard]]"
  - "[[cross-os-zero-localhost]]"
  - "[[uiux-wireframe-via-text-ascii-codeblock]]"
---

# Multiple TreePane — Version Control & Octates Naming Specification (`v01-01-02`)

> **Version**: `v01-01-02` (Octates Versioning Standard, Horizontal Height Invariant, Cut/Copy/Paste, Git SourceControl & Native Worktree Integration)  
> **Baseline References**:  
> - [`brief/v01-00_main-idea.md`](file:///e:/proj/vscode-exstension_multiple-treepane/brief/v01-00_main-idea.md)  
> - [`brief/v01-01_structure-and-tecnical.md`](file:///e:/proj/vscode-exstension_multiple-treepane/brief/v01-01_structure-and-tecnical.md)  
> - [`e:/proj/all-lads-tool/skill/briefing-0x-0x-version.md`](file:///e:/proj/all-lads-tool/skill/briefing-0x-0x-version.md)  
> **Primary Objectives**:  
> 1. **Octates Version Control Naming Standard (`vxx-xx-xx` / `vxx.xx.xx`)**: Standardizes 2-digit octate segments mapped to SemVer lifecycle bumps (Major, Minor, Patch). Current release: `1.1.2` &rarr; `v01-01-02` / `v01.01.02`.  
> 2. **Horizontal Split Canvas Height Invariant**: Strict rule that every tree pane card in horizontal split MUST stretch to 100% full canvas height without shrinking to file count.  
> 3. **Right-Click Cut, Copy & Paste Mechanic**: Complete file/folder clipboard system (`Ctrl+X`, `Ctrl+C`, `Ctrl+V`) on tree nodes and pane root background with visual cut dimming (`.tree-node.is-cut`).  
> 4. **Copy Selected Content (Multi-Panel & Native Worktree)**: Dual support for copying full text content of selected file(s) from both the extension multi-panel context menu and the native VS Code Explorer context menu (`multipleTreePane.copySelectedContent`).  
> 5. **Interactive Git Badge**: Clicking the `GIT` badge in any pane header instantly opens and focuses the native VS Code Source Control view for that specific repository.  
> 6. **Automated VSIX Packaging Engine**: Node-driven build scripts (`scripts/package-vsix.js`, `scripts/bump-version.js`) guaranteeing reproducible VSIX artifacts following octates naming.

---

## 📑 DAFTAR ISI (TABLE OF CONTENTS)

1. [Architectural Directives & Invariants](#1-architectural-directives--invariants)
2. [Octates Version Naming Specification](#2-octates-version-naming-specification)
3. [Directory Topology & Boundaries](#3-directory-topology--boundaries)
4. [Clipboard & Context Menu Subsystem](#4-clipboard--context-menu-subsystem)
   - [4.1 Cut, Copy & Paste Engine](#41-cut-copy--paste-engine)
   - [4.2 Copy Selected Content (Multi-Panel & Native Worktree)](#42-copy-selected-content-multi-panel--native-worktree)
   - [4.3 Interactive Git Badge & Source Control Focus](#43-interactive-git-badge--source-control-focus)
5. [UI/UX Monospace Wireframes](#5-uiux-monospace-wireframes)
6. [Unified Build & Release Pipeline](#6-unified-build--release-pipeline)

---

## 1. Architectural Directives & Invariants

- **RULE #1: Octates Version Naming (`vxx-xx-xx` / `vxx.xx.xx`)**:
  All packaged VSIX extension artifacts MUST be named using 2-digit zero-padded octates representing `v{MAJOR}-{MINOR}-{PATCH}.vsix` (e.g., `multiple-treepane-v01-01-02.vsix`), with dot-formatted aliases (`multiple-treepane-v01.01.02.vsix`) generated for cross-tooling compatibility.
- **RULE #2: Full Canvas Height Invariant (Horizontal Split)**:
  In horizontal split mode (`.panes-container.layout-horizontal`), all `.tree-pane` elements MUST have `height: 100% !important; align-self: stretch !important;`. No tree pane card may shrink-wrap to its content count. All obsolete inline height styles from vertical resizing MUST be stripped upon layout switch.
- **RULE #3: Native VS Code Theme Parity & Zero Localhost**:
  All visual styling strictly derives from VS Code CSS variables (`var(--vscode-*)`). Zero external HTTP/localhost daemons; all operations use VS Code Extension Host IPC (`postMessage`).
- **RULE #4: Dual Worktree Content Extraction**:
  The "Copy Selected Content" action must be accessible both inside the Multi-Tree webview panel and via native VS Code Explorer context menu (`explorer/context`).

---

## 2. Octates Version Naming Specification

The versioning convention bridges standard SemVer (`X.Y.Z`) with the project's canonical 2-digit octates naming (`vXX-XX-XX`):

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        OCTATES VERSION MATRIX                          │
├───────┬────────────┬─────────────────────────────┬─────────────────────┤
│ LEVEL │ BUMP TYPE  │ SEMVER TRANSITION           │ OCTATES ARTIFACT    │
├───────┼────────────┼─────────────────────────────┼─────────────────────┤
│   3   │ 3Patch     │ 1.1.0 -> 1.1.1 -> 1.1.2     │ v01-01-02           │
│   2   │ 2Minor     │ 1.1.0 -> 1.2.0              │ v01-02-00           │
│   1   │ 1Major     │ 1.1.0 -> 2.0.0              │ v02-00-00           │
└───────┴────────────┴─────────────────────────────┴─────────────────────┘
```

### Conversion Algorithm (`scripts/package-vsix.js`)
```javascript
const [major = 0, minor = 0, patch = 0] = pkg.version.split('.').map(Number);
const octetDash = `v${String(major).padStart(2, '0')}-${String(minor).padStart(2, '0')}-${String(patch).padStart(2, '0')}`;
const octetDot  = `v${String(major).padStart(2, '0')}.${String(minor).padStart(2, '0')}.${String(patch).padStart(2, '0')}`;
// Output: multiple-treepane-v01-01-02.vsix & multiple-treepane-v01.01.02.vsix
```

---

## 3. Directory Topology & Boundaries

```text
vscode-exstension_multiple-treepane
├── brief/
│   ├── v01-00_main-idea.md                     # UX vision & multi-repo concurrency
│   ├── v01-01_structure-and-tecnical.md        # Monolithic technical blueprint
│   └── v01-01-02-version-control-naming.md     # Octates naming & subsystem specs
├── media/
│   ├── main.css                                # 100% canvas height, context menus, badges
│   ├── main.js                                 # Webview state, clipboard, DND, git click
│   └── icons/treepane.svg                      # Activity bar SVG
├── out/
│   ├── dist/                                   # Compiled extension host output (*.js, *.js.map)
│   └── vsix/                                   # Packaged release artifacts
│       ├── multiple-treepane-v01-01-02.vsix    # Canonical octates artifact (dash)
│       └── multiple-treepane-v01.01.02.vsix    # Dot-formatted artifact (dot)
├── scripts/
│   ├── bump-version.js                         # Automated SemVer & Octates bump CLI
│   └── package-vsix.js                         # VSIX packager with octates naming
├── src/
│   ├── extension.ts                            # Commands & explorer context registration
│   ├── FileSystemService.ts                   # File copy/move, content read & git focus
│   ├── TreePanelManager.ts                     # WebviewPanel tab controller
│   ├── TreeSidebarProvider.ts                  # WebviewView sidebar provider
│   ├── types.ts                                # IPC message & state interfaces
│   └── WebviewUtils.ts                         # HTML generation & IPC dispatcher
└── package.json                                # Extension manifest (current: 1.1.2)
```

---

## 4. Clipboard & Context Menu Subsystem

### 4.1 Cut, Copy & Paste Engine
- **Cut (`Ctrl+X`)**:
  - Sets `fileClipboard = { operation: 'cut', paths, sourcePaneId }`.
  - Visually dims the cut nodes with `.tree-node.is-cut` (opacity 0.45 + dashed border).
- **Copy (`Ctrl+C`)**:
  - Sets `fileClipboard = { operation: 'copy', paths, sourcePaneId }`.
  - Clears any existing cut visual indicators.
- **Paste (`Ctrl+V`)**:
  - Available when right-clicking on any folder, file (target = parent dir), or pane background / root.
  - Shows dynamic item count badge (e.g. `Paste (3)`).
  - Triggers `copyItems` or `moveItems` via `vscode.workspace.fs`.
  - Clears cut state and removes `.is-cut` classes after pasting.
- **Cancel Cut (`Escape`)**:
  - Pressing `Escape` cancels pending cut operations and restores normal node opacity.

### 4.2 Copy Selected Content (Multi-Panel & Native Worktree)
- **Multi-Panel (`Alt+C` / Context Menu)**:
  - Reading single file puts full raw UTF-8 content directly to system clipboard.
  - Multi-file selection cleanly formats each file with headers:
    ```
    // === File: app.ts (/e/proj/web-app/src/app.ts) ===
    ...content...
    ```
- **Native VS Code Worktree (`explorer/context`)**:
  - Contributed command `multipleTreePane.copySelectedContent` in `package.json`.
  - Allows right-clicking any file in VS Code's native file explorer to copy its full content instantly without opening it.

### 4.3 Interactive Git Badge & Source Control Focus
- Pane subheader renders an interactive badge: `<span class="repo-badge btn-git-badge">GIT</span>`.
- Clicking the badge dispatches `openSourceControl` IPC message.
- `FileSystemService.openSourceControlForRepo(repoPath)` executes:
  1. `vscode.commands.executeCommand('workbench.view.scm')` to reveal the Source Control sidebar.
  2. Queries `vscode.git` API to focus and select the specific target repository among multi-root workspaces.

---

## 5. UI/UX Monospace Wireframes

### 5.1 Context Menu & Cut/Copy/Paste
```text
┌─────────────────────────────────────────┐
│ Cut                               Ctrl+X│  <- Dims node (.is-cut)
│ Copy                              Ctrl+C│  <- Copies path/nodes
│ Paste (2 items)                   Ctrl+V│  <- Pastes into folder/root
├─────────────────────────────────────────┤
│ Copy Selected Content              Alt+C│  <- Copies raw file content
├─────────────────────────────────────────┤
│ Copy Path                    Shift+Alt+C│
│ Copy Relative Path     Ctrl+K Ctrl+Shf+C│
│ Copy Path Advance                       │
├─────────────────────────────────────────┤
│ Rename                                F2│
│ Move to Repo...                         │
├─────────────────────────────────────────┤
│ Reveal in File Explorer                 │
└─────────────────────────────────────────┘
```

### 5.2 Interactive Git Badge & Full Canvas Fit
```text
┌───────────────────────────────────┬─┬──────────────────────────────────┐
│ ::: #1: all-lads-tool [GIT] < > ✕ │ │ ::: #2: web-app-sport-club [GIT] │
│                               ▲   │ │                                  │
│         Click opens SCM ──────┘   │ │                                  │
│ [▶] [ Filter files...  |Aa|ab|.*] │ │ [▶] [ Filter files... |Aa|ab|.*] │
├───────────────────────────────────┤ ├──────────────────────────────────┤
│ v brief/                          │ │ v src/                           │
│   v01-00_main-idea.md             │ │   app.ts                         │
│ v script/                         │ │   types.ts                       │
│   nodejs/                         │ │                                  │
│                                   │ │                                  │
│ (Stretches 100% canvas height)    │ │ (Stretches 100% canvas height)   │
│                                   │ │                                  │
└───────────────────────────────────┴─┴──────────────────────────────────┘
```

---

## 6. Unified Build & Release Pipeline

### 6.1 Package VSIX (Current Release: `v01-01-02` / `v01.01.02`)
```bash
cd e:\proj\vscode-exstension_multiple-treepane
npm run compile
npm run package
```
Generates:
- `out/vsix/multiple-treepane-v01-01-02.vsix`
- `out/vsix/multiple-treepane-v01.01.02.vsix`

### 6.2 Lifecycle Version Bump Commands
```bash
# 3Patch bump (e.g., 1.1.2 -> 1.1.3 / v01-01-03)
npm run bump:patch

# 2Minor bump (e.g., 1.1.2 -> 1.2.0 / v01-02-00)
npm run bump:minor

# 1Major bump (e.g., 1.1.2 -> 2.0.0 / v02-00-00)
npm run bump:major
```
