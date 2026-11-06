# Multiple TreePane Explorer for VS Code v1.1.3 (v01-01-03)
works with: Antigravity IDE

> Concurrent multi-repository file tree explorer with adaptive vertical/horizontal splitting, drag-and-drop sorting, clipboard file management (cut/copy/paste), instant file content copy, interactive Git SCM focus, and gutter resizing for VS Code and Google Antigravity IDE.

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
* Adaptive Dual-Host Layout: Automatically stacks as a Vertical Split (`T / T / T`) when docked in the narrow sidepanel/sidebar, and expands as a Horizontal Split (`T | T | T | T | T`) when opened in a wide editor tab with strict 100% full canvas height.
* Interactive Reordering & Resizing: Drag and drop panes via `:::`, shift positions using `<` and `>`, bring any tree to front with `[1st]`, and drag splitter gutters to shrink or expand trees in real time.
* Seamless File Clipboard Engine: Cut (`Ctrl+X`), copy (`Ctrl+C`), and paste (`Ctrl+V`) files across panes or root backgrounds with visual cut dimming (`.tree-node.is-cut`).
* Dual Worktree Content Extraction: Copy entire file text content instantly without opening files via `Alt+C` in multi-pane or native VS Code Explorer context menu.
* Instant Git SCM Focus: Clicking the `GIT` badge on any pane header instantly opens and focuses VS Code's native Source Control sidebar for that specific repository.

#### Example Use Cases
* Monorepo Cross-Referencing: Keep `packages/core` open in Column 1 while editing `apps/web` in Column 2 and `docs/` in Column 3.
* Toolchain & Adapter Development: Browse `script/repo/adapter/` on the left while monitoring `brief/` specifications on the right.
* Deep Directory Scrutiny: Inspect deeply nested folders without losing scroll position or collapsing other active folders.

---

### 2. Features

* Concurrent Multi-Tree Grid: Display 2 to 5+ directory trees simultaneously in one unified cockpit.
* Adaptive Dual-Mode Splitting: Vertical stacking in narrow sidebars (< 550px) and wide horizontal columns (>= 550px) in editor tabs, with manual `[Split Mode]` toggle override.
* Full Canvas Height Fit Invariant: All horizontal split cards stretch to 100% canvas height without shrink-wrapping to file counts.
* Drag & Drop into Terminals: Drag any file, folder, multi-selection, or pane title directly into VS Code Integrated Terminal or external terminals (Windows Terminal, PowerShell, CMD, Bash) with auto-quoting and space-separated path formatting.
* Terminal Context Menu Integration: Right-click actions for "Open in Integrated Terminal", "Send Path to Terminal", and "Copy Path for Terminal".
* Right-Click Cut, Copy & Paste: Complete clipboard operations (`Ctrl+X`, `Ctrl+C`, `Ctrl+V`, `Escape`) across file tree nodes and pane root background with visual cut indicators.
* Copy Selected Content: Extract full text content to system clipboard via multi-pane context menu (`Alt+C`) and VS Code native explorer context menu (`multipleTreePane.copySelectedContent`).
* Interactive Git Badge: Clickable `[GIT]` badge in each pane header revealing and focusing the native VS Code Source Control view.
* Draggable Gutter Resizers: Resize individual pane widths (horizontal) or heights (vertical) with responsive gutter splitters.
* Drag-and-Drop Sorting (`:::`): Reorder tree panes visually using grab handles, or use `[<]`, `[>]`, and `[1st]` buttons.
* Per-Pane Live Filtering: Search and filter file trees with real-time highlighting and auto-expanded matching branches.
* Auto-Discovery of Workspaces & Git Repos: Dropdown selector per pane to switch root directories to any detected Git repository or folder.
* 1-Click Direct File Opening: Clicking any file immediately opens it in the active text editor.
* Octates Version Control & Clean Packaging: Standardized `vXX-XX-XX` naming with dedicated `out/dist/` (compiled code) and `out/vsix/` (packaged artifacts).

---

### 3. Architecture & Wireframe

```text
+------------------------------------------------------------------------------------+
| MULTI-TREE EXPLORER   2 trees   [ 📁 Repos (2/8) ▾ ]  [ ⬚ Focus ]  [+ Add] [↻] [⚙]  |
+------------------------------------------------------------------------------------+
|                                                                                    |
| +------------------------------------+  +------------------------------------+     |
| | ::: #1: all-lads-tool [GIT] [1st]✕ |  | ::: #2: pakcli-plugin [GIT] [1st]✕ |     |
| |                                 ▲  |  |                                    |     |
| |         Click opens SCM ────────┘  |  |                                    |     |
| | [▶] [ Filter files...    | Aa|ab|.*]|  | [▼] [ Filter files...    | Aa|ab|.*]|     |
| |                                     |  |     [ 📁 Switch Root ▾ ] [📁] [↻]    |     |
| +------------------------------------+  +------------------------------------+     |
| | v script/                          |  | v src/                             |     |
| |   > file/                          |  |   > commands/                      |     |
| |   > repo/                          |  |   extension.ts                     |     |
| |   _mainmenu.ps1                    |  |   types.ts                         |     |
| | v skill/                           |  | package.json                       |     |
| |   asci-tree.md                     |  | tsconfig.json                      |     |
| |                                    |  |                                    |     |
| | (Stretches 100% canvas height)     |  | (Stretches 100% canvas height)     |     |
+------------------------------------------------------------------------------------+
```

---

### 4. Build, Package & Installation

#### Output Notice: `out/` structure (`dist/` & `vsix/`)
* `npm run compile` compiles TypeScript (`src/*.ts`) into JavaScript (`out/dist/*.js`).
* `npm run package` creates the production installer in `./out/vsix/multiple-treepane-v01-01-03.vsix` (and dot alias `multiple-treepane-v01.01.03.vsix`).

#### Step 1: Compile TypeScript
```bash
npm run compile
```

#### Step 2: Package into `.vsix`
```bash
npm run package
```
*Output:* `./out/vsix/multiple-treepane-v01-01-03.vsix` created.

#### Step 3: Install in VS Code or Antigravity IDE

**Method A: Graphical Interface (GUI)**
1. Open VS Code or Antigravity IDE.
2. Open the Extensions view (`Ctrl+Shift+X`).
3. Click the `...` (Views and More Actions) menu at the top-right of the Extensions pane.
4. Select **Install from VSIX...**
5. Select `./out/vsix/multiple-treepane-v01-01-03.vsix`.

**Method B: Command Line (CLI)**
```bash
# For VS Code:
code --install-extension ./out/vsix/multiple-treepane-v01-01-03.vsix

# For Antigravity IDE:
antigravity --install-extension ./out/vsix/multiple-treepane-v01-01-03.vsix
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
* Layout Adaptif Dual-Host: Otomatis tumpukan vertikal (`T / T / T`) saat berada di sidepanel/sidebar sempit, dan otomatis kolom horizontal (`T | T | T | T | T`) saat dibuka sebagai tab editor penuh dengan peregangan 100% tinggi kanvas kanonikal.
* Sorting & Resizing Interaktif: Drag & drop posisi tree menggunakan handle `:::`, geser posisi dengan `<` dan `>`, bawa ke posisi pertama dengan `[1st]`, dan tarik garis splitter resizer untuk mengatur ukuran panel.
* Clipboard File Terintegrasi: Cut (`Ctrl+X`), copy (`Ctrl+C`), dan paste (`Ctrl+V`) berkas/folder antar panel maupun pada latar root panel dengan efek visual redup (`.tree-node.is-cut`).
* Salin Konten Berkas Instan: Salin seluruh isi teks file langsung ke clipboard sistem tanpa perlu membuka tab editor melalui shortcut `Alt+C` atau klik kanan menu konteks native VS Code Explorer.
* Fokus SCM Git Instan: Klik badge `GIT` pada header panel langsung membuka dan memfokuskan sidebar Source Control native VS Code untuk repositori terkait.

#### Skenario Penggunaan
* Navigasi Monorepo: Buka `packages/core` di Kolom 1 sambil meninjau `apps/web` di Kolom 2 dan `docs/` di Kolom 3.
* Pengembangan Toolchain: Menjelajahi `script/repo/adapter/` di sisi kiri sambil memantau spesifikasi `brief/` di sisi kanan.
* Eksplorasi Folder Bersarang: Membuka folder yang dalam tanpa kehilangan posisi scroll atau menutup folder lain yang sedang aktif.

---

### 2. Fitur Utama

* Grid Multi-Tree Konkuren: Menampilkan 2 hingga 5+ pohon direktori secara bersamaan dalam satu panel terpadu.
* Split Mode Adaptif: Tumpukan vertikal pada sidebar sempit (< 550px) dan kolom horizontal (>= 550px) pada tab editor, dilengkapi tombol toggle manual `[Split Mode]`.
* Invarian Tinggi Kanvas 100%: Seluruh panel pada split horizontal meregang penuh memenuhi canvas tanpa menciut mengikuti jumlah file.
* Drag & Drop ke Terminal: Tarik dan lepas berkas, folder, seleksi multi-item, atau judul pane langsung ke terminal terintegrasi VS Code maupun terminal eksternal OS (Windows Terminal, PowerShell, CMD, Bash) dengan pemformatan path dan kutip otomatis.
* Integrasi Menu Konteks Terminal: Tindakan klik kanan "Open in Integrated Terminal", "Send Path to Terminal", dan "Copy Path for Terminal".
* Klik-Kanan Cut, Copy & Paste: Operasi clipboard berkas lengkap (`Ctrl+X`, `Ctrl+C`, `Ctrl+V`, `Escape`) pada node direktori dan area kosong panel.
* Salin Konten Terpilih (Copy Selected Content): Akses ganda dari menu konteks panel webview (`Alt+C`) dan menu klik kanan native VS Code (`multipleTreePane.copySelectedContent`).
* Badge Git Interaktif: Badge `[GIT]` di header sub-panel yang dapat diklik untuk membuka panel Source Control native.
* Gutter Resizer Interaktif: Ubah ukuran lebar (horizontal) atau tinggi (vertikal) setiap panel secara presisi.
* Drag-and-Drop Sorting (`:::`): Ubah urutan kolom secara visual menggunakan handle drag, atau gunakan tombol navigasi `[<]`, `[>]`, dan `[1st]`.
* Pencarian Real-Time per Panel: Filter file langsung di setiap panel dengan highlight teks dan pembukaan cabang otomatis.
* Auto-Discovery Repositori Git: Dropdown pemilih root untuk beralih ke repositori Git mana pun di dalam workspace.
* Buka File 1-Klik: Klik file langsung membukanya di editor aktif tanpa jeda.
* Penamaan Rilis Octates & Separasi `out/`: Format standar `vXX-XX-XX` dengan pemisahan direktori `out/dist/` (kode hasil kompilasi) dan `out/vsix/` (paket installer .vsix).

---

### 3. Arsitektur & Wireframe

```text
+------------------------------------------------------------------------------------+
| MULTI-TREE EXPLORER   2 trees   [ 📁 Repos (2/8) ▾ ]  [ ⬚ Focus ]  [+ Add] [↻] [⚙]  |
+------------------------------------------------------------------------------------+
|                                                                                    |
| +------------------------------------+  +------------------------------------+     |
| | ::: #1: all-lads-tool [GIT] [1st]✕ |  | ::: #2: pakcli-plugin [GIT] [1st]✕ |     |
| |                                 ▲  |  |                                    |     |
| |         Klik membuka SCM ───────┘  |  |                                    |     |
| | [▶] [ Filter files...    | Aa|ab|.*]|  | [▼] [ Filter files...    | Aa|ab|.*]|     |
| |                                     |  |     [ 📁 Switch Root ▾ ] [📁] [↻]    |     |
| +------------------------------------+  +------------------------------------+     |
| | v script/                          |  | v src/                             |     |
| |   > file/                          |  |   > commands/                      |     |
| |   > repo/                          |  |   extension.ts                     |     |
| |   _mainmenu.ps1                    |  |   types.ts                         |     |
| | v skill/                           |  | package.json                       |     |
| |   asci-tree.md                     |  | tsconfig.json                      |     |
| |                                    |  |                                    |     |
| | (Meregang 100% tinggi kanvas)      |  | (Meregang 100% tinggi kanvas)      |     |
+------------------------------------------------------------------------------------+
```

---

### 4. Kompilasi, Pembuatan Paket, & Instalasi

#### Lokasi Output: Struktur `out/` (`dist/` & `vsix/`)
* `npm run compile` mengompilasi TypeScript (`src/*.ts`) menjadi JavaScript di direktori `out/dist/*.js`.
* `npm run package` menghasilkan paket instalasi produksi di `./out/vsix/multiple-treepane-v01-01-03.vsix` (dan alias dot `multiple-treepane-v01.01.03.vsix`).

#### Langkah 1: Kompilasi TypeScript
```bash
npm run compile
```

#### Langkah 2: Paketkan ke `.vsix`
```bash
npm run package
```
*Hasil:* Berkas `./out/vsix/multiple-treepane-v01-01-03.vsix` akan terbentuk.

#### Langkah 3: Pasang di VS Code atau Antigravity IDE

**Metode A: Melalui Menu UI**
1. Buka VS Code atau Antigravity IDE.
2. Buka menu Extensions (`Ctrl+Shift+X`).
3. Klik tombol menu titik tiga `...` di pojok kanan atas panel Extensions.
4. Pilih **Install from VSIX...**
5. Pilih berkas `./out/vsix/multiple-treepane-v01-01-03.vsix`.

**Metode B: Melalui Terminal (CLI)**
```bash
# Untuk VS Code:
code --install-extension ./out/vsix/multiple-treepane-v01-01-03.vsix

# Untuk Antigravity IDE:
antigravity --install-extension ./out/vsix/multiple-treepane-v01-01-03.vsix
```

**Metode C: Uji Coba Cepat (F5 Debug tanpa VSIX)**
* Buka folder repositori ini di VS Code atau Antigravity IDE.
* Tekan tombol `F5` pada keyboard.
* Jendela baru **Extension Development Host** akan terbuka dan ekstensi langsung aktif untuk diuji.

Panduan teknis dan publikasi ke store dapat dibaca di [GUIDE.md](./GUIDE.md).

---

### 4. Lisensi

Didistribusikan di bawah lisensi terbuka **MIT License**.
