---
title: Multi-Column Side-by-Side Tree Explorer Architecture
version: v01-01-01
status: proposed
dependencies:
  - "[[modular-architecture-standard]]"
  - "[[zero-hardcoded-variables]]"
  - "[[asci-tree-codeblock-standard]]"
  - "[[cross-os-zero-localhost]]"
---

# Brief v01-01-01: Multi-Column Side-by-Side Tree Explorer (`T | T | T | T | T`)

## Status
- **Status**: Requirement Specification & Architecture Brief
- **Version**: v01-01-01
- **Scope**: Multi-Column Horizontal File Tree Layout in a Single Workspace Window

---

## 1. Problem Statement

Dalam struktur monorepo atau workspace dengan banyak sub-proyek (seperti `E:\proj` yang memuat `all-lads-tool`, `obsidian-plugin_*`, `quartz`, `web-app_*`), panel default File Explorer di VS Code memiliki keterbatasan fatal:
1. **Monolithic Vertical Sidebar**: Seluruh folder bertumpuk dalam satu kolom sempit vertikal.
2. **Scroll Fatigue & State Loss**: Membuka subfolder yang dalam (misal `script/repo/adapter/`) memaksa developer melakukan scroll ratusan baris ke atas dan ke bawah untuk berpindah ke folder lain (seperti `skill/` atau `docs/`).
3. **Zero Horizontal Tree Concurrency**: VS Code secara native hanya menyediakan 1 panel primary tree di sisi kiri dan 1 secondary sidebar di sisi kanan, tidak mampu menampilkan 4 hingga 5 pohon direktori berjajar secara horizontal.

---

## 2. Target User Experience (UX / Wireframe)

Developer menginginkan antarmuka **Multi-Column Horizontal Tree Layout** dalam 1 jendela yang sama, di mana 4–5 folder berbeda dapat dilihat dan dijelajahi secara berdampingan tanpa saling menutupi:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        VS CODE MAIN WINDOW (SINGLE WINDOW)                             │
├────────────────┬────────────────┬────────────────┬────────────────┬───────────────────┤
│    TREE #1     │    TREE #2     │    TREE #3     │    TREE #4     │      TREE #5      │
│  [Scope: Repo] │ [Scope: Skill] │  [Scope: File] │  [Scope: Docs] │   [Scope: Web]    │
├────────────────┼────────────────┼────────────────┼────────────────┼───────────────────┤
│ ⌵ script/repo  │ ⌵ skill/       │ ⌵ script/file  │ ⌵ docs/        │ ⌵ web-app/        │
│   > adapter/   │   📄 rules.md  │   > adapter/   │   > repo/      │   > src/          │
│   📄 git-mng   │   📄 asci.md   │   📄 dry-rn.ps1│   > file/      │   📄 app.ts       │
│   📄 branch.ps1│   📄 commit.md │   📄 rename.ps1│   📄 guide.md  │   📄 index.html   │
│                │                │                │                │                   │
│ (Scroll Pos A) │ (Scroll Pos B) │ (Scroll Pos C) │ (Scroll Pos D) │ (Scroll Pos E)    │
└────────────────┴────────────────┴────────────────┴────────────────┴───────────────────┘
```

### Invariants:
1. **Independent Scroll & Expansion**: Tiap kolom memiliki status *expanded/collapsed* dan posisi scroll masing-masing.
2. **Single Window Invariant**: Tidak membuka 5 jendela VS Code terpisah (`New Window`), melainkan 1 jendela terintegrasi.
3. **Direct File Activation**: Mengklik file di kolom mana pun langsung membuka file tersebut di editor target.

---

## 3. Solution Pathways & Implementation Options

### Pathway A: Extension Webview Tabs in Split Editor Groups (Immediate)
- **Mekanisme**: Memanfaatkan ekstensi file explorer berbasis Webview Tab (`Simple File Explorer` atau `VSCode File Explorer`).
- **Eksekusi**:
  1. Split Editor Layout menjadi 4 atau 5 kolom (`View > Editor Layout > 5 Columns` atau `Ctrl + \`).
  2. Buka tab explorer di masing-masing kolom dengan target direktori yang spesifik.
  3. Mengunci tab (*pin*) agar tidak tertutup saat membuka file.

### Pathway B: Cascading Miller Columns ("Breadcrumbs View")
- **Mekanisme**: Mengadopsi arsitektur *Miller Columns* (seperti macOS Finder Column View atau file manager Ranger).
- **Eksekusi**:
  - Menggunakan ekstensi `sandipchitale.vscode-breadcrumbs-alt`.
  - Mengklik folder tingkat 1 membuka folder tingkat 2 di kolom sebelah kanan, dan seterusnya hingga 5 tingkat kolom horizontal.

### Pathway C: Custom Dedicated Extension (Native TreeView in Grid)
- **Mekanisme**: Membangun ekstensi internal `all-lads-tool` berbasis Webview Grid.
- **Komponen**:
  - 1 file `panel.html` yang merender CSS Grid 5 kolom: `grid-template-columns: repeat(5, 1fr)`.
  - Tiap kolom merender tree dinamis dari direktori target via VS Code FileSystem API (`vscode.workspace.fs`).
  - Mendukung drag & drop antar-kolom dan filter pencarian mandiri di tiap kolom.
