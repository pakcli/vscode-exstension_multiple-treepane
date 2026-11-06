---
title: Multiple TreePane - Complete Native Explorer UI/UX Parity with Additional Right-Click Mechanics
version: v01-01-06
status: draft-quarantine
dependencies:
  - "[[modular-architecture-standard]]"
  - "[[zero-hardcoded-variables]]"
  - "[[asci-tree-codeblock-standard]]"
  - "[[cross-os-zero-localhost]]"
  - "[[uiux-wireframe-via-text-ascii-codeblock]]"
  - "[[donot-code-yet]]"
  - "[[donot-commit-yet]]"
---

# Multiple TreePane — Complete Native Explorer UI/UX Parity & Enhanced Right-Click Mechanics (`v01-01-06`)

> **Version**: `v01-01-06` (100% Native VS Code Explorer Fidelity, Comprehensive Context Menu Parity, Inline Renaming, File Compare, Git Status Badges & Enhanced Power Tools)  
> **Target Brief Filename**: `brief/v01-01-06_complete-all-same-native-explorer-uiux-with-addition-rightclick.md`  
> **Status**: **PRE-CODING QUARANTINE (`donot-code-yet`)** — Architectural Plan & Specification awaiting user review and greenlight before code modifications.  
> **Baseline References**:  
> - [`brief/v01-00_main-idea.md`](./v01-00_main-idea.md)  
> - [`brief/v01-01_structure-and-tecnical.md`](./v01-01_structure-and-tecnical.md)  
> - [`brief/v01-01-02-version-control-naming.md`](./v01-01-02-version-control-naming.md)  
> - [`brief/v01-01-03_update-able-to-dragndrop-to-terminal.md`](./v01-01-03_update-able-to-dragndrop-to-terminal.md)  
> - [`brief/v01-01-04_fix-not-detecting-changes-file-state-creation.md`](./v01-01-04_fix-not-detecting-changes-file-state-creation.md)  
> - [`brief/v01-01-05_fix-stuck-uninteractable-panel-cursor-stuck.md`](./v01-01-05_fix-stuck-uninteractable-panel-cursor-stuck.md)  
> - [`../all-lads-tool/skill/briefing-0x-0x-version.md`](../all-lads-tool/skill/briefing-0x-0x-version.md)  
> - [`../all-lads-tool/skill/donot-code-yet.md`](../all-lads-tool/skill/donot-code-yet.md)  
>
> **Primary Objective**:  
> Elevate Multiple TreePane from a standard multi-column viewer into a **pixel-perfect, 100% feature-complete replacement for the native VS Code Explorer** inside every pane, augmented with high-productivity power-tools in the right-click context menu:
> 1. **Complete Native Action Parity**: "Open to the Side" (`Ctrl+Enter`), "Select for Compare" + "Compare with Selected", "Find in Folder...", "Delete (Move to Trash)", and native keyboard navigation (Arrow keys, Enter, F2, Delete).
> 2. **Enhanced Right-Click Power Mechanics**: "Duplicate File/Folder", "Copy Selected Content" (`Alt+C`), "Move to Repo...", "Copy Terminal Path", "Open in Integrated Terminal", and "Send to Terminal".
> 3. **Native Explorer Visual Parity**: Indentation guidelines, Git file status color decorations (Modified `M`, Untracked `U`, Added `A`, Deleted `D`), ignored file dimming, and inline renaming inputs directly inside the tree hierarchy.

---

## 📑 DAFTAR ISI (TABLE OF CONTENTS)

1. [Architectural Directives & Invariants](#1-architectural-directives--invariants)
2. [Native Explorer Feature Parity Matrix](#2-native-explorer-feature-parity-matrix)
3. [Directory Topology & File Manifest Plan](#3-directory-topology--file-manifest-plan)
4. [Context Menu Structure: Complete Native + Enhanced Power Actions](#4-context-menu-structure-complete-native--enhanced-power-actions)
   - [4.1 Node Context Menu (File & Folder)](#41-node-context-menu-file--folder)
   - [4.2 Pane Canvas Background Context Menu](#42-pane-canvas-background-context-menu)
5. [Data Models & IPC Communication Contracts](#5-data-models--ipc-communication-contracts)
6. [UI/UX Monospace Wireframes](#6-uiux-monospace-wireframes)
   - [6.1 Full Native Explorer Parity Layout with Git Badges (Desktop)](#61-full-native-explorer-parity-layout-with-git-badges-desktop)
   - [6.2 Comprehensive Right-Click Context Menu (ASCII Layout)](#62-comprehensive-right-click-context-menu-ascii-layout)
   - [6.3 Inline Rename & Create Element](#63-inline-rename--create-element)
7. [Subsystem Implementation Deep-Dives](#7-subsystem-implementation-deep-dives)
   - [7.1 Native Action Dispatcher: Compare, Open to Side & Search in Folder](#71-native-action-dispatcher-compare-open-to-side--search-in-folder)
   - [7.2 Native Keyboard Navigation Engine](#72-native-keyboard-navigation-engine)
   - [7.3 Git File Status Scanner & Tree Node Badging](#73-git-file-status-scanner--tree-node-badging)
   - [7.4 Native Safe Delete Engine (`useTrash: true`)](#74-native-safe-delete-engine-usetrash-true)
   - [7.5 Inline Tree Node Input Overlay](#75-inline-tree-node-input-overlay)
8. [Unified Build Pipeline & Verification Plan](#8-unified-build-pipeline--verification-plan)
9. [Pre-Coding Quarantine Protocol (`donot-code-yet`)](#9-pre-coding-quarantine-protocol-donot-code-yet)

---

## 1. Architectural Directives & Invariants

- **RULE #1: 100% Native VS Code Theme Parity**:
  All visual elements (selection backgrounds, hover states, menu borders, git status colors, indent guides) MUST strictly reference official VS Code CSS variables:
  - Active selection: `var(--vscode-list-activeSelectionBackground)` / `var(--vscode-list-activeSelectionForeground)`
  - Git colors: `var(--vscode-gitDecoration-modifiedResourceForeground)`, `var(--vscode-gitDecoration-untrackedResourceForeground)`, `var(--vscode-gitDecoration-deletedResourceForeground)`
  - Indent guides: `var(--vscode-tree-indentGuidesStroke)`
- **RULE #2: Safe Trash Deletion (Zero Hard Deletion by Default)**:
  Deleting files or directories from the UI MUST invoke `vscode.workspace.fs.delete(uri, { useTrash: true, recursive: true })` to safeguard against accidental permanent data loss. Hard deletion without recycle bin is strictly forbidden.
- **RULE #3: Native VS Code Command Integration**:
  Never re-invent standard editor capabilities (such as file diffing or global search). Delegate directly to official VS Code core commands:
  - File diff: `vscode.commands.executeCommand('vscode.diff', uriA, uriB, title)`
  - Open to side: `vscode.commands.executeCommand('vscode.open', uri, { viewColumn: vscode.ViewColumn.Beside })`
  - Find in folder: `vscode.commands.executeCommand('workbench.action.findInFiles', { query: '', filesToInclude: folderGlob })`
- **RULE #4: Zero Code Mutation Without Sovereign Approval (`donot-code-yet`)**:
  All codebase files remain in quarantine until this plan is formally reviewed and explicitly greenlit by the human developer.

---

## 2. Native Explorer Feature Parity Matrix

| Feature / Action | VS Code Native Explorer | Multiple TreePane (`v01-01-04`) | Proposed (`v01-01-05`) | Implementation Path |
| :--- | :---: | :---: | :---: | :--- |
| **Open to Side (`Ctrl+Enter`)** | Yes | No | **Yes** | `vscode.commands.executeCommand('vscode.open', uri, { viewColumn: ViewColumn.Beside })` |
| **Select for Compare** | Yes | No | **Yes** | Webview state `compareSourcePath` saved in memory |
| **Compare with Selected** | Yes | No | **Yes** | `vscode.commands.executeCommand('vscode.diff', uri1, uri2, 'A <-> B')` |
| **Find in Folder...** | Yes | No | **Yes** | `workbench.action.findInFiles` with scoped glob filter |
| **Delete to Trash (`Delete`)** | Yes | No | **Yes** | `vscode.workspace.fs.delete(uri, { useTrash: true })` |
| **Duplicate File/Folder** | Ext/Alt | No | **Yes** | Auto-copies item appending `_copy` or `_copy_TIMESTAMP` |
| **Inline Renaming (`F2`)** | Yes | Modal Prompt Only | **Yes** | Inline DOM `<input>` element with auto text selection |
| **Keyboard Navigation (Arrows)**| Yes | No | **Yes** | ArrowUp/Down (focus), ArrowRight (expand), ArrowLeft (collapse) |
| **Git Status Badges (`M`, `U`, `A`)**| Yes | Header Repo Only | **Yes** | Per-file status badge & color decoration on tree labels |
| **Indentation Guides** | Yes | Partial | **Yes** | CSS vertical guideline borders matching `tree.indent` |
| **Copy Selected Content (`Alt+C`)**| No | Yes | **Yes** (Retained) | Multi-file text extraction to clipboard |
| **Move to Repo...** | No | Yes | **Yes** (Retained) | Cross-repository migration helper |
| **Terminal Drag-and-Drop** | Partial | Yes | **Yes** (Retained) | Native Windows quoting & space-separated paths |

---

## 3. Directory Topology & File Manifest Plan

The planned implementation maintains modular separation across backend services, IPC handlers, and webview presentation:

```text
vscode-exstension_multiple-treepane/
├── brief/
│   ├── v01-01-04_fix-not-detecting-changes-file-state-creation.md
│   └── v01-01-05_complete-all-same-native-explorer-uiux-with-addition-rightclick.md  # THIS SSOT
├── media/
│   ├── main.css                   # Indent guides, git status badges, inline rename styles
│   └── main.js                    # Keyboard navigation, compare state, inline inputs, context menus
├── src/
│   ├── extension.ts               # Core registrations & compare status bar
│   ├── FileSystemService.ts       # Trash deletion, compare diff launcher, duplicate logic
│   ├── GitStatusService.ts        # NEW: Scans git status per root for file-level badges
│   ├── PaneWatcherManager.ts      # Multi-root file watcher (v01-01-04)
│   ├── TreePanelManager.ts        # Editor tab webview coordinator
│   ├── TreeSidebarProvider.ts     # Sidebar webview provider
│   ├── types.ts                   # Updated Inbound/Outbound message types
│   └── WebviewUtils.ts            # Expanded IPC message dispatcher
├── package.json                   # Milestone target SemVer: 1.1.5 (v01-01-05)
└── scripts/
    ├── bump-version.js            # Automated octates bump engine
    └── package-vsix.js            # VSIX packaging pipeline
```

---

## 4. Context Menu Structure: Complete Native + Enhanced Power Actions

### 4.1 Node Context Menu (File & Folder)

```text
+--------------------------------------------------------------+
| [FILE / FOLDER CONTEXT MENU]                                 |
+--------------------------------------------------------------+
| [+] New File...                                              |
| [F] New Folder...                                            |
|--------------------------------------------------------------|
| [>] Open File                                  (Enter)       |
| [|] Open to the Side                           (Ctrl+Enter)  |
| [~] Reveal in File Explorer                                  |
| [>] Open in Integrated Terminal                              |
|--------------------------------------------------------------|
| [⇋] Select for Compare                                       |
| [⇄] Compare with Selected: 'App.vue'           (If active)   |
| [⌕] Find in Folder...                          (Folders only)|
|--------------------------------------------------------------|
| [X] Cut                                        (Ctrl+X)      |
| [C] Copy                                       (Ctrl+C)      |
| [D] Duplicate File/Folder                                    |
| [V] Paste                                      (Ctrl+V)      |
| [R] Rename...                                  (F2)          |
| [🗑] Delete (Move to Trash)                     (Delete)      |
|--------------------------------------------------------------|
| [C] Copy Selected Content                      (Alt+C)       |
| [P] Copy Path                                  (Shift+Alt+C) |
| [P] Copy Relative Path                         (Ctrl+K C)    |
| [T] Copy Path for Terminal                                   |
| [A] Copy Path Advance                                        |
| [>] Send Path to Terminal                                    |
| [M] Move to Repo...                                          |
+--------------------------------------------------------------+
```

### 4.2 Pane Canvas Background Context Menu

```text
+--------------------------------------------------------------+
| [PANE CANVAS BACKGROUND CONTEXT MENU]                        |
+--------------------------------------------------------------+
| [+] New File in Root...                                      |
| [F] New Folder in Root...                                    |
|--------------------------------------------------------------|
| [V] Paste into Root                            (Ctrl+V)      |
| [⌕] Find in Root Folder...                                   |
| [>] Open Root in Integrated Terminal                         |
| [~] Reveal Root in File Explorer                             |
|--------------------------------------------------------------|
| [P] Copy Root Path                                           |
| [T] Copy Root Path for Terminal                              |
| [A] Copy Root Path Advance                                   |
| [>] Send Root Path to Terminal                               |
| [↻] Refresh Tree                                             |
+--------------------------------------------------------------+
```

---

## 5. Data Models & IPC Communication Contracts

### 5.1 New Inbound Messages (Webview &rarr; Extension Host)

```typescript
// src/types.ts
export type InboundMessage =
  // ... previous messages ...
  | { command: 'openToSide'; filePath: string }
  | { command: 'setCompareSource'; filePath: string }
  | { command: 'compareFiles'; sourcePath: string; targetPath: string }
  | { command: 'findInFolder'; folderPath: string }
  | { command: 'deleteItem'; filePath: string; useTrash: boolean }
  | { command: 'duplicateItem'; sourcePath: string };
```

### 5.2 New Outbound Messages (Extension Host &rarr; Webview)

```typescript
export type OutboundMessage =
  // ... previous messages ...
  | { command: 'setCompareSourceState'; sourcePath?: string }
  | { command: 'gitStatusUpdated'; paneId: string; statusMap: Record<string, 'M' | 'U' | 'A' | 'D'> };
```

---

## 6. UI/UX Monospace Wireframes

### 6.1 Full Native Explorer Parity Layout with Git Badges (Desktop)

```text
+--------------------------------------------------------------------------------------------------+
| MULTIPLE TREEPANE EXPLORER                                                          [||] [+] [R] |
+--------------------------------------------------------------------------------------------------+
| ::: #1 proj/all-lads-tool  [GIT]           1st < > X | ::: #2 web_app_sport_club [GIT] 1st < > X |
| [ Filter files...                      Aa ab .* ]    | [ Filter files...             Aa ab .* ]  |
|------------------------------------------------------|-------------------------------------------|
| |  v brief                                           | |  v src                                  |
| |  |   v01-00_main-idea.md                           | |  |   App.vue                        [M] |
| |  |   v01-01-01_multi-column-tree-explorer.md       | |  |   main.ts                            |
| |  |   v01-01-04_fix-not-detecting-...md             | |  |   index.html                     [U] |
| |  | * v01-01-05_complete-all-same-native...md   [U] | |  package.json                       [M] |
| |  > combo                                           | |  README.md                              |
| |  v src                                             | |                                         |
| |  |   extension.ts                              [M] | |                                         |
| |  |   FileSystemService.ts                      [M] | |                                         |
| |  |   GitStatusService.ts                       [A] | |                                         |
| |  |   PaneWatcherManager.ts                         | |                                         |
| |  |   WebviewUtils.ts                           [M] | |                                         |
+--------------------------------------------------------------------------------------------------+
| Indentation Guides: VISIBLE | Compare: READY | Live Watcher: ACTIVE                              |
+--------------------------------------------------------------------------------------------------+
```

### 6.2 Inline Rename & Create Element

```text
| |  v src
| |  |   extension.ts
| |  |   [ input: PaneWatcherManager.ts                 ]  <-- Inline Input (Enter: save, Esc: cancel)
| |  |   FileSystemService.ts
```

---

## 7. Subsystem Implementation Deep-Dives

### 7.1 Native Action Dispatcher: Compare, Open to Side & Search in Folder

```typescript
// In FileSystemService.ts
public static async openToSide(filePath: string): Promise<void> {
  const uri = vscode.Uri.file(filePath);
  await vscode.commands.executeCommand('vscode.open', uri, {
    viewColumn: vscode.ViewColumn.Beside
  });
}

public static async compareWithSelected(sourcePath: string, targetPath: string): Promise<void> {
  const uriA = vscode.Uri.file(sourcePath);
  const uriB = vscode.Uri.file(targetPath);
  const nameA = path.basename(sourcePath);
  const nameB = path.basename(targetPath);
  await vscode.commands.executeCommand('vscode.diff', uriA, uriB, `${nameA} ↔ ${nameB}`);
}

public static async findInFolder(folderPath: string): Promise<void> {
  const norm = folderPath.replace(/\\/g, '/');
  await vscode.commands.executeCommand('workbench.action.findInFiles', {
    query: '',
    filesToInclude: `${norm}/**`
  });
}
```

### 7.2 Native Keyboard Navigation Engine

In `media/main.js`:
- Listen for `keydown` events when a tree node or tree container has focus:
  - `ArrowUp`: Focus and highlight the previous visible tree node.
  - `ArrowDown`: Focus and highlight the next visible tree node.
  - `ArrowRight`: If directory is collapsed &rarr; expand it; if already expanded &rarr; jump to first child.
  - `ArrowLeft`: If directory is expanded &rarr; collapse it; if collapsed or file &rarr; jump to parent directory.
  - `Enter`: Open file in editor (or toggle folder).
  - `F2`: Trigger inline rename input on the active node.
  - `Delete`: Prompt and invoke safe delete to trash.

### 7.3 Git File Status Scanner & Tree Node Badging

Create `src/GitStatusService.ts` using native Git CLI or VS Code Git extension API:
- Run shallow status checks: `git status --porcelain -uall` per pane root.
- Parse status codes:
  - `??` &rarr; `U` (Untracked, green color)
  - ` M` / `M ` &rarr; `M` (Modified, amber color)
  - ` A` / `A ` &rarr; `A` (Added, green color)
  - ` D` / `D ` &rarr; `D` (Deleted, red color)
- Dispatch `gitStatusUpdated` payload to webview.
- Render badge `<span class="git-status-badge status-${status}">${status}</span>` next to the node label.

### 7.4 Native Safe Delete Engine (`useTrash: true`)

```typescript
public static async deleteItem(targetPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!this.isPathSafe(targetPath)) {
      return { success: false, error: 'Security validation failed.' };
    }
    const uri = vscode.Uri.file(targetPath);
    const base = path.basename(targetPath);
    const confirmed = await vscode.window.showWarningMessage(
      `Are you sure you want to delete '${base}'?`,
      { modal: true },
      'Move to Trash'
    );

    if (confirmed !== 'Move to Trash') {
      return { success: false };
    }

    await vscode.workspace.fs.delete(uri, { useTrash: true, recursive: true });
    vscode.window.showInformationMessage(`Deleted to Trash: ${base}`);
    return { success: true };
  } catch (err: any) {
    vscode.window.showErrorMessage(`Delete failed: ${err.message || err}`);
    return { success: false, error: err.message || String(err) };
  }
}
```

### 7.5 Inline Tree Node Input Overlay

Instead of relying solely on VS Code top modal input boxes, an inline `<input class="tree-inline-input">` dynamically mounts inside the tree node row when `F2` or "Rename" is pressed:
- Automatically selects the filename without the file extension.
- Listens to `Enter` (commit rename) and `Escape` (cancel rename).
- Handles click outside / `blur` gracefully.

---

## 8. Unified Build Pipeline & Verification Plan

```powershell
# 1. Bump version to SemVer 1.1.5 (v01-01-05)
node scripts/bump-version.js patch

# 2. Strict TypeScript compilation
npm run compile

# 3. Package production VSIX bundle
node scripts/package-vsix.js

# 4. Verify output artifacts in out/vsix/
Get-ChildItem -Path "out/vsix" -Filter "*v01-01-05*"
```

---

## 9. Pre-Coding Quarantine Protocol (`donot-code-yet`)

Adhering strictly to [`e:/proj/all-lads-tool/skill/donot-code-yet.md`](../all-lads-tool/skill/donot-code-yet.md):

> [!CAUTION]
> **PRE-CODING QUARANTINE INVARIANT**:
> No codebase files (`src/`, `media/`, `package.json`) have been modified or generated for this milestone.
> This architectural brief defines the precise feature matrix, IPC contracts, and UX behavior.
> **All code implementation remains quarantined** until explicit user approval (`proceed`, `yes`, `code it now`) is received.
