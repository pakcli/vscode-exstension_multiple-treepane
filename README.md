# Multiple TreePane Explorer for VS Code v1.1.6 (v01-01-06)
works with: Antigravity IDE

> Concurrent multi-repository file tree explorer with full native explorer UI/UX parity, side-by-side file diffing, Git status decorations, keyboard navigation, hardware pointer capture gutter resizing, live reactive file system watchers, adaptive vertical/horizontal splitting, and clipboard file management for VS Code and Google Antigravity IDE.

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
* Full Native Explorer Parity & Diffing: Compare files across disparate trees (`vscode.diff`), open to the side (`Ctrl+Enter`), scope folder searches (`Find in Folder...`), duplicate files, and safely move items to Trash (`Delete`).
* Live Git Status Indicators: Real-time badges (`M`, `U`, `A`, `D`, `R`) and theme-colored file labels directly reflecting Git working tree state.
* Comprehensive Keyboard Navigation: Navigate visible nodes (`ArrowUp`/`ArrowDown`), toggle or step into directories (`ArrowRight`/`ArrowLeft`), open files (`Enter`), open beside (`Ctrl+Enter`), and inline rename (`F2`).
* Adaptive Dual-Host Layout: Automatically stacks as a Vertical Split (`T / T / T`) when docked in the narrow sidepanel/sidebar, and expands as a Horizontal Split (`T | T | T | T | T`) when opened in a wide editor tab with strict 100% full canvas height.
* Interactive Reordering & Resizing: Drag and drop panes via `:::`, shift positions using `<` and `>`, bring any tree to front with `[1st]`, and drag splitter gutters to shrink or expand trees in real time.
* Seamless File Clipboard Engine: Cut (`Ctrl+X`), copy (`Ctrl+C`), and paste (`Ctrl+V`) files across panes or root backgrounds with visual cut dimming (`.tree-node.is-cut`).
* Dual Worktree Content Extraction: Copy entire file text content instantly without opening files via `Alt+C` in multi-pane or native VS Code Explorer context menu.
* Instant Git SCM Focus: Clicking the `GIT` badge on any pane header instantly opens and focuses VS Code's native Source Control sidebar for that specific repository.

#### Example Use Cases
* Monorepo Cross-Referencing: Keep `packages/core` open in Column 1 while editing `apps/web` in Column 2 and `docs/` in Column 3.
* Multi-Branch or Cross-File Diffing: Select a baseline file in Pane 1 and compare it against a refactored file in Pane 2 via native `vscode.diff`.
* Toolchain & Adapter Development: Browse `script/repo/adapter/` on the left while monitoring `brief/` specifications on the right.
* Deep Directory Scrutiny: Inspect deeply nested folders without losing scroll position or collapsing other active folders.

---

### 2. Features

* Concurrent Multi-Tree Grid: Display 2 to 5+ directory trees simultaneously in one unified cockpit.
* Native Explorer Parity Actions: Right-click options for "Open to the Side" (`Ctrl+Enter`), "Select for Compare" and "Compare with Selected" (`vscode.diff`), "Find in Folder..." (`workbench.action.findInFiles`), "Duplicate", and "Delete (Move to Trash)".
* Live Git File Status Badges: Visual badges (`M` Modified, `U` Untracked, `A` Added, `D` Deleted, `R` Renamed) and official VS Code theme color highlights matching working tree states.
* Complete Keyboard Navigation: Full directional navigation (`ArrowUp`/`ArrowDown` across visible nodes, `ArrowRight` to expand or enter child, `ArrowLeft` to collapse or jump to parent, `Enter` to open, `Ctrl+Enter` to open beside, `F2` to rename, `Delete` to move to trash).
* Visual Tree Indentation Guidelines: Subtle vertical indentation guides matching `--vscode-tree-indentGuidesStroke` for crystal clear hierarchy tracking.
* Reactive File System Watcher: Automatically tracks all active repository roots via `PaneWatcherManager` and detects file creations, deletions, and modifications in real time without manual refreshes.
* Debounced 150ms Burst Protection: Coalesces high-frequency disk writes (e.g. `npm install`, `git checkout`, batch copy) into single unified refreshes.
* Non-Destructive Live Tree Patching: Updates changed directory trees dynamically while preserving open folder expansion states, active selections, and scroll positions.
* Direct New File & New Folder Creation: Right-click context menu options ("New File...", "New Folder...") on tree nodes and pane canvas backgrounds for instant inline creation and immediate file opening.
* Adaptive Dual-Mode Splitting: Vertical stacking in narrow sidebars (< 550px) and wide horizontal columns (>= 550px) in editor tabs, with manual `[Split Mode]` toggle override.
* Full Canvas Height Fit Invariant: All horizontal split cards stretch to 100% canvas height without shrink-wrapping to file counts.
* Drag & Drop into Terminals: Drag any file, folder, multi-selection, or pane title directly into VS Code Integrated Terminal or external terminals (Windows Terminal, PowerShell, CMD, Bash) with auto-quoting and space-separated path formatting.
* Terminal Context Menu Integration: Right-click actions for "Open in Integrated Terminal", "Send Path to Terminal", and "Copy Path for Terminal".
* Right-Click Cut, Copy & Paste: Complete clipboard operations (`Ctrl+X`, `Ctrl+C`, `Ctrl+V`, `Escape`) across file tree nodes and pane root background with visual cut indicators.
* Copy Selected Content: Extract full text content to system clipboard via multi-pane context menu (`Alt+C`) and VS Code native explorer context menu (`multipleTreePane.copySelectedContent`).
* Interactive Git Badge: Clickable `[GIT]` badge in each pane header revealing and focusing the native VS Code Source Control view.
* Draggable Gutter Resizers with Pointer Capture: Resize individual pane widths (horizontal) or heights (vertical) with responsive gutter splitters powered by W3C `setPointerCapture`—eliminating stuck resize cursors when dragging outside the webview.
* Universal Interaction Failsafe: Built-in escape hatches for `window.onblur`, `document.onmouseleave`, and `Escape` key, plus an automatic 3.5s watchdog timer to prevent frozen or uninteractable panel states.
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
* `npm run package` creates the production installer in `./out/vsix/multiple-treepane-v01-01-06.vsix` (and dot alias `multiple-treepane-v01.01.06.vsix`).

#### Step 1: Compile TypeScript
```bash
npm run compile
```

#### Step 2: Package into `.vsix`
```bash
npm run package
```
*Output:* `./out/vsix/multiple-treepane-v01-01-06.vsix` created.

#### Step 3: Install in VS Code or Antigravity IDE

**Method A: Graphical Interface (GUI)**
1. Open VS Code or Antigravity IDE.
2. Open the Extensions view (`Ctrl+Shift+X`).
3. Click the `...` (Views and More Actions) menu at the top-right of the Extensions pane.
4. Select **Install from VSIX...**
5. Select `./out/vsix/multiple-treepane-v01-01-06.vsix`.

**Method B: Command Line (CLI)**
```bash
# For VS Code:
code --install-extension ./out/vsix/multiple-treepane-v01-01-06.vsix

# For Antigravity IDE:
antigravity --install-extension ./out/vsix/multiple-treepane-v01-01-06.vsix
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
* Paritas Penuh Explorer Native & Diffing: Komparasi berkas antar tree (`vscode.diff`), buka berkas di samping (`Ctrl+Enter`), cakupan pencarian folder (`Find in Folder...`), duplikasi berkas, dan hapus aman ke Recycle Bin/Trash (`Delete`).
* Indikator Status Git Real-Time: Badge visual status (`M`, `U`, `A`, `D`, `R`) serta pewarnaan label berkas sesuai token tema resmi VS Code.
* Navigasi Keyboard Komprehensif: Navigasi node terlihat (`ArrowUp`/`ArrowDown`), buka atau masuk folder (`ArrowRight`/`ArrowLeft`), buka berkas (`Enter`), buka di samping (`Ctrl+Enter`), ganti nama inline (`F2`), dan hapus ke tempat sampah (`Delete`).
* Layout Adaptif Dual-Host: Otomatis tumpukan vertikal (`T / T / T`) saat berada di sidepanel/sidebar sempit, dan otomatis kolom horizontal (`T | T | T | T | T`) saat dibuka sebagai tab editor penuh dengan peregangan 100% tinggi kanvas kanonikal.
* Sorting & Resizing Interaktif: Drag & drop posisi tree menggunakan handle `:::`, geser posisi dengan `<` dan `>`, bawa ke posisi pertama dengan `[1st]`, dan tarik garis splitter resizer untuk mengatur ukuran panel secara responsif dengan pointer capture.
* Clipboard File Terintegrasi: Cut (`Ctrl+X`), copy (`Ctrl+C`), dan paste (`Ctrl+V`) berkas/folder antar panel maupun pada latar root panel dengan efek visual redup (`.tree-node.is-cut`).
* Salin Konten Berkas Instan: Salin seluruh isi teks file langsung ke clipboard sistem tanpa perlu membuka tab editor melalui shortcut `Alt+C` atau klik kanan menu konteks native VS Code Explorer.
* Fokus SCM Git Instan: Klik badge `GIT` pada header panel langsung membuka dan memfokuskan sidebar Source Control native VS Code untuk repositori terkait.

#### Skenario Penggunaan
* Navigasi Monorepo: Buka `packages/core` di Kolom 1 sambil meninjau `apps/web` di Kolom 2 dan `docs/` di Kolom 3.
* Komparasi Berkas Lintas Panel: Pilih berkas acuan di Panel 1 lalu bandingkan dengan berkas hasil refactor di Panel 2 melalui diffing bawaan `vscode.diff`.
* Pengembangan Toolchain: Menjelajahi `script/repo/adapter/` di sisi kiri sambil memantau spesifikasi `brief/` di sisi kanan.
* Eksplorasi Folder Bersarang: Membuka folder yang dalam tanpa kehilangan posisi scroll atau menutup folder lain yang sedang aktif.

---

### 2. Fitur Utama

* Grid Multi-Tree Konkuren: Menampilkan 2 hingga 5+ pohon direktori secara bersamaan dalam satu panel terpadu.
* Aksi Paritas Native Explorer: Menu klik kanan untuk "Open to the Side" (`Ctrl+Enter`), "Select for Compare" & "Compare with Selected" (`vscode.diff`), "Find in Folder..." (`workbench.action.findInFiles`), "Duplicate", serta "Delete (Move to Trash)".
* Badge Status File Git Real-Time: Indikator visual badge (`M` Modified, `U` Untracked, `A` Added, `D` Deleted, `R` Renamed) serta pewarnaan label teks sesuai status Git working tree.
* Navigasi Keyboard Lengkap: Kendali keyboard terarah (`ArrowUp`/`ArrowDown` untuk memilih node terlihat, `ArrowRight` untuk memperluas cabang atau masuk ke anak folder, `ArrowLeft` untuk menutup folder atau melompat ke induk, `Enter` untuk membuka, `Ctrl+Enter` untuk membuka di samping, `F2` ganti nama, `Delete` hapus ke tempat sampah).
* Garis Panduan Indentasi Visual: Panduan garis vertikal indentasi pohon sesuai `--vscode-tree-indentGuidesStroke` untuk melacak hierarki folder bersarang secara jelas.
* File System Watcher Reaktif: Memantau seluruh root repositori aktif secara otomatis via `PaneWatcherManager` dan mendeteksi pembuatan berkas baru, perubahan isi, serta penghapusan secara real-time tanpa perlu klik refresh manual.
* Proteksi Burst Debounce 150ms: Menggabungkan operasi penulisan disk beruntun cepat (`npm install`, `git checkout`, batch copy) menjadi satu pembaruan pohon tunggal yang mulus.
* Pembaruan Non-Destruktif: Memperbarui pohon direktori tanpa menutup folder yang terbuka (`expanded`), menjaga fokus seleksi, dan mempertahankan posisi scroll pengguna.
* Pembuatan File & Folder Langsung: Opsi klik kanan ("New File...", "New Folder...") pada node direktori dan latar canvas pane untuk pembuatan instan dan langsung membuka file di editor.
* Split Mode Adaptif: Tumpukan vertikal pada sidebar sempit (< 550px) dan kolom horizontal (>= 550px) pada tab editor, dilengkapi tombol toggle manual `[Split Mode]`.
* Invarian Tinggi Kanvas 100%: Seluruh panel pada split horizontal meregang penuh memenuhi canvas tanpa menciut mengikuti jumlah file.
* Drag & Drop ke Terminal: Tarik dan lepas berkas, folder, seleksi multi-item, atau judul pane langsung ke terminal terintegrasi VS Code maupun terminal eksternal OS (Windows Terminal, PowerShell, CMD, Bash) dengan pemformatan path dan kutip otomatis.
* Integrasi Menu Konteks Terminal: Tindakan klik kanan "Open in Integrated Terminal", "Send Path to Terminal", dan "Copy Path for Terminal".
* Klik-Kanan Cut, Copy & Paste: Operasi clipboard berkas lengkap (`Ctrl+X`, `Ctrl+C`, `Ctrl+V`, `Escape`) pada node direktori dan area kosong panel.
* Salin Konten Terpilih (Copy Selected Content): Akses ganda dari menu konteks panel webview (`Alt+C`) dan menu klik kanan native VS Code (`multipleTreePane.copySelectedContent`).
* Badge Git Interaktif: Badge `[GIT]` di header sub-panel yang dapat diklik untuk membuka panel Source Control native.
* Gutter Resizer dengan Pointer Capture: Ubah ukuran lebar (horizontal) atau tinggi (vertikal) setiap panel dengan teknologi W3C `setPointerCapture`—menghilangkan bug kursor macet saat mouse dilepas di luar webview.
* Failsafe Interaksi Universal: Sistem pemulihan otomatis via `window.onblur`, `document.onmouseleave`, tombol `Escape`, dan watchdog timer 3.5 detik untuk mencegah panel membeku atau tidak dapat diklik.
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
* `npm run package` menghasilkan paket instalasi produksi di `./out/vsix/multiple-treepane-v01-01-06.vsix` (dan alias dot `multiple-treepane-v01.01.06.vsix`).

#### Langkah 1: Kompilasi TypeScript
```bash
npm run compile
```

#### Langkah 2: Paketkan ke `.vsix`
```bash
npm run package
```
*Hasil:* Berkas `./out/vsix/multiple-treepane-v01-01-06.vsix` akan terbentuk.

#### Langkah 3: Pasang di VS Code atau Antigravity IDE

**Metode A: Melalui Menu UI**
1. Buka VS Code atau Antigravity IDE.
2. Buka menu Extensions (`Ctrl+Shift+X`).
3. Klik tombol menu titik tiga `...` di pojok kanan atas panel Extensions.
4. Pilih **Install from VSIX...**
5. Pilih berkas `./out/vsix/multiple-treepane-v01-01-06.vsix`.

**Metode B: Melalui Terminal (CLI)**
```bash
# Untuk VS Code:
code --install-extension ./out/vsix/multiple-treepane-v01-01-06.vsix

# Untuk Antigravity IDE:
antigravity --install-extension ./out/vsix/multiple-treepane-v01-01-06.vsix
```

**Metode C: Uji Coba Cepat (F5 Debug tanpa VSIX)**
* Buka folder repositori ini di VS Code atau Antigravity IDE.
* Tekan tombol `F5` pada keyboard.
* Jendela baru **Extension Development Host** akan terbuka dan ekstensi langsung aktif untuk diuji.

Panduan teknis dan publikasi ke store dapat dibaca di [GUIDE.md](./GUIDE.md).

---

### 5. Lisensi

Didistribusikan di bawah lisensi terbuka **MIT License**.
