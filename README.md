# Multiple TreePane Explorer for VS Code v1.1.1
works with: Antigravity IDE

> Concurrent multi-repository file tree explorer with adaptive vertical/horizontal splitting, drag-and-drop sorting, and gutter resizing for VS Code and Google Antigravity IDE.

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

### 1. Overview

#### Target Audience
* Developers working with monorepos or multi-root workspaces containing multiple Git submodules or project cartridges.
* Programmers needing side-by-side directory visibility across disparate folders (for example: `script/`, `docs/`, `skill/`, `web-app/`).
* Power users seeking to eliminate excessive vertical scrolling across deep directory hierarchies.

#### Value Proposition
* Single-Window Multi-Tree Concurrency: Run 2 to 5+ independent directory trees simultaneously inside one window without juggling separate OS windows.
* Adaptive Dual-Host Layout: Automatically stacks as a Vertical Split (`T / T / T`) when docked in the narrow sidepanel/sidebar, and expands as a Horizontal Split (`T | T | T | T | T`) when opened in a wide editor tab.
* Interactive Reordering & Resizing: Drag and drop panes via `:::`, shift positions using `<` and `>`, bring any tree to front with `[1st]`, and drag splitter gutters to shrink or expand trees in real time.

#### Example Use Cases
* Monorepo Cross-Referencing: Keep `packages/core` open in Column 1 while editing `apps/web` in Column 2 and `docs/` in Column 3.
* Toolchain & Adapter Development: Browse `script/repo/adapter/` on the left while monitoring `brief/` specifications on the right.
* Deep Directory Scrutiny: Inspect deeply nested folders without losing scroll position or collapsing other active folders.

---

### 2. Features

* Concurrent Multi-Tree Grid: Display 2 to 5+ directory trees simultaneously in one unified cockpit.
* Adaptive Dual-Mode Splitting: Vertical stacking in narrow sidebars (< 550px) and wide horizontal columns (>= 550px) in editor tabs, with manual `[Split Mode]` toggle override.
* Draggable Gutter Resizers: Resize individual pane widths (horizontal) or heights (vertical) with responsive gutter splitters.
* Drag-and-Drop Sorting (`:::`): Reorder tree panes visually using grab handles, or use `[<]`, `[>]`, and `[1st]` buttons.
* Per-Pane Live Filtering: Search and filter file trees with real-time highlighting and auto-expanded matching branches.
* Auto-Discovery of Workspaces & Git Repos: Dropdown selector per pane to switch root directories to any detected Git repository or folder.
* 1-Click Direct File Opening: Clicking any file immediately opens it in the active text editor.

---

### 3. Architecture & Wireframe

```text
+------------------------------------------------------------------------------------+
| MULTI-TREE EXPLORER   2 trees   [ 📁 Repos (2/8) ▾ ]  [ ⬚ Focus ]  [+ Add] [↻] [⚙]  |
+------------------------------------------------------------------------------------+
|                                                                                    |
| +------------------------------------+  +------------------------------------+     |
| | ::: #1: all-lads-tool   [1st][<][>]✕|  | ::: #2: pakcli-plugin   [1st][<][>]✕|     |
| | [▶] [ Filter files...    | Aa|ab|.*]|  | [▼] [ Filter files...    | Aa|ab|.*]|     |
| |                                     |  |     [ 📁 Switch Root ▾ ] [📁] [↻]    |     |
| +------------------------------------+  +------------------------------------+     |
| | v script/                          |  | v src/                             |     |
| |   > file/                          |  |   > commands/                      |     |
| |   > repo/                          |  |   extension.ts                     |     |
| |   _mainmenu.ps1                    |  |   types.ts                         |     |
| | v skill/                           |  | package.json                       |     |
| |   asci-tree.md                     |  | tsconfig.json                      |     |
+------------------------------------------------------------------------------------+
```

---

### 4. Build, Package & Installation

#### Output Notice: `out/` and `.vsix`
* `npm run compile` compiles TypeScript (`src/*.ts`) into JavaScript (`out/*.js`).
* `npm run package` creates the production installer in `./out/multiple-treepane-1.1.1.vsix`.

#### Step 1: Compile TypeScript
```bash
npm run compile
```

#### Step 2: Package into `.vsix`
```bash
npm run package
```
*Output:* `./out/multiple-treepane-1.1.1.vsix` created.

#### Step 3: Install in VS Code or Antigravity IDE

**Method A: Graphical Interface (GUI)**
1. Open VS Code or Antigravity IDE.
2. Open the Extensions view (`Ctrl+Shift+X`).
3. Click the `...` (Views and More Actions) menu at the top-right of the Extensions pane.
4. Select **Install from VSIX...**
5. Select `./out/multiple-treepane-1.1.1.vsix`.

**Method B: Command Line (CLI)**
```bash
# For VS Code:
code --install-extension ./out/multiple-treepane-1.1.1.vsix

# For Antigravity IDE:
antigravity --install-extension ./out/multiple-treepane-1.1.1.vsix
```

**Method C: Instant Debug (No VSIX required)**
* Open this folder in VS Code or Antigravity IDE.
* Press `F5` (or run **Debug: Start Debugging**).
* An **Extension Development Host** window will open with the extension immediately loaded.

For full developer workflows and store publishing instructions, see [GUIDE.md](./GUIDE.md).

---

### 5. License

Distributed under the **MIT License**. Created for the open-source developer tooling ecosystem.

---

## Bahasa Indonesia

### 1. Gambaran Umum

#### Target Pengguna
* Pengembang yang mengelola repositori monorepo atau workspace multi-folder yang memuat banyak Git submodules atau sub-proyek.
* Programmer yang ingin menghindari scroll berulang pada satu pohon file explorer vertikal yang sempit.
* Pengguna yang membutuhkan visibilitas direktori berdampingan antar folder yang berjauhan (`script/`, `docs/`, `skill/`, `web-app/`).

#### Nilai Tambah
* Multi-Tree Konkuren 1 Jendela: Membuka 2 hingga 5+ pohon direktori sekaligus dalam satu jendela tanpa perlu membuka window baru.
* Layout Adaptif Dual-Host: Otomatis tumpukan vertikal (`T / T / T`) saat berada di sidepanel/sidebar sempit, dan otomatis kolom horizontal (`T | T | T | T | T`) saat dibuka sebagai tab editor penuh.
* Sorting & Resizing Interaktif: Drag & drop posisi tree menggunakan handle `:::`, geser posisi dengan `<` dan `>`, bawa ke posisi pertama dengan `[1st]`, dan tarik garis splitter resizer untuk mengatur ukuran panel.

#### Skenario Penggunaan
* Navigasi Monorepo: Buka `packages/core` di Kolom 1 sambil meninjau `apps/web` di Kolom 2 dan `docs/` di Kolom 3.
* Pengembangan Toolchain: Menjelajahi `script/repo/adapter/` di sisi kiri sambil memantau spesifikasi `brief/` di sisi kanan.
* Eksplorasi Folder Bersarang: Membuka folder yang dalam tanpa kehilangan posisi scroll atau menutup folder lain yang sedang aktif.

---

### 2. Fitur Utama

* Grid Multi-Tree Konkuren: Menampilkan 2 hingga 5+ pohon direktori secara bersamaan dalam satu panel terpadu.
* Split Mode Adaptif: Tumpukan vertikal pada sidebar sempit (< 550px) dan kolom horizontal (>= 550px) pada tab editor, dilengkapi tombol toggle manual `[Split Mode]`.
* Gutter Resizer Interaktif: Ubah ukuran lebar (horizontal) atau tinggi (vertikal) setiap panel secara presisi.
* Drag-and-Drop Sorting (`:::`): Ubah urutan kolom secara visual menggunakan handle drag, atau gunakan tombol navigasi `[<]`, `[>]`, dan `[1st]`.
* Pencarian Real-Time per Panel: Filter file langsung di setiap panel dengan highlight teks dan pembukaan cabang otomatis.
* Auto-Discovery Repositori Git: Dropdown pemilih root untuk beralih ke repositori Git mana pun di dalam workspace.
* Buka File 1-Klik: Klik file langsung membukanya di editor aktif tanpa jeda.

---

### 3. Arsitektur & Wireframe

```text
+------------------------------------------------------------------------------------+
| MULTI-TREE EXPLORER   2 trees   [ 📁 Repos (2/8) ▾ ]  [ ⬚ Focus ]  [+ Add] [↻] [⚙]  |
+------------------------------------------------------------------------------------+
|                                                                                    |
| +------------------------------------+  +------------------------------------+     |
| | ::: #1: all-lads-tool   [1st][<][>]✕|  | ::: #2: pakcli-plugin   [1st][<][>]✕|     |
| | [▶] [ Filter files...    | Aa|ab|.*]|  | [▼] [ Filter files...    | Aa|ab|.*]|     |
| |                                     |  |     [ 📁 Switch Root ▾ ] [📁] [↻]    |     |
| +------------------------------------+  +------------------------------------+     |
| | v script/                          |  | v src/                             |     |
| |   > file/                          |  |   > commands/                      |     |
| |   > repo/                          |  |   extension.ts                     |     |
| |   _mainmenu.ps1                    |  |   types.ts                         |     |
| | v skill/                           |  | package.json                       |     |
| |   asci-tree.md                     |  | tsconfig.json                      |     |
+------------------------------------------------------------------------------------+
```

---

### 4. Kompilasi, Pembuatan Paket, & Instalasi

#### Lokasi Output: `out/` dan `.vsix`
* `npm run compile` mengompilasi TypeScript (`src/*.ts`) menjadi JavaScript di direktori `out/*.js`.
* `npm run package` menghasilkan paket instalasi produksi di `./out/multiple-treepane-1.1.1.vsix`.

#### Langkah 1: Kompilasi TypeScript
```bash
npm run compile
```

#### Langkah 2: Paketkan ke `.vsix`
```bash
npm run package
```
*Hasil:* Berkas `./out/multiple-treepane-1.1.1.vsix` akan terbentuk.

#### Langkah 3: Pasang di VS Code atau Antigravity IDE

**Metode A: Melalui Menu UI**
1. Buka VS Code atau Antigravity IDE.
2. Buka menu Extensions (`Ctrl+Shift+X`).
3. Klik tombol menu titik tiga `...` di pojok kanan atas panel Extensions.
4. Pilih **Install from VSIX...**
5. Pilih berkas `./out/multiple-treepane-1.1.1.vsix`.

**Metode B: Melalui Terminal (CLI)**
```bash
# Untuk VS Code:
code --install-extension ./out/multiple-treepane-1.1.1.vsix

# Untuk Antigravity IDE:
antigravity --install-extension ./out/multiple-treepane-1.1.1.vsix
```

**Metode C: Uji Coba Cepat (F5 Debug tanpa VSIX)**
* Buka folder repositori ini di VS Code atau Antigravity IDE.
* Tekan tombol `F5` pada keyboard.
* Jendela baru **Extension Development Host** akan terbuka dan ekstensi langsung aktif untuk diuji.

Panduan teknis dan publikasi ke store dapat dibaca di [GUIDE.md](./GUIDE.md).

---

### 4. Lisensi

Didistribusikan di bawah lisensi terbuka **MIT License**.
