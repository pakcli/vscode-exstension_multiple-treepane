# Complete Guide: Multiple TreePane Explorer (GUIDE.md)

This guide covers local development, F5 debugging, packaging into a `.vsix` installer, installing into VS Code and Antigravity IDE, and publishing to community extension stores.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development & F5 Debugging](#2-local-development--f5-debugging)
3. [Building the .vsix Installer Package](#3-building-the-vsix-installer-package)
4. [Installing the .vsix into VS Code & Antigravity IDE](#4-installing-the-vsix-into-vs-code--antigravity-ide)
5. [Publishing to Community Stores](#5-publishing-to-community-stores)
   - [5.1 Visual Studio Code Marketplace](#51-visual-studio-code-marketplace)
   - [5.2 Open VSX Registry](#52-open-vsx-registry)
6. [Layout & Key Commands Reference](#6-layout--key-commands-reference)

---

## 1. Prerequisites

Ensure you have the following installed on your system:
- Node.js: v18.0.0 or higher (`node -v`)
- npm: v9.0.0 or higher (`npm -v`)
- VS Code or Google Antigravity IDE

---

## 2. Local Development & F5 Debugging

### Step 1: Navigate to the extension folder
```powershell
cd E:\proj\vscode-exstension_multiple-treepane
```

### Step 2: Install dependencies
```powershell
npm install
```

### Step 3: Compile TypeScript source
```powershell
npm run compile
```
*(This compiles all TypeScript files from `src/` into JavaScript in the `out/` folder).*

### Step 4: Run via F5 Debugger
1. Open `E:\proj\vscode-exstension_multiple-treepane` in VS Code or Antigravity IDE.
2. Press **`F5`** (or select **Run and Debug** (`Ctrl + Shift + D`) and click the Start Debugging button).
3. A new **Extension Development Host** window will appear with your extension loaded.
4. Test both modes:
   - **Sidepanel**: Click the TreePane icon in the left Activity Bar (stacks vertically).
   - **Editor Tab**: Press `Ctrl + Shift + P` and run:
     ```text
     Multiple TreePane: Open in Full-Width Editor Tab
     ```

---

## 3. Building the .vsix Installer Package

A `.vsix` file is a self-contained installation package that can be distributed and installed without source code.

Run the packaging tool inside the project root:
```powershell
cd E:\proj\vscode-exstension_multiple-treepane
npm run package
```
*(Or invoke via npx: `npx -y @vscode/vsce package --no-dependencies -o ./out/multiple-treepane-0.1.0.vsix`)*

The generated `.vsix` package is placed directly inside `out/`:
```text
E:\proj\vscode-exstension_multiple-treepane\out\multiple-treepane-0.1.0.vsix
```

---

## 4. Installing the .vsix into VS Code & Antigravity IDE

### Option A: Install via GUI (Recommended)
1. Open **VS Code** or **Antigravity IDE**.
2. Open the **Extensions panel** (`Ctrl + Shift + X`).
3. Click the **`...`** (Views and More Actions) menu at the top-right of the Extensions panel.
4. Select **"Install from VSIX..."**.
5. Select `E:\proj\vscode-exstension_multiple-treepane\out\multiple-treepane-0.1.0.vsix`.
6. Click **Install**. The extension is now permanently installed.

### Option B: Install via Terminal CLI
```powershell
# For VS Code:
code --install-extension E:\proj\vscode-exstension_multiple-treepane\out\multiple-treepane-0.1.0.vsix

# For Antigravity IDE (if agy or antigravity binary is in your PATH):
agy --install-extension E:\proj\vscode-exstension_multiple-treepane\out\multiple-treepane-0.1.0.vsix
```

---

## 5. Publishing to Community Stores

### 5.1 Visual Studio Code Marketplace

1. Create an Azure DevOps Personal Access Token (PAT):
   - Go to Azure DevOps (`https://dev.azure.com/`).
   - Click User Settings (top right) > Personal Access Tokens.
   - Create a token with **Marketplace (Manage)** scope.
2. Create a Publisher ID:
   - Go to the Visual Studio Marketplace Management Portal (`https://marketplace.visualstudio.com/manage`).
   - Register a unique publisher ID (matches the `"publisher"` field in `package.json`).
3. Login and Publish via CLI:
   ```powershell
   npx @vscode/vsce login <your-publisher-id>
   npx @vscode/vsce publish
   ```

---

### 5.2 Open VSX Registry

Open VSX is the vendor-neutral community marketplace used by alternative IDEs (VSCodium, Antigravity, Eclipse Theia):

1. Create an Account on Open VSX:
   - Go to `https://open-vsx.org/`.
   - Sign in with your GitHub account.
2. Generate Access Token:
   - Go to your Open VSX profile settings and create an access token.
3. Publish with `ovsx`:
   ```powershell
   npx ovsx publish multiple-treepane-0.1.0.vsix -p <your-open-vsx-token>
   ```

---

## 6. Layout & Key Commands Reference

| Action | Shortcut / Location | Description |
| :--- | :--- | :--- |
| **Open in Editor Tab** | `Ctrl + Shift + P` > `Multiple TreePane: Open in Full-Width Editor Tab` | Launches horizontal multi-column cockpit (`T \| T \| T`). |
| **Open in Sidepanel** | Click TreePane icon on Activity Bar | Opens compact vertical tree stack (`T / T / T`). |
| **Toggle Split Mode** | `[Split Mode]` button in header | Manually toggles between Horizontal and Vertical split. |
| **Add New Tree Pane** | `[+ Add Tree]` button in header | Adds an additional folder tree column or row. |
| **Reorder Panes** | Drag `:::` handle on pane header | Visually drags and reorders panes. |
| **Shift Left / Right** | `[<]` / `[>]` buttons on header | Moves pane one position left or right. |
| **Promote to First** | `[1st]` button on header | Instantly moves that pane to Column #1 / Row #1. |
| **Resize Pane Width** | Drag vertical splitter gutter (6px) | Resizes adjacent pane widths in horizontal mode. |
| **Resize Pane Height** | Drag horizontal splitter gutter (6px) | Resizes adjacent pane heights in vertical mode. |
| **Settings Dialog** | `[Settings]` button in header | Opens layout settings and ordering controls. |

---

## 7. Universal Drag-and-Drop Operations

The explorer supports three distinct drag-and-drop tiers across Windows, macOS, and Linux:

### 7.1 Intra-Tree Sorting & Reordering
- Drag any file node up or down within its current folder.
- Drop on the top half (`.drag-over-top`) or bottom half (`.drag-over-bottom`) of an adjacent file to reorder it immediately.

### 7.2 Inter-Tree Move & Copy
- Drag a file or folder from one repository pane and drop it into another pane:
  - **Drop onto folder**: Moves the item into that folder.
  - **Drop onto pane empty area**: Moves the item into the repository root.
  - **Hold `Alt` or `Ctrl` while dragging**: Performs a copy instead of move.
  - Both source and target trees reload automatically upon drop.

### 7.3 Drag Out to External Applications
Every tree node sets cross-OS standard MIME payloads (`text/uri-list`, `text/plain`, and `DownloadURL`):
- **VS Code Editor Area**: Drag `GUIDE.md` or any file into the editor tabs area or active document to open or link it.
- **Desktop / File Explorer**: Drag files directly out of the webview onto Windows Explorer desktop or macOS Finder.
- **Terminal Consoles**: Drag files into PowerShell, bash, or CMD to instantly paste the absolute file path.

