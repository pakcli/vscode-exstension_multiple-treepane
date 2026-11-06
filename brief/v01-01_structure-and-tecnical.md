---
title: Multiple TreePane - Technical Architecture & Subsystem Specification
version: v01-01
status: canonical
dependencies:
	- "[[modular-architecture-standard]]"
	- "[[zero-hardcoded-variables]]"
	- "[[asci-tree-codeblock-standard]]"
	- "[[cross-os-zero-localhost]]"
	- "[[uiux-wireframe-via-text-ascii-codeblock]]"
---

# Multiple TreePane — Technical Architecture & Subsystem Specification (`v01-01_structure-and-tecnical`)

> **Version**: `v01-01` (Consolidated Technical Specification & Subsystem Engineering)  
> **Baseline References**:  
> - [`brief/v01-00_main-idea.md`](file:///e:/proj/vscode-exstension_multiple-treepane/brief/v01-00_main-idea.md)  
> - [`e:/proj/all-lads-tool/skill/briefing-0x-0x-version.md`](file:///e:/proj/all-lads-tool/skill/briefing-0x-0x-version.md)  
> - [`e:/proj/all-lads-tool/skill/uiux-wireframe-via-text-ascii-codeblock.md`](file:///e:/proj/all-lads-tool/skill/uiux-wireframe-via-text-ascii-codeblock.md)  
> - [`e:/proj/all-lads-tool/skill/asci-tree-codeblock-standard.md`](file:///e:/proj/all-lads-tool/skill/asci-tree-codeblock-standard.md)  
> **Primary Objectives**:  
> 1. Main Header Single-Row Architecture: 1-row cockpit featuring an alphabetical Repositories Popover Dropdown (`[ 📁 Repos (X/Y) ▾ ]`) with live show/hide toggles.  
> 2. View Mode Engine: Toggle between Split Mode (`[ ▦ Split ]`) for concurrent multi-tree browsing and Focus Mode (`[ ⬚ Focus ]`) which maximizes the latest active repository to 100% full view.  
> 3. Subheader Compaction: Standard 2-row default (Row 1: Identity & Reorder, Row 2: Native VS Code Find Box) expandable to 3 rows via chevron toggle (`[▶]`) to reveal root switching and browse tools.  
> 4. Native VS Code Find Widget Parity: Full regex (`.*`), word boundary (`ab`), and case sensitivity (`Aa`) with real-time error border feedback.  
> 5. Responsive Resizing & HTML5 Drag Reordering: Draggable splitter gutters (`.pane-resizer`) and `:::` grab handles.  

---

## DAFTAR ISI (TABLE OF CONTENTS)

1. [Architectural Directives & Invariants](#1-architectural-directives--invariants)
2. [Directory Topology & Boundaries](#2-directory-topology--boundaries)
3. [Data Models & State Machine](#3-data-models--state-machine)
4. [UI/UX Monospace Text Wireframes](#4-uiux-monospace-text-wireframes)
   - [4.1 Global Main Header (1 Row) & Repos Dropdown](#41-global-main-header-1-row--repos-dropdown)
   - [4.2 Split Mode: Multi-Tree Concurrent Grid](#42-split-mode-multi-tree-concurrent-grid)
   - [4.3 Focus Mode: 100% Full View of Latest Active Repo](#43-focus-mode-100-full-view-of-latest-active-repo)
   - [4.4 Subheader per Pane: 2-Row Default vs 3-Row Expanded](#44-subheader-per-pane-2-row-default-vs-3-row-expanded)
5. [Subsystem Deep-Dives](#5-subsystem-deep-dives)
   - [5.1 Main Header Repositories Popover Subsystem](#51-main-header-repositories-popover-subsystem)
   - [5.2 Split Mode vs Focus Mode Engine](#52-split-mode-vs-focus-mode-engine)
   - [5.3 Vanilla VS Code Search Widget Engine (`Aa`, `ab`, `.*`)](#53-vanilla-vs-code-search-widget-engine-aa-ab-)
   - [5.4 Drag-and-Drop Reordering Engine (`:::`)](#54-drag-and-drop-reordering-engine-)
   - [5.5 Expandable Splitter Gutter Engine (`.pane-resizer`)](#55-expandable-splitter-gutter-engine-paneresizer)
6. [Unified Build Pipeline & Verification](#6-unified-build-pipeline--verification)

---

## 1. Architectural Directives & Invariants

- **RULE #1: Strictly 1-Row Main Header**:
  The global master header MUST strictly occupy exactly 1 row. Multi-repository visibility management is delegated to a floating popover dropdown (`[ 📁 Repos (X/Y) ▾ ]`).
- **RULE #2: Split Mode vs Focus Mode Logic**:
  - **Split Mode** (`[ ▦ Split ]`): Displays all unhidden repositories concurrently side-by-side (editor tab) or stacked (sidebar).
  - **Focus Mode** (`[ ⬚ Focus ]`): Focuses exclusively on the latest active repository, hiding other panes and allocating 100% width/height. Toggling back restores the multi-tree configuration without loss of state.
- **RULE #3: Strictly 2-Row Default with Expandable 3rd Row**:
  Pane headers default to 2 rows (Row 1: Identity & Reorder, Row 2: Search). Clicking `[▶]` toggles Row 3 (`-- Switch Root --`, `[📁]`, `[↻]`).
- **RULE #4: Monospace Wireframe Compliance (`uiux-wireframe-via-text-ascii-codeblock`)**:
  All ASCII boxes MUST be closed rectangles with identical line character counts, `<= 80` columns width, and zero variable-width emojis inside bordered lines.
- **RULE #5: Native Theme & Zero Localhost**:
  Styles MUST use VS Code CSS variables (`var(--vscode-*)`). Communications strictly use Extension Host IPC (`postMessage`). Zero localhost servers.

---

## 2. Directory Topology & Boundaries

```text
vscode-exstension_multiple-treepane     # Root extension workspace
	brief                               # Architectural design records
		v01-00_main-idea.md             # Baseline concept and UX vision
		v01-01_structure-and-tecnical.md# Consolidated technical architecture
	media                               # Webview visual resources
		icons                           # Extension SVGs
			treepane.svg                # Activity bar icon
		main.css                        # 1-row header, 2-3 row subheader, find widget
		main.js                         # Webview DOM manager, search engine, focus engine
	src                                 # Extension Host TypeScript source
		extension.ts                    # Extension activator & commands
		FileSystemService.ts            # Fast workspace FS scanner
		TreePanelManager.ts             # WebviewPanel controller (Editor Tab)
		TreeSidebarProvider.ts          # WebviewViewProvider (Sidebar)
		types.ts                        # Shared TypeScript interfaces
		WebviewUtils.ts                 # Webview HTML template & IPC router
	.gitignore                          # Git exclude rules (node_modules, *.vsix)
	GUIDE.md                            # Comprehensive build & publishing guide
	package.json                        # VS Code extension manifest
	README.md                           # Public documentation
	tsconfig.json                       # TypeScript compiler options
```

---

## 3. Data Models & State Machine

### 3.1 Data Structures (`src/types.ts`)

```typescript
export interface SearchOptions {
  matchCase: boolean;       // Controlled by [Aa]
  matchWholeWord: boolean;  // Controlled by [ab]
  useRegex: boolean;        // Controlled by [.*]
}

export interface PaneConfig {
  id: string;
  name: string;
  rootPath: string;
  filterText: string;
  searchOptions: SearchOptions;
  isCollapsed: boolean;
  isHidden?: boolean;       // Toggled by Repos dropdown checkboxes
  size?: number;            // Pixel size allocation
}

export type ViewMode = 'split' | 'focus';
```

### 3.2 State Machine Transitions

```text
              [ Toggle View Mode ]
    ┌────────────────────────────────────────┐
    │                                        │
    ▼                                        ▼
┌─────────────────────────┐            ┌─────────────────────────┐
│       SPLIT MODE        │            │       FOCUS MODE        │
│ Multi-pane grid active  │            │ Latest active repo 100% │
│ [ ▦ Split ] shown       │            │ [ ⬚ Focus ] shown       │
│ Panes: [1] [2] [3]...   │            │ Panes: [Active Pane]    │
└─────────────────────────┘            └─────────────────────────┘
```

---

## 4. UI/UX Monospace Text Wireframes

### 4.1 Global Main Header (1 Row) & Repos Dropdown

```text
┌────────────────────────────────────────────────────────────────────────┐
│ MULTI-TREE   2 trees   [ 📁 Repos (2/8) ▾ ]  [ ⬚ Focus ]  [+ Add] [↻] [⚙]│
└────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼ (Floating Popover Menu)
                      ┌──────────────────────────────┐
                      │ [Git Repos (8)] [All Folders]│  <- Filter Toggle
                      ├──────────────────────────────┤
                      │ REPOSITORIES (A-Z)  [All][Non│
                      ├──────────────────────────────┤
                      │ [x] all-lads-tool      [GIT] │
                      │ [x] all-stupid-cases   [GIT] │
                      │ [ ] obsidian-plugin    [GIT] │
                      │ [ ] quartz             [GIT] │
                      └──────────────────────────────┘
```

### 4.2 Split Mode: Multi-Tree Concurrent Grid

```text
┌───────────────────────────────────┬─┬──────────────────────────────────┐
│ ::: #1: all-lads-tool  [1st][<][>]✕│ │ ::: #2: pakcli-plugin [1st][<][>]✕│
│ [▶] [ Filter files...  |Aa|ab|.*] │ │ [▼] [ Filter files... |Aa|ab|.*] │
│                                   │ │     [ 📁 Switch Root ▾ ] [📁] [↻] │
├───────────────────────────────────┤ ├──────────────────────────────────┤
│ v script/                         │ │ v src/                           │
│   > file/                         │ │   extension.ts                   │
│   git-manage.ps1                  │ │   types.ts                       │
└───────────────────────────────────┴─┴──────────────────────────────────┘
                                      ▲
                              Resizer Gutter (6px)
```

### 4.3 Focus Mode: 100% Full View of Latest Active Repo

```text
┌────────────────────────────────────────────────────────────────────────┐
│ ::: #1: all-lads-tool (FOCUSED)                       [1st] [<] [>]  ✕ │
│ [▶] [ Filter files...                             |  Aa  |  ab  |  .*  ]│
├────────────────────────────────────────────────────────────────────────┤
│ v script/                                                              │
│   > file/                                                              │
│   > repo/                                                              │
│   _mainmenu.ps1                                                        │
│ v skill/                                                               │
│   asci-tree.md                                                         │
│   commit-convention.md                                                 │
│ package.json                                                           │
│ README.md                                                              │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Subheader per Pane: 2-Row Default vs 3-Row Expanded

```text
Default 2-Row Subheader:
┌────────────────────────────────────────────────────────────────────────┐
│ ::: #1: all-lads-tool                                 [1st] [<] [>]  ✕ │
│ [▶] [ Filter files...                             |  Aa  |  ab  |  .*  ]│
└────────────────────────────────────────────────────────────────────────┘

Expanded 3-Row Subheader (Triggered via [▶]):
┌────────────────────────────────────────────────────────────────────────┐
│ ::: #1: all-lads-tool                                 [1st] [<] [>]  ✕ │
│ [▼] [ Filter files...                             |  Aa  |  ab  |  .*  ]│
│     [ 📁 Switch Root Dropdown ▾             ]        [📁 Browse] [↻]   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Subsystem Deep-Dives

### 5.1 Main Header Repositories Popover Subsystem
- Discovers all workspace repositories and folders on initialization.
- Shows live active count: `[ 📁 Repos (X/Y) ▾ ]`.
- Popover features:
  - Alphabetically sorted list (A-Z).
  - Toggling any checkbox immediately adds/shows or hides that pane.
  - Quick action buttons: `[All]` checks all repositories; `[None]` hides all.
  - Clicking outside automatically closes the popover.

### 5.2 Split Mode vs Focus Mode Engine
- State tracks `state.viewMode: 'split' | 'focus'` and `state.activePaneId`.
- **Active Pane Tracking**: Whenever a user interacts with a pane (clicks inside, filters files, expands a folder), that pane becomes `state.activePaneId`.
- **Focus Transition**:
  - In Focus Mode: Only `state.activePaneId` (or the first available visible pane) is rendered. It expands to 100% flex basis.
  - Button text reflects state: `[ ⬚ Focus ]` when in Split Mode, `[ ▦ Split ]` when in Focus Mode.
  - Switching back restores the full multi-pane layout immediately.

### 5.3 Vanilla VS Code Search Widget Engine (`Aa`, `ab`, `.*`)
- Replicates the exact visual styling and behavior of the native VS Code find widget:
  - `Aa` : Toggles case-sensitive string matching.
  - `ab` : Wraps query in word boundaries (`\b`).
  - `.*` : Evaluates query as a regular expression.
- When `useRegex` is active, invalid regex strings trigger `.has-error` (red border outline) without throwing uncaught exceptions.
- Search highlights matching substrings in real time and automatically expands ancestor folders.

### 5.4 Drag-and-Drop Reordering Engine (`:::`)
- Uses HTML5 Drag and Drop API on the grab handle `:::`.
- Splices `sourceIndex` and `targetIndex` in `state.panes` and triggers non-destructive DOM re-rendering.

### 5.5 Expandable Splitter Gutter Engine (`.pane-resizer`)
- Interleaved between adjacent visible panes.
- Supports resizing pane widths in horizontal layout and pane heights in vertical layout.
- Minimum size constraint of 120px prevents pane collapse accidents.

---

## 6. Unified Build Pipeline & Verification

1. Compile TypeScript:
   ```bash
   cd e:\proj\vscode-exstension_multiple-treepane
   npm run compile
   ```
2. Package into `.vsix`:
   ```bash
   npm run package
   ```
3. Test in Extension Development Host:
   - Press `F5` in VS Code / Antigravity IDE.
