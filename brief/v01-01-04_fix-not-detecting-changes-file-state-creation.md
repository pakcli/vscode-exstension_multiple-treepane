---
title: Multiple TreePane - Live File System Watcher & Reactive State Specification
version: v01-01-04
status: canonical
aliases:
  - "brief/v01-01-04_fix-not-detecting-changes-file-state-creation.md"
dependencies:
  - "[[modular-architecture-standard]]"
  - "[[zero-hardcoded-variables]]"
  - "[[asci-tree-codeblock-standard]]"
  - "[[cross-os-zero-localhost]]"
  - "[[uiux-wireframe-via-text-ascii-codeblock]]"
  - "[[donot-commit-yet]]"
---

# Multiple TreePane — Live File System Watcher & Reactive State Specification (`v01-01-04`)

> **Version**: `v01-01-04` (Live Reactive File System Watcher, Real-Time File Creation Detection, Debounced Invalidation & Native Creation Actions)  
> **Target Brief Filename**: `brief/v01-01-04_fix-not-detecting-changes-file-state-creation.md`  
> **Baseline References**:  
> - [`brief/v01-00_main-idea.md`](./v01-00_main-idea.md)  
> - [`brief/v01-01_structure-and-tecnical.md`](./v01-01_structure-and-tecnical.md)  
> - [`brief/v01-01-02-version-control-naming.md`](./v01-01-02-version-control-naming.md)  
> - [`brief/v01-01-03_update-able-to-dragndrop-to-terminal.md`](./v01-01-03_update-able-to-dragndrop-to-terminal.md)  
> - [`../all-lads-tool/skill/briefing-0x-0x-version.md`](../all-lads-tool/skill/briefing-0x-0x-version.md)  
> - [`../all-lads-tool/skill/donot-commit-yet.md`](../all-lads-tool/skill/donot-commit-yet.md)  
>
> **Primary Problem Statement**:  
> Multiple TreePane fails to reactively detect and display newly created files, deleted files, renamed nodes, or external disk modifications (e.g. via terminal `touch`, `git checkout`, external scripts, or native VS Code editor creation). Tree views remain completely stale until a manual refresh button is clicked. Furthermore, the context menus lack direct "New File" and "New Folder" creation commands.
>
> **Primary Objectives**:  
> 1. **Reactive File System Watcher Subsystem (`PaneWatcherManager`)**: Automatically establish lifecycle-managed `vscode.FileSystemWatcher` instances tracking all active repository and pane root paths.  
> 2. **Debounced Event Coalescence (150ms)**: Aggregate burst file system events (`onDidCreate`, `onDidDelete`, `onDidChange`) into debounced, targeted change batches to prevent DOM thrashing during bulk operations (e.g. `npm install`, `git pull`).  
> 3. **Non-Destructive Live State Synchronization**: Update the webview tree hierarchies dynamically while strictly preserving user expansion states (`expandedNodes`), active selections, and scroll coordinates.  
> 4. **Direct Tree Node File/Folder Creation**: Add "New File" and "New Folder" actions to both tree node context menus and empty canvas areas, offering instant creation via inline input or prompt dialogs with immediate visual focus.  
> 5. **Octates Milestone Alignment (`v01-01-03` / `--03`)**: Ensure release manifests, lockfiles, and documentation remain synchronized under the strict `donot-commit-yet` pre-commit quarantine invariant.

---

## 📑 DAFTAR ISI (TABLE OF CONTENTS)

1. [Architectural Directives & Invariants](#1-architectural-directives--invariants)
2. [Root Cause Analysis: Why File State Changes Were Undetected](#2-root-cause-analysis-why-file-state-changes-were-undetected)
3. [Directory Topology & System Boundaries](#3-directory-topology--system-boundaries)
4. [Reactive Watcher Subsystem Architecture (`PaneWatcherManager`)](#4-reactive-watcher-subsystem-architecture-panewatchermanager)
   - [4.1 Multi-Root Watcher Lifecycle](#41-multi-root-watcher-lifecycle)
   - [4.2 Event Filtering & Ignore Invariants](#42-event-filtering--ignore-invariants)
   - [4.3 Debounced Change Batching Protocol](#43-debounced-change-batching-protocol)
5. [IPC Message Specification & Frontmatter Flow](#5-ipc-message-specification--frontmatter-flow)
6. [UI/UX Monospace Wireframes](#6-uiux-monospace-wireframes)
   - [6.1 Real-Time File Creation & Inline Highlighting (Desktop)](#61-real-time-file-creation--inline-highlighting-desktop)
   - [6.2 Right-Click Context Menu with New File/Folder (Compact/Mobile)](#62-right-click-context-menu-with-new-filefolder-compactmobile)
7. [Subsystem Implementation Deep-Dives](#7-subsystem-implementation-deep-dives)
   - [7.1 Backend: PaneWatcherManager Service](#71-backend-panewatchermanager-service)
   - [7.2 Backend: Direct File & Folder Creation Handlers](#72-backend-direct-file--folder-creation-handlers)
   - [7.3 Frontend Webview: Live Tree Patching & Expansion Preservation](#73-frontend-webview-live-tree-patching--expansion-preservation)
8. [Unified Build & Verification Pipeline](#8-unified-build--verification-pipeline)
9. [Pre-Commit Quarantine Protocol (`donot-commit-yet`)](#9-pre-commit-quarantine-protocol-donot-commit-yet)

---

## 1. Architectural Directives & Invariants

- **RULE #1: Continuous Reactive Synchrony (Zero Manual Refresh Requirement)**:
  The extension MUST automatically reflect any file creation, file deletion, or rename operation within 200ms of disk commitment without requiring the user to click the "Refresh Tree" or "Refresh All" buttons.
- **RULE #2: Non-Destructive State Preservation**:
  Live refreshes triggered by file system watchers MUST NOT collapse open folders, reset tree scroll positions, or deselect active items. Only the affected subtree branch or pane state shall be seamlessly updated.
- **RULE #3: High-Frequency Burst Protection**:
  To prevent performance degradation during rapid disk writes (`git checkout`, `build`, `npm install`), all file watcher notifications MUST pass through a trailing-edge debounce buffer of 150ms before dispatching IPC updates to the webview.
- **RULE #4: Noise Isolation & Ignore Invariant**:
  Watchers MUST automatically ignore noisy transient folders (`node_modules`, `.git/objects`, `.git/logs`, `dist`, `out`, `*.tmp`, `*.bak`) to conserve system file handles and CPU cycles.
- **RULE #5: Strict Pre-Commit Quarantine (`donot-commit-yet`)**:
  AI programming agents MUST NEVER execute `git commit` autonomously. All code modifications, test scripts, and build artifacts sit uncommitted in the working tree for sovereign user inspection and approval.

---

## 2. Root Cause Analysis: Why File State Changes Were Undetected

Prior to this specification, the Multiple TreePane architecture suffered from a complete architectural disconnect between VS Code's host file system events and the extension's isolated webview process:

```text
+---------------------------------------------------------------------------------------------------+
| PREVIOUS ARCHITECTURE: UNWATCHED & DISCONNECTED STATE (STALE FILE SYSTEM)                         |
+---------------------------------------------------------------------------------------------------+

  [ External Terminal ] ---> creates 'new-component.ts' on disk
  [ VS Code Editor ]    ---> creates 'README.md' or saves changes
  [ Git Checkout ]      ---> switches branch, modifying 50 files
            |
            v
   [ Operating System File System ] (Disk reflects changes immediately)
            |
            x  <-- NO FileSystemWatcher registered in extension.ts or FileSystemService.ts!
            x  <-- NO vscode.workspace.onDidCreateFiles listener!
            x  <-- NO IPC notification sent to webview!
            |
   [ Multiple TreePane Webview ] =======================================> [ STALE / BLIND UI ]
   - Renders only initial JSON snapshot.                                 (User must click
   - Completely unaware of newly created files or modified states.        manual refresh!)
+---------------------------------------------------------------------------------------------------+
```

### Key Architectural Flaws Identified:
1. **Zero Watchers in Extension Host**: Neither `src/extension.ts`, `src/FileSystemService.ts`, nor `src/TreePanelManager.ts` instantiated `vscode.workspace.createFileSystemWatcher`.
2. **Missing Creation Handlers**: The UI context menus only provided clipboard operations (`cut`, `copy`, `paste`) and `rename`, but omitted fundamental `New File` and `New Folder` direct triggers.
3. **Destructive Manual Refresh**: Clicking the existing manual refresh button completely reloaded the entire tree hierarchy from root, wiping out expanded directory states and causing jarring UI scroll jumps.

---

## 3. Directory Topology & System Boundaries

The architecture introduces a dedicated `WatcherService` / `PaneWatcherManager` in the extension host layer to bridge VS Code file system events directly into the `WebviewUtils` messaging pipeline:

```text
vscode-exstension_multiple-treepane/
├── brief/
│   ├── v01-00_main-idea.md
│   ├── v01-01_structure-and-tecnical.md
│   ├── v01-01-01_multi-column-tree-explorer.md
│   ├── v01-01-02-version-control-naming.md
│   ├── v01-01-03_update-able-to-dragndrop-to-terminal.md
│   └── v01-01-03_fix-not-detecting-changes-file-state-creation.md  # THIS SSOT SPECIFICATION
├── media/
│   ├── main.css                   # Inline creation input & highlight pulse styles
│   ├── main.js                    # Webview renderer, state preservation & new file modals
│   └── codicons/                  # Standard icon glyphs
├── src/
│   ├── extension.ts               # Extension activation & watcher subscription lifecycle
│   ├── FileSystemService.ts       # Disk I/O, creation handlers, safety traversal guards
│   ├── PaneWatcherManager.ts      # NEW: Dynamic multi-root debounced file system watcher
│   ├── TreePanelManager.ts        # Webview panel coordinator
│   ├── TreeSidebarProvider.ts     # Sidebar view provider
│   ├── types.ts                   # IPC message definitions for reactive file events
│   └── WebviewUtils.ts            # Webview HTML generator & message dispatch pipeline
├── out/
│   ├── dist/                      # Transpiled extension code
│   └── vsix/                      # Packaged release artifacts
└── package.json                   # Version 1.1.3 (Milestone v01-01-03)
```

---

## 4. Reactive Watcher Subsystem Architecture (`PaneWatcherManager`)

### 4.1 Multi-Root Watcher Lifecycle

Each active tree pane in Multiple TreePane represents an independent workspace folder or external repository directory. `PaneWatcherManager` dynamically binds a `vscode.FileSystemWatcher` per active root:

```text
+---------------------------------------------------------------------------------------------------+
| REACTIVE WATCHER & DEBOUNCED IPC SYNCHRONIZATION PIPELINE                                         |
+---------------------------------------------------------------------------------------------------+

   +------------------------------------+       +------------------------------------+
   |   PANE #1 ROOT: proj/all-lads-tool  |       |   PANE #2 ROOT: web_app_sport_club |
   +------------------------------------+       +------------------------------------+
                     |                                            |
                     v                                            v
         [ FileSystemWatcher #1 ]                     [ FileSystemWatcher #2 ]
         Pattern: **/*                                Pattern: **/*
                     \                                            /
                      +------------------+-----------------------+
                                         |
                                         v
                     [ PaneWatcherManager Event Ingestion ]
                     - Filters out: node_modules, .git, dist, etc.
                     - Maps modified URI to designated Pane ID(s)
                                         |
                                         v
                     [ Trailing-Edge Debounce Buffer (150ms) ]
                     - Coalesces rapid burst events into single batch
                                         |
                                         v
                     [ Webview IPC Notification: 'fileSystemChanged' ]
                     - Payload: { paneId, affectedPath, changeType }
                                         |
                                         v
                     [ Webview Smart Patching ]
                     - Fetches fresh subtree for target directory
                     - Preserves open folders, scroll offset & focus
                     - Applies brief visual pulse to new files
+---------------------------------------------------------------------------------------------------+
```

### 4.2 Event Filtering & Ignore Invariants

To avoid memory saturation and CPU spikes, the watcher engine applies a strict glob ignore filter:
```typescript
const IGNORED_WATCH_PATTERNS = [
  '**/node_modules/**',
  '**/.git/objects/**',
  '**/.git/logs/**',
  '**/.git/index.lock',
  '**/out/**',
  '**/dist/**',
  '**/.turbo/**',
  '**/*.tmp',
  '**/*.bak'
];
```

### 4.3 Debounced Change Batching Protocol

When multiple files are created or modified simultaneously (e.g. generating an artifact bundle), `PaneWatcherManager` records the modified URIs in an internal `Set<string>` and starts a 150ms timer. If new events arrive within the window, the timer resets. Upon expiration, a single consolidated refresh signal is dispatched.

---

## 5. IPC Message Specification & Frontmatter Flow

### 5.1 Extension Host &rarr; Webview (`fileSystemChanged`)

```json
{
  "command": "fileSystemChanged",
  "paneId": "pane-1",
  "changeType": "create",
  "uri": "file:///e:/proj/all-lads-tool/brief/v01-01-03_fix-not-detecting-changes-file-state-creation.md",
  "targetDirPath": "e:/proj/all-lads-tool/brief"
}
```

### 5.2 Webview &rarr; Extension Host (`createItem`)

```json
{
  "command": "createItem",
  "paneId": "pane-1",
  "targetDirPath": "e:/proj/all-lads-tool/src",
  "itemName": "PaneWatcherManager.ts",
  "itemType": "file"
}
```

---

## 6. UI/UX Monospace Wireframes

### 6.1 Real-Time File Creation & Inline Highlighting (Desktop)

```text
+--------------------------------------------------------------------------------------------------+
| MULTIPLE TREEPANE EXPLORER                                                          [||] [+] [R] |
+--------------------------------------------------------------------------------------------------+
| ::: #1 proj/all-lads-tool  [GIT]           1st < > X | ::: #2 web_app_sport_club [GIT] 1st < > X |
| [ Filter files...                      Aa ab .* ]    | [ Filter files...             Aa ab .* ]  |
|------------------------------------------------------|-------------------------------------------|
| v brief                                              | v src                                     |
|     v01-00_main-idea.md                              |     App.vue                               |
|     v01-01-01_multi-column-tree-explorer.md          |     main.ts                               |
|     v01-01-02-version-control-naming.md              |   package.json                            |
|   * v01-01-03_fix-not-detecting-...md  [JUST CREATED]|   README.md                               |
| > combo                                              |                                           |
| > docs                                               |                                           |
| v src                                                |                                           |
|     extension.ts                                     |                                           |
|   * PaneWatcherManager.ts              [NEW FILE]    |                                           |
|     FileSystemService.ts                             |                                           |
|     WebviewUtils.ts                                  |                                           |
+--------------------------------------------------------------------------------------------------+
| Status: 2 Panes Active | Live Watcher: CONNECTED (2 Roots) | Memory: 14MB                        |
+--------------------------------------------------------------------------------------------------+
```

### 6.2 Right-Click Context Menu with New File/Folder (Compact/Mobile)

```text
+------------------------------------------------------+
| ::: #1 proj/all-lads-tool [GIT]                      |
|------------------------------------------------------|
| v src                                                |
|   |-- extension.ts                                   |
|   |-- FileSystemService.ts                           |
|   |   +--------------------------------------------+ |
|   |   | [FILE CONTEXT MENU]                        | |
|   |   |--------------------------------------------| |
|   |   | [+] New File...                            | |
|   |   | [F] New Folder...                          | |
|   |   |--------------------------------------------| |
|   |   | [X] Cut                          (Ctrl+X)  | |
|   |   | [C] Copy                         (Ctrl+C)  | |
|   |   | [V] Paste                        (Ctrl+V)  | |
|   |   |--------------------------------------------| |
|   |   | [T] Send Path to Terminal                  | |
|   |   | [>] Open in Integrated Terminal            | |
|   |   |--------------------------------------------| |
|   |   | [R] Rename...                    (F2)      | |
|   |   | [D] Delete                       (Delete)  | |
|   |   +--------------------------------------------+ |
+------------------------------------------------------+
```

---

## 7. Subsystem Implementation Deep-Dives

### 7.1 Backend: PaneWatcherManager Service

Create `src/PaneWatcherManager.ts` to coordinate root-level file watchers:

```typescript
import * as vscode from 'vscode';
import * as path from 'path';

export class PaneWatcherManager implements vscode.Disposable {
  private watchers = new Map<string, vscode.FileSystemWatcher>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingChanges = new Set<string>();

  constructor(
    private readonly onDidChangeRoots: (affectedPaths: string[]) => void
  ) {}

  public syncPanes(panes: { id: string; rootPath: string }[]): void {
    const activeRoots = new Set(panes.map(p => path.normalize(p.rootPath)));

    // Dispose obsolete watchers
    for (const [watchedRoot, watcher] of this.watchers.entries()) {
      if (!activeRoots.has(watchedRoot)) {
        watcher.dispose();
        this.watchers.delete(watchedRoot);
      }
    }

    // Register new watchers
    for (const root of activeRoots) {
      if (!this.watchers.has(root)) {
        const pattern = new vscode.RelativePattern(root, '**/*');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate(uri => this.handleFsEvent(uri.fsPath));
        watcher.onDidDelete(uri => this.handleFsEvent(uri.fsPath));
        watcher.onDidChange(uri => this.handleFsEvent(uri.fsPath));

        this.watchers.set(root, watcher);
      }
    }
  }

  private handleFsEvent(filePath: string): void {
    const norm = path.normalize(filePath);
    // Ignore transient files
    if (norm.includes('node_modules') || norm.includes('.git') || norm.endsWith('.tmp')) {
      return;
    }

    this.pendingChanges.add(norm);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const paths = Array.from(this.pendingChanges);
      this.pendingChanges.clear();
      this.onDidChangeRoots(paths);
    }, 150);
  }

  public dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    for (const watcher of this.watchers.values()) {
      watcher.dispose();
    }
    this.watchers.clear();
  }
}
```

### 7.2 Backend: Direct File & Folder Creation Handlers

In `src/FileSystemService.ts`, introduce dedicated creation methods:

```typescript
public static async createNewItem(
  targetDirPath: string,
  itemName: string,
  isFolder: boolean
): Promise<{ success: boolean; newPath?: string; error?: string }> {
  try {
    if (!this.isPathSafe(targetDirPath) || !this.isPathSafe(itemName)) {
      return { success: false, error: 'Path traversal validation failed.' };
    }

    const fullPath = path.join(targetDirPath, itemName);
    const uri = vscode.Uri.file(fullPath);

    if (isFolder) {
      await vscode.workspace.fs.createDirectory(uri);
    } else {
      await vscode.workspace.fs.writeFile(uri, new Uint8Array(0));
    }

    return { success: true, newPath: fullPath };
  } catch (err: any) {
    vscode.window.showErrorMessage(`Create failed: ${err.message || err}`);
    return { success: false, error: err.message || String(err) };
  }
}
```

### 7.3 Frontend Webview: Live Tree Patching & Expansion Preservation

In `media/main.js`, update the tree reception logic to:
1. Capture currently expanded node paths: `const expanded = new Set([...document.querySelectorAll('.tree-node.expanded')].map(el => el.dataset.path));`
2. Re-render the updated directory nodes seamlessly.
3. Re-apply `.expanded` classes without collapsing hierarchies.
4. Temporarily add `.just-created` class to the new node to trigger an unobtrusive 1.5s glow animation.

---

## 8. Unified Build & Verification Pipeline

```powershell
# 1. Compile TypeScript source with strict type checking
pnpm run compile

# 2. Package VSIX bundle using octates release engine
node scripts/package-vsix.js

# 3. Output Verification
Get-ChildItem -Path "out/vsix" -Filter "*v01-01-03*"
```

---

## 9. Pre-Commit Quarantine Protocol (`donot-commit-yet`)

Adhering strictly to [`e:/proj/all-lads-tool/skill/donot-commit-yet.md`](../all-lads-tool/skill/donot-commit-yet.md):

> [!CAUTION]
> **PRE-COMMIT QUARANTINE INVARIANT**:
> Under NO circumstance may the AI agent execute `git commit` or append commit commands automatically.
> All created brief specifications, watcher implementations, and manifest updates **MUST REMAIN UNCOMMITTED IN THE WORKING TREE**.
> The agent presents the inspection status (`git status -s`) and waits for sovereign user review.

---

## 10. AI Programmer Agent Checklist

- [x] Canonical brief created with mandatory 8 sections.
- [x] Frontmatter metadata, aliases, and dependencies defined.
- [x] Root cause of stale file tree comprehensively analyzed.
- [x] Multi-root `PaneWatcherManager` and 150ms debounce architecture detailed.
- [x] Monospace wireframes for desktop live creation and compact context menus drawn.
- [x] Direct "New File" and "New Folder" specifications documented.
- [x] Strict compliance with `donot-commit-yet` pre-commit quarantine enforced.
