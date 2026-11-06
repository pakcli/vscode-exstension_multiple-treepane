---
title: Multiple TreePane Explorer - Technical & Operational Guide
category: DEVELOPER_GUIDE
tags: [vscode, extension, antigravity, multiple-treepane, guide, manual]
---

# Multiple TreePane Explorer — Operational & Developer Guide (`GUIDE.md`)

> Comprehensive technical operations manual, UI/UX interaction reference, command registry, and troubleshooting matrix for Multiple TreePane Explorer in Visual Studio Code & Google Antigravity IDE.

---

## 📑 Daftar Isi (Table of Contents)

1. [Architectural Overview & Host Integration](#1-architectural-overview--host-integration)
2. [Commands & Keybindings](#2-commands--keybindings)
3. [UI/UX Interaction & Cockpit Controls](#3-uiux-interaction--cockpit-controls)
   - [3.1 Global Main Header (1 Row)](#31-global-main-header-1-row)
   - [3.2 Multi-Tree Concurrent Grid (Horizontal vs Vertical Split)](#32-multi-tree-concurrent-grid-horizontal-vs-vertical-split)
   - [3.3 Focus Mode (100% Maximize)](#33-focus-mode-100-maximize)
   - [3.4 Per-Pane Subheader & Find Widget (Aa, ab, .*)](#34-per-pane-subheader--find-widget-aa-ab-)
   - [3.5 Drag-and-Drop Sorting (:::) & Gutter Resizers](#35-drag-and-drop-sorting---gutter-resizers)
   - [3.6 Right-Click Cut, Copy & Paste Engine (Ctrl+X, Ctrl+C, Ctrl+V)](#36-right-click-cut-copy--paste-engine-ctrlx-ctrlc-ctrlv)
   - [3.7 Copy Selected Content (Multi-Panel & Native Explorer)](#37-copy-selected-content-multi-panel--native-explorer)
   - [3.8 Interactive Git Badge & Source Control Focus](#38-interactive-git-badge--source-control-focus)
   - [3.9 Terminal Drag-and-Drop & Context Actions](#39-terminal-drag-and-drop--context-actions)
4. [Development & Packaging Workflow (out/dist vs out/vsix)](#4-development--packaging-workflow-outdist-vs-outvsix)
5. [Troubleshooting & Root Cause Matrix](#5-troubleshooting--root-cause-matrix)

---

## 1. Architectural Overview & Host Integration

Multiple TreePane provides concurrent multi-directory visibility through two host mechanisms sharing a single webview codebase (`src/WebviewUtils.ts`, `media/main.js`, and `media/main.css`):

```text
+-----------------------------------------------------------------------------------------------+
|                            HOST INTEGRATION ARCHITECTURE                                      |
+-----------------------------------------------------------------------------------------------+
|                                                                                               |
|   +---------------------------------------+       +---------------------------------------+   |
|   | 1. SIDEPANEL DOCK                     |       | 2. FULL-WIDTH EDITOR TAB              |   |
|   | Controller: TreeSidebarProvider.ts    |       | Controller: TreePanelManager.ts       |   |
|   | Provider: WebviewViewProvider         |       | Provider: vscode.window.createWebview |   |
|   | Target: Activity Bar / Secondary Bar  |       | Target: Main Editor Group / Grid      |   |
|   | Default Mode: Vertical Split (T / T)  |       | Default Mode: Horizontal Split (T|T|T)|   |
|   +---------------------------------------+       +---------------------------------------+   |
|                       \                                       /                               |
|                        \                                     /                                |
|                         v                                   v                                 |
|   +---------------------------------------------------------------------------------------+   |
|   | CORE SUBSYSTEM PIPELINE                                                               |   |
|   | - FileSystemService.ts : Workspace root discovery, git submodule scanning, lazy tree  |   |
|   | - WebviewUtils.ts      : CSP encapsulation, HTML template injection, IPC router      |   |
|   | - media/main.js        : Tree renderer, search engine, drag reorder, resize observer  |   |
|   | - media/main.css       : VS Code native theme tokens, flex stretching, resizer gutters |   |
|   +---------------------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------------+
```

---

## 2. Commands & Keybindings

The extension exposes 4 primary commands contributed in `package.json`:

| Command Identifier | Title in Command Palette | Default Context Menu / View Action | Action |
| :--- | :--- | :--- | :--- |
| `multipleTreePane.openEditorTab` | `Multiple TreePane: Open in Full-Width Editor Tab` | Title navigation button (`layout-sidebar-right`) | Spawns or focuses the multi-tree cockpit in a full-width Editor Tab. |
| `multipleTreePane.refresh` | `Multiple TreePane: Refresh All Trees` | Title navigation button (`refresh`) | Triggers recursive workspace scanning and repopulates all panes. |
| `multipleTreePane.addPane` | `Multiple TreePane: Add Directory Tree Pane` | Title navigation button (`add`) | Appends an additional independent directory pane to the view. |
| `multipleTreePane.copySelectedContent` | `Multiple TreePane: Copy Selected File Content` | Native Explorer context (`explorer/context`) & `Alt+C` in panel | Reads full raw UTF-8 content of selected file(s) directly to system clipboard without opening them. |

---

## 3. UI/UX Interaction & Cockpit Controls

### 3.1 Global Main Header (1 Row)

The top-level cockpit header is strictly constrained to 1 row (`height: var(--header-height)`):
* **`[ 📁 Repos (X/Y) ▾ ]`**: Popover dropdown showing all detected repositories and submodules with live checkbox toggles to hide or display specific trees without destroying their state.
* **`[ ▦ Split / ⬚ Focus ]`**: Toggles between concurrent multi-tree display and 100% maximized focus mode.
* **`[ ⬍ Vertical / ⬈ Horizontal ]`**: Manual split orientation override.
* **`[ + Add ]`**: Appends a new directory tree pane.
* **`[ ↻ ]`**: Refreshes workspace directories.

### 3.2 Multi-Tree Concurrent Grid (Horizontal vs Vertical Split)

* **Horizontal Split (`.layout-horizontal`)**: Default for Editor Tab. Trees are laid out side-by-side (`T | T | T | T | T`). Columns stretch to 100% viewport height (`align-items: stretch !important`).
* **Vertical Split (`.layout-vertical`)**: Default for Sidebar/Sidepanel (< 550px width). Trees stack vertically (`T / T / T`).

### 3.3 Focus Mode (100% Maximize)

Clicking `[ ⬚ Focus ]` (or focusing an individual tree) immediately switches container class to `.layout-focus`. The selected active pane expands to 100% width and 100% height, while all other panes are non-destructively hidden. Re-clicking returns all panes to their exact previous dimensions and scroll positions.

### 3.4 Per-Pane Subheader & Find Widget (`Aa`, `ab`, `.*`)

Each tree pane features a compact 2-row subheader by default:
* **Row 1 (Identity & Navigation)**:
  * Drag handle `:::` for reordering.
  * Tree index and folder name (`#1: all-lads-tool`).
  * `[1st]`: Moves pane to the first position.
  * `[<]` and `[>]`: Shifts pane left/right (or up/down).
  * `[✕]`: Closes pane.
* **Row 2 (Find Widget Box)**:
  * Text input with instant real-time filtering and branch auto-expansion.
  * `[Aa]`: Case-sensitive search.
  * `[ab]`: Whole word boundary matching.
  * `[.*]`: Regular expression search with red border error feedback on invalid syntax.
* **Row 3 (Expandable via `[▶]`)**:
  * Root selector dropdown (`-- Switch Root --`).
  * `[📁]`: Browse custom OS folder outside workspace.
  * `[↻]`: Refresh individual pane tree.

### 3.5 Drag-and-Drop Sorting (`:::`) & Gutter Resizers

* **HTML5 Drag Handle (`:::`)**: Click and drag any pane header to reorder panes visually.
* **Gutter Resizers (`.pane-resizer`)**: 6px interactive gutters between panes. In horizontal mode, dragging left/right adjusts `flex-basis` and `width`. In vertical mode, dragging up/down adjusts height.

### 3.6 Right-Click Cut, Copy & Paste Engine (`Ctrl+X`, `Ctrl+C`, `Ctrl+V`)

* **Cut (`Ctrl+X` / Context Menu)**:
  * Targets the selected file or folder node.
  * Visually dims the node with class `.tree-node.is-cut` (opacity 0.45, dashed focus outline).
  * Stores clipboard state `{ operation: 'cut', paths: [...], sourcePaneId }`.
* **Copy (`Ctrl+C` / Context Menu)**:
  * Copies the selected path into the virtual clipboard without modifying node appearance.
* **Paste (`Ctrl+V` / Context Menu)**:
  * Available when right-clicking a directory, an item within a directory (pastes to parent), or the pane root background.
  * Shows dynamic counter badge (e.g. `Paste (2 items)`).
  * Executes non-destructive copy (`copyItems`) or atomic move (`moveItems`) via VS Code workspace file system IPC.
* **Cancel Cut (`Escape`)**:
  * Clears cut state and restores full node opacity immediately.

### 3.7 Copy Selected Content (Multi-Panel & Native Explorer)

* **Multi-Panel Webview (`Alt+C` / Right-Click Context Menu)**:
  * Single file: Copies raw text contents directly to system clipboard.
  * Multi-file: Copies formatted bundle with markdown/comment separators:
    ```
    // === File: filename.ts (/full/path/to/filename.ts) ===
    ...file content...
    ```
* **Native Explorer Menu (`explorer/context`)**:
  * Contributed under command `multipleTreePane.copySelectedContent` (group `7_modification@1`).
  * Right-clicking any file in VS Code's native file explorer allows instant content copying without opening editor tabs.

### 3.8 Interactive Git Badge & Source Control Focus

* Each tree pane subheader dynamically renders a `[GIT]` badge when inside a detected Git repository.
* Clicking `[GIT]` executes `workbench.view.scm` and directs the native VS Code Git extension to select and focus that repository, providing seamless access to staged changes, commits, and branches.

### 3.9 Terminal Drag-and-Drop & Context Actions

* **Universal Drag-and-Drop to Terminals**:
  * Dragging any tree node (file or directory) or pane title (`.pane-title`) exports native paths to VS Code Integrated Terminal, Windows Terminal, PowerShell, CMD, Git Bash, WezTerm, etc.
  * Windows paths automatically normalize to native backslashes (`\`) and wrap in double quotes (`"..."`) when paths contain spaces or shell metacharacters (`&`, `(`, `)`, `^`, `%`, `$`, `#`, `!`, `;`).
  * Multi-selected items are joined by a space (`"path1" "path2"`) instead of newlines, preventing premature command execution (Enter) in terminal prompts.
  * Also populates standard RFC-compliant `text/uri-list` and VS Code workbench `resourceurls` (`application/vnd.code.tree.resourceUrls`) for seamless drop into editor tabs and native explorer.
* **Terminal Context Menu Actions**:
  * `Open in Integrated Terminal`: Spawns or focuses an integrated terminal with `cwd` set to the selected folder or pane root.
  * `Send Path to Terminal`: Focuses the active VS Code terminal and types the formatted path string without pressing Enter, ready for CLI command prefixing (`cd `, `cat `, `git add `).
  * `Copy Path for Terminal`: Copies the terminal-quoted path directly to system clipboard.

### 3.10 Live File System Watcher & Direct File/Folder Creation

* **Reactive File System Watcher Subsystem (`PaneWatcherManager`)**:
  * Dynamically registers `vscode.workspace.createFileSystemWatcher` for each active pane root directory.
  * Automatically detects `onDidCreate`, `onDidDelete`, and `onDidChange` file events triggered from external terminals, scripts, git commands, or other VS Code tabs.
  * Filters out noise patterns (`node_modules`, `.git`, `out`, `dist`, `*.tmp`, `*.bak`).
  * Coalesces high-frequency file event bursts through a trailing-edge debounce buffer (150ms) to prevent UI lag.
* **Non-Destructive Live Tree Updates**:
  * Refreshes the target directory tree without collapsing expanded folders (`node.isExpanded` preserved recursively).
  * Retains current scroll offset (`scrollTop`) and active selection focus.
* **Direct File & Folder Creation**:
  * Context menu options **"New File..."** and **"New Folder..."** on both tree nodes and pane canvas backgrounds.
  * Prompts for filename/folder name via `showInputBox`, validates against illegal path traversal characters, and automatically opens newly created files in editor.

### 3.11 Pointer Capture Gutter Resizing & Anti-Stuck Cursor Failsafe

* **Hardware Pointer Capture (`setPointerCapture`)**:
  * Splitter gutter resizing (`setupResizer`) migrates from legacy `mousedown` to W3C `pointerdown` with `resizerEl.setPointerCapture(e.pointerId)`.
  * Pointer coordinates remain bound to the gutter even when dragging rapidly across pane boundaries or into other VS Code editor panes.
  * Releases cleanly on `pointerup`, `pointercancel`, or `lostpointercapture`.
* **Universal Interaction Failsafe Engine (`cleanupInteractionStates`)**:
  * Unconditionally purges `is-resizing`, `is-resizing-v`, and `is-tree-dragging` classes from `document.body`.
  * Removes `.active` from all resizers and `.dragging` from all tree elements.
* **Triple-Tier Escape Hatches & Watchdog**:
  * **Window Blur**: Recovers instantly when user clicks outside the webview iframe.
  * **Document Mouse Leave**: Automatically cancels resizing if pointer exits webview boundary.
  * **Escape Key**: Pressing `Escape` resets all cursor locks and closes context menus.
  * **3.5s Watchdog**: Emergency timer auto-restores default cursor if no movement occurs during resize.

---

## 4. Development & Packaging Workflow (out/dist vs out/vsix)

### Output Directory Architecture
The build system strictly segregates compiled code from distribution packages inside `out/`:
```text
out/
├── dist/                                     # TypeScript compiler output (tsc)
│   ├── extension.js & extension.js.map
│   ├── FileSystemService.js & .map
│   ├── TreePanelManager.js & .map
│   ├── TreeSidebarProvider.js & .map
│   ├── WebviewUtils.js & .map
│   └── types.js & .map
└── vsix/                                     # Packaged release archives
    ├── multiple-treepane-v01-01-02.vsix
    ├── multiple-treepane-v01.01.02.vsix
    └── ... (historical archives)
```

### Prerequisites
* Node.js v18.0+
* npm or pnpm
* VS Code 1.80+ or Google Antigravity IDE

### Setup & Compilation
```bash
# 1. Install devDependencies
npm install

# 2. Compile TypeScript into out/dist/
npm run compile

# 3. Watch mode during development
npm run watch
```

### Packaging Production VSIX (Octates Naming)
```bash
# Package extension without external dependencies (generates dash and dot octates format in out/vsix/)
npm run package
```
*Output artifacts:*
- `./out/vsix/multiple-treepane-v01-01-05.vsix`
- `./out/vsix/multiple-treepane-v01.01.05.vsix`

### Automated Lifecycle Version Bumps
```bash
# Patch bump: 1.1.5 -> 1.1.6 (v01-01-06)
npm run bump:patch

# Minor bump: 1.1.5 -> 1.2.0 (v01-02-00)
npm run bump:minor

# Major bump: 1.1.5 -> 2.0.0 (v02-00-00)
npm run bump:major
```

### Installation
```bash
# In VS Code:
code --install-extension ./out/vsix/multiple-treepane-v01-01-05.vsix

# In Google Antigravity IDE:
antigravity --install-extension ./out/vsix/multiple-treepane-v01-01-05.vsix
```

---

## 5. Troubleshooting & Root Cause Matrix

| Symptom / Failure Mode | Root Cause | Prevention & Resolution |
| :--- | :--- | :--- |
| **Mouse cursor stuck on col-resize/row-resize or panel becomes unresponsive** | Legacy mousedown resizing lost mouseup event when released outside iframe boundary, leaving body.is-resizing active. | Migrated to W3C Pointer Events API with setPointerCapture, window.onblur and document.onmouseleave escape hatches, Escape key handler, and 3.5s watchdog timer. |
| **File creations, deletions, or external changes not detected in tree pane** | Extension host previously had zero `vscode.FileSystemWatcher` registrations, leaving webview state blind to disk events until manual refresh. | Integrated `PaneWatcherManager` registering per-root `vscode.workspace.createFileSystemWatcher` with 150ms trailing debounce and non-destructive expansion-preserving DOM patching. |
| **Horizontal panes collapse vertically or shrink to file count in canvas** | CSS flex container children defaulted to `align-items: flex-start` or inherited leftover vertical inline height styles. | Enforced `align-items: stretch !important`, `height: 100% !important`, and `box-sizing: border-box` on `.panes-container.layout-horizontal` and `.tree-pane` in `media/main.css`. In `media/main.js`, layout switcher strips stale inline heights. |
| **Cut nodes stay dimmed if paste is aborted** | Missing cancellation hook for pending cut operations in UI. | Added `Escape` key event listener and right-click backdrop dismiss that resets `fileClipboard` state and invokes `clearCutVisuals()`. |
| **VSIX packages recursively include existing .vsix files** | Root `out/` folder contained both `.js` and previous `.vsix` packages, which vsce bundled. | Split `out/` into `out/dist/` and `out/vsix/`. Added `out/vsix/**` to `.vscodeignore` and `.gitignore`. |
| **Git badge click opens wrong repository in multi-root workspace** | Standard `workbench.view.scm` command only toggles sidebar without repository targeting. | `FileSystemService.ts` interfaces with `vscode.extensions.getExtension('vscode.git')` API to look up and focus the exact repository URI. |
| **Tree content overflows outside webview boundary** | Missing `min-height: 0` or flex shrink constraint on scroll container. | Configured `.tree-content { flex: 1 1 auto; min-height: 0; overflow-y: auto; }` and `.treepane-viewport { height: calc(100vh - var(--header-height)); }`. |
| **Invalid Regex freezes search filtering** | User typed incomplete regex pattern (e.g. `[` or `(`). | Wrapped `new RegExp(query)` inside `try / catch` in `media/main.js`. Invalid patterns add `.has-error` class with red border without interrupting DOM. |
| **Slow expansion in large workspace directories** | Eagerly scanning deep directory trees synchronously blocks extension host IPC. | `FileSystemService.ts` implements non-blocking shallow scans; subdirectories are fetched on-demand when the user clicks the expand chevron. |
| **Webview blank screen on reload** | Content Security Policy (CSP) blocking local scripts or styles. | `WebviewUtils.ts` generates secure random nonces (`getNonce()`) and references webview URIs via `webview.asWebviewUri()`. |

---

## 📄 License

MIT © All Lads Tool Contributors
