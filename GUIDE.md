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
4. [Development & Packaging Workflow](#4-development--packaging-workflow)
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

The extension exposes 3 primary commands contributed in `package.json`:

| Command Identifier | Title in Command Palette | Default Context Menu / View Action | Action |
| :--- | :--- | :--- | :--- |
| `multipleTreePane.openEditorTab` | `Multiple TreePane: Open in Full-Width Editor Tab` | Title navigation button (`layout-sidebar-right`) | Spawns or focuses the multi-tree cockpit in a full-width Editor Tab. |
| `multipleTreePane.refresh` | `Multiple TreePane: Refresh All Trees` | Title navigation button (`refresh`) | Triggers recursive workspace scanning and repopulates all panes. |
| `multipleTreePane.addPane` | `Multiple TreePane: Add Directory Tree Pane` | Title navigation button (`add`) | Appends an additional independent directory pane to the view. |

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

---

## 4. Development & Packaging Workflow

### Prerequisites
* Node.js v18.0+
* npm or pnpm
* VS Code 1.80+ or Google Antigravity IDE

### Setup & Compilation
```bash
# 1. Install devDependencies
npm install

# 2. Compile TypeScript
npm run compile

# 3. Watch mode during development
npm run watch
```

### Packaging Production VSIX
```bash
# Package extension without external dependencies
npm run package
```
*Output artifact:* `./out/multiple-treepane-1.1.1.vsix`

### Installation
```bash
# In VS Code:
code --install-extension ./out/multiple-treepane-1.1.1.vsix

# In Google Antigravity IDE:
antigravity --install-extension ./out/multiple-treepane-1.1.1.vsix
```

---

## 5. Troubleshooting & Root Cause Matrix

| Symptom / Failure Mode | Root Cause | Prevention & Resolution |
| :--- | :--- | :--- |
| **Horizontal panes collapse vertically or scroll awkwardly in editor tab** | CSS flex container children defaulted to `align-items: flex-start` or lacked explicit height stretching. | Enforced `align-items: stretch !important`, `height: 100% !important`, and `box-sizing: border-box` on `.panes-container.layout-horizontal` and `.tree-pane` in `media/main.css`. |
| **Tree content overflows outside webview boundary** | Missing `min-height: 0` or flex shrink constraint on scroll container. | Configured `.tree-content { flex: 1 1 auto; min-height: 0; overflow-y: auto; }` and `.treepane-viewport { height: calc(100vh - var(--header-height)); }`. |
| **Invalid Regex freezes search filtering** | User typed incomplete regex pattern (e.g. `[` or `(`). | Wrapped `new RegExp(query)` inside `try / catch` in `media/main.js`. Invalid patterns add `.has-error` class with red border without interrupting DOM. |
| **Slow expansion in large workspace directories** | Eagerly scanning deep directory trees synchronously blocks extension host IPC. | `FileSystemService.ts` implements non-blocking shallow scans; subdirectories are fetched on-demand when the user clicks the expand chevron. |
| **Webview blank screen on reload** | Content Security Policy (CSP) blocking local scripts or styles. | `WebviewUtils.ts` generates secure random nonces (`getNonce()`) and references webview URIs via `webview.asWebviewUri()`. |

---

## 📄 License

MIT © All Lads Tool Contributors
