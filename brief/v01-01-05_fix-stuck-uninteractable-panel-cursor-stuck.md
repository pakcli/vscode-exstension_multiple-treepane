---
title: Multiple TreePane - Fix Stuck Uninteractable Panel and Stuck Cursor Specification
version: v01-01-05
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

# Multiple TreePane — Fix Stuck Uninteractable Panel & Cursor Stuck Specification (`v01-01-05`)

> **Version**: `v01-01-05` (Gutter Pointer Capture Migration, Universal Interaction Failsafe Engine, Window Blur Recovery & Cursor State Protection)  
> **Target Brief Filename**: `brief/v01-01-05_fix-stuck-uninteractable-panel-cursor-stuck.md`  
> **Status**: **PRE-CODING QUARANTINE (`donot-code-yet`)** — Architectural Plan & Specification awaiting user review and greenlight before code modifications.  
> **Baseline References**:  
> - [`brief/v01-00_main-idea.md`](./v01-00_main-idea.md)  
> - [`brief/v01-01_structure-and-tecnical.md`](./v01-01_structure-and-tecnical.md)  
> - [`brief/v01-01-02-version-control-naming.md`](./v01-01-02-version-control-naming.md)  
> - [`brief/v01-01-03_update-able-to-dragndrop-to-terminal.md`](./v01-01-03_update-able-to-dragndrop-to-terminal.md)  
> - [`brief/v01-01-04_fix-not-detecting-changes-file-state-creation.md`](./v01-01-04_fix-not-detecting-changes-file-state-creation.md)  
> - [`brief/v01-01-06_complete-all-same-native-explorer-uiux-with-addition-rightclick.md`](./v01-01-06_complete-all-same-native-explorer-uiux-with-addition-rightclick.md)  
> - [`../all-lads-tool/skill/briefing-0x-0x-version.md`](../all-lads-tool/skill/briefing-0x-0x-version.md)  
> - [`../all-lads-tool/skill/donot-code-yet.md`](../all-lads-tool/skill/donot-code-yet.md)  
> - [`../all-lads-tool/skill/donot-commit-yet.md`](../all-lads-tool/skill/donot-commit-yet.md)  
>
> **Primary Problem Statement**:  
> Users experience intermittent states where tree panes become completely frozen, unresponsive to clicks, and uninteractable. Concurrently, the OS mouse cursor becomes permanently trapped in `col-resize` (↔) or `row-resize` (↕) or `grabbing` (✊) mode across the entire webview canvas, and text selection remains blocked (`user-select: none !important`).
>
> **Primary Objectives**:  
> 1. **Gutter Resizing Pointer Capture (`setPointerCapture`)**: Upgrade splitter gutter resizing from raw `mousedown` / `mousemove` / `mouseup` to the standard Pointer Events API (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture`) with explicit pointer capture binding.  
> 2. **Universal Interaction Failsafe Engine (`cleanupInteractionStates`)**: Implement a unified, bulletproof state reset routine that unconditionally clears stuck cursor classes, removes drag indicators, unlocks text selection, and restores pane responsiveness.  
> 3. **Boundary & Focus Loss Recovery**: Automatically trigger interaction cleanup upon `window.onblur`, `document.onmouseleave`, and `Escape` keypress to recover immediately if a drag or resize operation releases outside the webview iframe.  
> 4. **Watchdog Auto-Recovery**: Introduce an auto-recovery timer (watchdog) ensuring that no resize or drag state can hold the canvas hostage for longer than 3 seconds without active user movement.

---

## 📑 DAFTAR ISI (TABLE OF CONTENTS)

1. [Architectural Directives & Invariants](#1-architectural-directives--invariants)
2. [Root Cause Forensic Breakdown](#2-root-cause-forensic-breakdown)
   - [2.1 The Lost MouseUp Boundary Bug](#21-the-lost-mouseup-boundary-bug)
   - [2.2 Unmanaged Pointer Capture Flaw](#22-unmanaged-pointer-capture-flaw)
   - [2.3 DragEnd Failure on Cancelled Drag Operations](#23-dragend-failure-on-cancelled-drag-operations)
3. [Directory Topology & Scope Boundaries](#3-directory-topology--scope-boundaries)
4. [Pointer Events & Failsafe Architecture](#4-pointer-events--failsafe-architecture)
   - [4.1 Pointer Capture State Machine](#41-pointer-capture-state-machine)
   - [4.2 Universal Interaction Cleanup Protocol](#42-universal-interaction-cleanup-protocol)
   - [4.3 Triple-Tier Escape Hatches (Blur, Leave, Keydown)](#43-triple-tier-escape-hatches-blur-leave-keydown)
5. [UI/UX Monospace Wireframes](#5-uiux-monospace-wireframes)
   - [5.1 Healthy Gutter Resizing vs. Trapped Cursor State](#51-healthy-gutter-resizing-vs-trapped-cursor-state)
   - [5.2 Escape Hatch Recovery Flowchart](#52-escape-hatch-recovery-flowchart)
6. [Subsystem Implementation Deep-Dives](#6-subsystem-implementation-deep-dives)
   - [6.1 Modernized setupResizer with setPointerCapture](#61-modernized-setupresizer-with-setpointercapture)
   - [6.2 Global Failsafe Listeners & Watchdog Timer](#62-global-failsafe-listeners--watchdog-timer)
   - [6.3 CSS Defensive Resilience](#63-css-defensive-resilience)
7. [Unified Build Pipeline & Verification Plan](#7-unified-build-pipeline--verification-plan)
8. [Pre-Coding Quarantine Protocol (`donot-code-yet`)](#8-pre-coding-quarantine-protocol-donot-code-yet)

---

## 1. Architectural Directives & Invariants

- **RULE #1: Zero Permanent Cursor Locks**:
  The cursor styling (`col-resize`, `row-resize`, `grabbing`) MUST NEVER persist on `document.body` or `.treepane-viewport` once physical mouse buttons are released, regardless of where the pointer was released.
- **RULE #2: Standard Pointer Capture Mandate**:
  All drag-based dimensional manipulators (gutter splitters) MUST use the W3C Pointer Events API with `element.setPointerCapture(e.pointerId)` and `element.releasePointerCapture(e.pointerId)`. Raw legacy `mousedown` resizing without capture is strictly prohibited.
- **RULE #3: Triple Escape Hatch Invariant**:
  Any active resizing or dragging state MUST immediately terminate and revert if:
  1. The window loses focus (`window.onblur`).
  2. The pointer leaves the document boundary (`document.onmouseleave`).
  3. The user presses the `Escape` key (`keydown` &rarr; `e.key === 'Escape'`).
- **RULE #4: Zero Code Mutation Without Sovereign Approval (`donot-code-yet`)**:
  All codebase files remain in quarantine until this plan is formally reviewed and explicitly greenlit by the human developer.

---

## 2. Root Cause Forensic Breakdown

```text
+---------------------------------------------------------------------------------------------------+
| FORENSIC ANATOMY OF THE STUCK CURSOR & UNINTERACTABLE PANEL BUG                                   |
+---------------------------------------------------------------------------------------------------+

 1. User clicks splitter gutter:
    mousedown event fires on .pane-resizer
      │
      ├──> document.body.classList.add('is-resizing')  [Sets cursor: col-resize !important;]
      ├──> document.body.classList.add('user-select-none') [Blocks all text selection]
      └──> window.addEventListener('mouseup', onMouseUp) [Awaiting mouseup to release]
      │
 2. User moves cursor rapidly across pane into editor tab or outside VS Code window:
      │
 3. User releases mouse button OUTSIDE webview iframe:
      │
      x  <-- Webview iframe NEVER receives 'mouseup' event!
      x  <-- onMouseUp callback is NEVER triggered!
      │
 4. Catastrophic Trapped State:
      │
      ├──> document.body STILL has .is-resizing
      ├──> Cursor permanently stuck as 'col-resize' (↔) across the entire canvas!
      ├──> user-select: none !important blocks selecting or clicking elements!
      └──> Panel appears completely stuck and uninteractable!
+---------------------------------------------------------------------------------------------------+
```

### 2.1 The Lost MouseUp Boundary Bug
In Chromium-based webviews (such as VS Code's webview iframe), mouse events are strictly isolated to the iframe's client rectangle. When a user drags a resizer gutter toward the edge and releases the mouse over an editor tab, terminal, sidebar, or outside the application window, the browser dispatches `mouseup` to the outer window, **not the webview iframe**. Because the existing code in `setupResizer()` only listens to `window.addEventListener('mouseup')` within the iframe, the cleanup handler is bypassed completely.

### 2.2 Unmanaged Pointer Capture Flaw
Legacy `mousedown` and `mousemove` listeners lack pointer redirection. Without `setPointerCapture(pointerId)`, pointer coordinates stop reporting once the cursor exits the element bounding box, preventing smooth drag tracking and leaving state variables (`is-resizing`) orphaned.

### 2.3 DragEnd Failure on Cancelled Drag Operations
When dragging tree nodes or pane titles, if the drop is rejected outside a valid drop target (e.g., dropped on the VS Code menu bar or status bar), certain OS platforms fail to fire `dragend` reliably, leaving `isNodeDragging = true` and `.dragging` CSS classes stuck on DOM nodes.

---

## 3. Directory Topology & Scope Boundaries

```text
vscode-exstension_multiple-treepane/
├── brief/
│   ├── v01-01-04_fix-not-detecting-changes-file-state-creation.md
│   ├── v01-01-05_fix-stuck-uninteractable-panel-cursor-stuck.md     # THIS SSOT SPECIFICATION
│   └── v01-01-06_complete-all-same-native-explorer-uiux-with-addition-rightclick.md
├── media/
│   ├── main.css                   # Defensive cursor resilience & failsafe styling
│   └── main.js                    # Pointer capture migration, cleanupInteractionStates, escape hatches
├── src/
│   └── (No backend changes needed - purely client-side webview event engine fix)
└── package.json                   # Milestone target SemVer: 1.1.5 (v01-01-05)
```

---

## 4. Pointer Events & Failsafe Architecture

### 4.1 Pointer Capture State Machine

```text
  [ IDLE ] ─── pointerdown ───> [ CAPTURED & RESIZING ]
     ▲                                   │
     │            pointermove            │
     │        (tracks coordinates)       │
     │                                   │
     │       pointerup / pointercancel   │
     │       / lostpointercapture        │
     └───────────────────────────────────┘
               (releasePointerCapture & cleanup)
```

### 4.2 Universal Interaction Cleanup Protocol

A single centralized function, `cleanupInteractionStates()`, unconditionally purges all transient interaction classes:

```typescript
function cleanupInteractionStates() {
  // 1. Remove body cursor locks
  document.body.classList.remove('is-resizing', 'is-resizing-v', 'is-tree-dragging');

  // 2. Clear resizer gutter active states
  document.querySelectorAll('.pane-resizer.active').forEach(el => el.classList.remove('active'));

  // 3. Clear node drag states
  document.querySelectorAll('.tree-node.dragging, .pane-title.dragging').forEach(el => el.classList.remove('dragging'));
  clearAllDragIndicators();

  // 4. Reset internal state flags
  isNodeDragging = false;
  currentDragSource = null;
  activePointerResizer = null;
}
```

### 4.3 Triple-Tier Escape Hatches (Blur, Leave, Keydown)

```typescript
// Escape Hatch Tier 1: Window Blur (when clicking outside webview)
window.addEventListener('blur', cleanupInteractionStates);

// Escape Hatch Tier 2: Document Mouse Leave (when pointer exits webview)
document.addEventListener('mouseleave', () => {
  if (document.body.classList.contains('is-resizing') || document.body.classList.contains('is-resizing-v')) {
    cleanupInteractionStates();
  }
});

// Escape Hatch Tier 3: Emergency Escape Key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cleanupInteractionStates();
    closeContextMenu();
  }
});
```

---

## 5. UI/UX Monospace Wireframes

### 5.1 Healthy Gutter Resizing vs. Trapped Cursor State

```text
NORMAL HEALTHY RESIZING:
+-------------------------------+ | +-------------------------------+
| PANE #1                       | | | PANE #2                       |
| [ Folder Tree               ] |G| | [ Folder Tree               ] |
|                               |U| |                               |
| Pointer down captures cursor  |T| | Pointer release cleans cursor |
| Cursor: <---> (active only)   |T| | Cursor: default (immediate)   |
+-------------------------------+ | +-------------------------------+

PREVIOUS TRAPPED / STUCK STATE (BEFORE FIX):
+-------------------------------------------------------------------+
| BODY CURSOR TRAPPED: <------------------------------------------> |
| ALL CLICKS IGNORED (user-select: none !important)                 |
| [ PANE #1 UNRESPONSIVE ]            [ PANE #2 UNRESPONSIVE ]      |
+-------------------------------------------------------------------+
```

### 5.2 Escape Hatch Recovery Flowchart

```text
+-----------------------------------------------------------------------+
| EMERGENCY ESCAPE HATCH RECOVERY PIPELINE                              |
+-----------------------------------------------------------------------+
|                                                                       |
|   [ Pointer Event Trapped or Mouse Released Outside Webview ]         |
|                              |                                        |
|             +----------------+----------------+                       |
|             |                                 |                       |
|             v                                 v                       |
|   [ User clicks Editor / Tab ]      [ User presses 'Escape' key ]     |
|             │                                 │                       |
|             v                                 v                       |
|    window.onblur fires              keydown event fires               |
|             │                                 │                       |
|             +----------------+----------------+                       |
|                              │                                        |
|                              v                                        |
|             [ cleanupInteractionStates() Invoked ]                    |
|             - document.body classes stripped                          |
|             - Pointer capture released                                |
|             - Cursor restored to default                              |
|             - Panes instantly responsive!                             |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## 6. Subsystem Implementation Deep-Dives

### 6.1 Modernized setupResizer with setPointerCapture

```javascript
function setupResizer(resizerEl, leftPane, rightPane) {
  resizerEl.addEventListener('pointerdown', (e) => {
    // Only respond to primary mouse button
    if (e.button !== 0) return;
    e.preventDefault();

    const isHorizontal = state.layout === 'horizontal';
    document.body.classList.add(isHorizontal ? 'is-resizing' : 'is-resizing-v');
    resizerEl.classList.add('active');

    // Bind hardware pointer capture to resizer element
    try {
      resizerEl.setPointerCapture(e.pointerId);
    } catch {}

    const startCoord = isHorizontal ? e.clientX : e.clientY;
    const leftEl = document.getElementById(`pane_el_${leftPane.id}`);
    const rightEl = document.getElementById(`pane_el_${rightPane.id}`);

    const startLeftSize = isHorizontal ? leftEl.offsetWidth : leftEl.offsetHeight;
    const startRightSize = isHorizontal ? rightEl.offsetWidth : rightEl.offsetHeight;

    function onPointerMove(moveEvent) {
      const currentCoord = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentCoord - startCoord;

      const newLeftSize = Math.max(120, startLeftSize + delta);
      const newRightSize = Math.max(120, startRightSize - delta);

      leftPane.size = newLeftSize;
      rightPane.size = newRightSize;

      if (isHorizontal) {
        leftEl.style.width = `${newLeftSize}px`;
        leftEl.style.flexBasis = `${newLeftSize}px`;
        rightEl.style.width = `${newRightSize}px`;
        rightEl.style.flexBasis = `${newRightSize}px`;
      } else {
        leftEl.style.height = `${newLeftSize}px`;
        leftEl.style.flexBasis = `${newLeftSize}px`;
        rightEl.style.height = `${newRightSize}px`;
        rightEl.style.flexBasis = `${newRightSize}px`;
      }
    }

    function onPointerUp(upEvent) {
      try {
        resizerEl.releasePointerCapture(upEvent.pointerId);
      } catch {}
      cleanup();
      saveState();
    }

    function cleanup() {
      document.body.classList.remove('is-resizing', 'is-resizing-v');
      resizerEl.classList.remove('active');
      resizerEl.removeEventListener('pointermove', onPointerMove);
      resizerEl.removeEventListener('pointerup', onPointerUp);
      resizerEl.removeEventListener('pointercancel', onPointerUp);
      resizerEl.removeEventListener('lostpointercapture', cleanup);
    }

    resizerEl.addEventListener('pointermove', onPointerMove);
    resizerEl.addEventListener('pointerup', onPointerUp);
    resizerEl.addEventListener('pointercancel', onPointerUp);
    resizerEl.addEventListener('lostpointercapture', cleanup);
  });
}
```

### 6.2 Global Failsafe Listeners & Watchdog Timer

```javascript
// Watchdog: If resizing is active with no movement for 3.5s, auto-terminate
let resizeWatchdog = null;
function armResizeWatchdog() {
  clearTimeout(resizeWatchdog);
  resizeWatchdog = setTimeout(() => {
    if (document.body.classList.contains('is-resizing') || document.body.classList.contains('is-resizing-v')) {
      cleanupInteractionStates();
    }
  }, 3500);
}
```

---

## 7. Unified Build Pipeline & Verification Plan

```powershell
# 1. Bump version to SemVer 1.1.5 (v01-01-05)
node scripts/bump-version.js patch

# 2. Compile TypeScript
npm run compile

# 3. Package production VSIX
node scripts/package-vsix.js

# 4. Verify output artifacts
Get-ChildItem -Path "out/vsix" -Filter "*v01-01-05*"
```

---

## 8. Pre-Coding Quarantine Protocol (`donot-code-yet`)

Adhering strictly to [`e:/proj/all-lads-tool/skill/donot-code-yet.md`](../all-lads-tool/skill/donot-code-yet.md):

> [!CAUTION]
> **PRE-CODING QUARANTINE INVARIANT**:
> No codebase files (`src/`, `media/`, `package.json`) have been modified or generated for this fix yet.
> This architectural brief defines the root cause analysis, pointer capture solution, and escape hatch architecture.
> **All code implementation remains quarantined** until explicit user approval (`proceed`, `yes`, `code it now`) is received.
