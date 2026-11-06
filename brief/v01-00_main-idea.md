---
title: Multiple TreePane - Main Idea & Multi-Repo Concurrency
version: v01-00
status: canonical
dependencies:
	- "[[modular-architecture-standard]]"
	- "[[zero-hardcoded-variables]]"
	- "[[asci-tree-codeblock-standard]]"
	- "[[cross-os-zero-localhost]]"
---

# Multiple TreePane — Multi-Repo Concurrent Explorer (`v01-00_main-idea`)

> **Version**: `v01-00` (Foundational Vision & Dual-Mode Split Specification)  
> **Target Environment**: VS Code 1.80+ & Google Antigravity IDE  
> **Baseline References**:  
> - [`e:/proj/all-lads-tool/brief/v01-04_multi-column-tree-explorer.md`](file:///e:/proj/all-lads-tool/brief/v01-04_multi-column-tree-explorer.md)  
> - [`e:/proj/all-lads-tool/skill/briefing-0x-0x-version.md`](file:///e:/proj/all-lads-tool/skill/briefing-0x-0x-version.md)  
> - [`e:/proj/all-lads-tool/skill/asci-tree-codeblock-standard.md`](file:///e:/proj/all-lads-tool/skill/asci-tree-codeblock-standard.md)  
> **Primary Objectives**:  
> 1. Single-window multi-repository concurrent tree browser (supporting 2 to 5+ simultaneous tree panes).  
> 2. Adaptive Dual-Mode Split: Automatic **Vertical Split** in narrow Sidepanel / Sidebar, and **Horizontal Split (`T | T | T | T | T`)** in wide Editor Area.  
> 3. Zero-loss state navigation with independent search filtering, branch collapse/expansion, and single-click file opening.  
> 4. 100% native compatibility with both Microsoft Visual Studio Code and Google Antigravity IDE.  

---

## 📑 DAFTAR ISI (TABLE OF CONTENTS)

1. [Architectural Directives & Invariants](#1-architectural-directives--invariants)
2. [Directory Topology & Boundaries](#2-directory-topology--boundaries)
3. [Data Models & IPC Communication Engine](#3-data-models--ipc-communication-engine)
4. [UI/UX Monospace Text Wireframes](#4-uiux-monospace-text-wireframes)
   - [4.1 Horizontal Split (Editor Tab Full-Width Mode: `T | T | T | T | T`)](#41-horizontal-split-editor-tab-full-width-mode-t--t--t--t--t)
   - [4.2 Vertical Split (Sidepanel / Sidebar Mode: `T / T / T / T / T`)](#42-vertical-split-sidepanel--sidebar-mode-t--t--t--t--t)
5. [Subsystem Deep-Dives](#5-subsystem-deep-dives)
   - [5.1 Dual-Host Registration (WebviewViewProvider vs WebviewPanel)](#51-dual-host-registration-webviewviewprovider-vs-webviewpanel)
   - [5.2 Dynamic Multi-Repo Auto-Discovery](#52-dynamic-multi-repo-auto-discovery)
   - [5.3 Adaptive CSS Grid & ResizeObserver Engine](#53-adaptive-css-grid--resizeobserver-engine)
6. [Unified Build Pipeline & Verification](#6-unified-build-pipeline--verification)

---

## 1. Architectural Directives & Invariants

- **INVARIANT 1: Dual-Host Adaptivity**:
  The extension MUST support two host modes from a single shared webview codebase:
  1. *Sidepanel View (`WebviewViewProvider`)*: Automatically defaults to **Vertical Split** (stacked panes) to prevent horizontal overflow in narrow sidebars (250px - 400px).
  2. *Editor Tab View (`WebviewPanel`)*: Automatically defaults to **Horizontal Split** (`T | T | T | T | T` side-by-side columns) across wide desktop screens.
- **INVARIANT 2: Manual Override Priority**:
  While container orientation defaults automatically based on viewport aspect ratio, a toolbar toggle button (`[⬍ Vertical / ⬈ Horizontal]`) allows instant manual override at any time.
- **INVARIANT 3: Zero Hardcoded Paths (Rule #001)**:
  Target repository and directory paths must be dynamically queried from `vscode.workspace.workspaceFolders` and the filesystem via `vscode.workspace.fs`. Never hardcode drive letters (`C:`, `E:`) or usernames.
- **INVARIANT 4: Non-Blocking Lazy Directory Expansion**:
  Tree directories must only fetch child entries when expanded by the user to avoid performance freezing when opening huge parent directories.
- **INVARIANT 5: Strict ASCII Tree Codeblock Standard (Rule #006)**:
  All architectural file tree representations in markdown documents must use tab-indented source lines without hardcoded branch glyphs, and `#` annotations must align to `longest_line + 1 space`.

---

## 2. Directory Topology & Boundaries

```text
vscode-exstension_multiple-treepane     # Root extension project
	brief                               # Architectural contracts & specification
		v01-00_main-idea.md             # Core concept & UI/UX wireframes
		v01-01_structure-and-tecnical.md# Technical subsystem architecture
	src                                 # TypeScript source code
		extension.ts                    # Extension activation entrypoint
		TreePanelManager.ts             # WebviewPanel controller (Editor Tab)
		TreeSidebarProvider.ts          # WebviewViewProvider controller (Sidepanel)
		FileSystemService.ts            # Recursive filesystem scanner & git resolver
		types.ts                        # Shared interfaces & IPC message schemas
	media                               # Client-side webview distribution
		main.css                        # Responsive dual-mode stylesheet (Vertical & Horizontal)
		main.js                         # Tree renderer, DOM manager, search & IPC client
		icons                           # Vector icons for folders, files, and actions
	package.json                        # VS Code extension manifest & contributions
	tsconfig.json                       # TypeScript compiler configuration
	README.md                           # Developer & user documentation
```

---

## 3. Data Models & IPC Communication Engine

The extension employs a strictly typed bidirectional message protocol between the Node.js Extension Host and the Webview DOM:

### 3.1 Webview To Extension Host Messages (`WebviewMessage`)
```typescript
type WebviewMessage =
  | { command: 'ready' }
  | { command: 'openFile'; filePath: string }
  | { command: 'requestFolderTree'; paneId: string; folderPath: string }
  | { command: 'browseFolder'; paneId: string }
  | { command: 'savePanesState'; panes: PaneConfig[]; layout: 'horizontal' | 'vertical' };
```

### 3.2 Extension Host To Webview Messages (`HostMessage`)
```typescript
type HostMessage =
  | { command: 'init'; panes: PaneConfig[]; availableRepos: RepoInfo[]; defaultLayout: 'horizontal' | 'vertical' }
  | { command: 'folderTreeData'; paneId: string; tree: TreeNode }
  | { command: 'paneFolderUpdated'; paneId: string; newPath: string; tree: TreeNode };
```

---

## 4. UI/UX Monospace Text Wireframes

### 4.1 Horizontal Split (Editor Tab Full-Width Mode: `T | T | T | T | T`)

When opened in an editor tab via `View: Open Multi-Tree Explorer in Tab`, the layout expands horizontally:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [≡ MULTI-TREE EXPLORER]                 [⬍ Toggle Vertical/Horizontal] [ + Add Tree ] │
├────────────────┬────────────────┬────────────────┬────────────────┬───────────────────┤
│ PANE 1: repo/  │ PANE 2: skill/ │ PANE 3: file/  │ PANE 4: docs/  │ PANE 5: web-app/  │
│ [ 📁 Browse ]  │ [ 📁 Browse ]  │ [ 📁 Browse ]  │ [ 📁 Browse ]  │ [ 📁 Browse ]     │
│ [⌕ Filter...]  │ [⌕ Filter...]  │ [⌕ Filter...]  │ [⌕ Filter...]  │ [⌕ Filter...]     │
├────────────────┼────────────────┼────────────────┼────────────────┼───────────────────┤
│ ⌵ script/repo  │ ⌵ skill/       │ ⌵ script/file  │ ⌵ docs/        │ ⌵ web-app/        │
│   > adapter/   │   📄 rules.md  │   > adapter/   │   > repo/      │   > src/          │
│   📄 git-mng   │   📄 asci.md   │   📄 dry-rn.ps1│   > file/      │   📄 app.ts       │
│   📄 branch.ps1│   📄 commit.md │   📄 rename.ps1│   📄 guide.md  │   📄 index.html   │
│                │                │                │                │                   │
│ (Scroll Pos A) │ (Scroll Pos B) │ (Scroll Pos C) │ (Scroll Pos D) │ (Scroll Pos E)    │
└────────────────┴────────────────┴────────────────┴────────────────┴───────────────────┘
```

### 4.2 Vertical Split (Sidepanel / Sidebar Mode: `T / T / T / T / T`)

When docked in the narrow left or right sidebar (Sidepanel), the panes stack vertically with independent collapsible headers to conserve width:

```text
┌──────────────────────────────────────┐
│ MULTI-TREE (SIDEPANEL)  [⬈ Tab] [+] │
├──────────────────────────────────────┤
│ ⌵ PANE 1: repo/        [⌕] [📁] [×] │
├──────────────────────────────────────┤
│   > adapter/                         │
│   📄 git-manage.ps1                  │
│   📄 git-branch-rename.ps1           │
├──────────────────────────────────────┤
│ ⌵ PANE 2: skill/       [⌕] [📁] [×] │
├──────────────────────────────────────┤
│   📄 asci-tree-standard.md           │
│   📄 briefing-standard.md            │
├──────────────────────────────────────┤
│ ⌵ PANE 3: file/        [⌕] [📁] [×] │
├──────────────────────────────────────┤
│   > adapter/                         │
│   📄 batch-target-dir-rename.ps1     │
├──────────────────────────────────────┤
│ ⌵ PANE 4: quartz/      [⌕] [📁] [×] │
├──────────────────────────────────────┤
│   > content/                         │
│   📄 quartz.config.ts                │
└──────────────────────────────────────┘
```

---

## 5. Subsystem Deep-Dives

### 5.1 Dual-Host Registration (WebviewViewProvider vs WebviewPanel)
- The extension registers an `activitybar` view via `vscode.window.registerWebviewViewProvider('multiTreeExplorer.sidebarView', provider)`.
- Simultaneously, it registers a command `multiTreeExplorer.openEditorTab` that invokes `vscode.window.createWebviewPanel('multiTreeExplorer.editorTab', ...)`.
- Both controllers inject the same HTML/JS bundle with a runtime context parameter (`mode: 'sidebar' | 'editor'`).

### 5.2 Dynamic Multi-Repo Auto-Discovery
- Upon initialization, the host inspects `vscode.workspace.workspaceFolders`.
- It executes a rapid 2-level directory check (`Test-Path .git`) across all workspace subfolders.
- Every detected Git repo or top-level project directory is provided in a quick-selection dropdown at the top of each pane.

### 5.3 Adaptive CSS Grid & ResizeObserver Engine
- The webview container attaches a native `ResizeObserver`.
- If container width is `< 550px`, the DOM auto-applies class `.split-vertical`.
- If container width is `≥ 550px`, the DOM auto-applies class `.split-horizontal`.
- The user's manual toggle button temporarily locks the chosen mode, overriding auto-detection until toggled again.

---

## 6. Unified Build Pipeline & Verification

1. Install dependencies:
   ```bash
   npm install
   ```
2. Compile TypeScript extension:
   ```bash
   npm run compile
   ```
3. Test in Extension Development Host:
   - Press `F5` in VS Code / Antigravity IDE.
   - Run command: `Multi-Tree: Open Sidepanel View` or `Multi-Tree: Open in Editor Tab`.
