(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

  // Suppress VS Code's native Electron Cut/Copy/Paste context menu injection
  document.documentElement.setAttribute('data-vscode-context', JSON.stringify({ preventDefaultContextMenuItems: true }));
  document.body.setAttribute('data-vscode-context', JSON.stringify({ preventDefaultContextMenuItems: true }));

  let isNodeDragging = false;
  let currentDragSource = null;
  let selectedPaths = new Set();
  let lastAnchorNode = null; // { path, paneId, nodeEl }
  let pendingSoleSelectionPath = null;
  let handledModifierInMouseDown = false;

  function updateSelectionUI() {
    document.querySelectorAll('.tree-node').forEach((el) => {
      const p = el.dataset.path;
      if (selectedPaths.has(p)) {
        el.classList.add('selected');
        el.classList.add('active');
      } else {
        el.classList.remove('selected');
        el.classList.remove('active');
      }
    });
  }

  function clearSelection() {
    selectedPaths.clear();
    lastAnchorNode = null;
    pendingSoleSelectionPath = null;
    updateSelectionUI();
  }

  let state = {
    panes: [],
    availableRepos: [],
    layout: document.body.dataset.layout || 'horizontal',
    viewMode: 'split', // 'split' or 'focus'
    repoFilterMode: 'repoOnly', // 'repoOnly' or 'all'
    activePaneId: null, // tracks latest active repo pane
    userForcedLayout: false,
    trees: {},
    resizing: null
  };

  const container = document.getElementById('panesContainer');
  const badge = document.getElementById('paneCountBadge');
  const reposDropdownWrapper = document.getElementById('reposDropdownWrapper');
  const btnToggleRepoDropdown = document.getElementById('btnToggleRepoDropdown');
  const reposDropdownMenu = document.getElementById('reposDropdownMenu');
  const repoDropdownLabel = document.getElementById('repoDropdownLabel');
  const btnFilterReposOnly = document.getElementById('btnFilterReposOnly');
  const btnFilterAllTypes = document.getElementById('btnFilterAllTypes');
  const reposMenuCountLabel = document.getElementById('reposMenuCountLabel');
  const btnShowAllRepos = document.getElementById('btnShowAllRepos');
  const btnHideAllRepos = document.getElementById('btnHideAllRepos');
  const repoChipsList = document.getElementById('repoChipsList');
  const btnToggleViewMode = document.getElementById('btnToggleViewMode');
  const viewModeIcon = document.getElementById('viewModeIcon');
  const viewModeText = document.getElementById('viewModeText');
  const btnAddPane = document.getElementById('btnAddPane');
  const btnRefreshAll = document.getElementById('btnRefreshAll');
  const btnOpenSettings = document.getElementById('btnOpenSettings');

  // Settings Modal Elements
  const settingsModalBackdrop = document.getElementById('settingsModalBackdrop');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const btnResetSizes = document.getElementById('btnResetSizes');
  const settingsPaneList = document.getElementById('settingsPaneList');

  // ---------------------------------------------------------------------------
  // 1. Extension Host IPC Message Listener
  // ---------------------------------------------------------------------------
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.command) {
      case 'init': {
        state.panes = message.panes || [];
        state.availableRepos = message.availableRepos || [];
        if (!state.userForcedLayout && message.defaultLayout) {
          state.layout = message.defaultLayout;
        }
        updateLayoutClass();
        renderPanes();
        break;
      }

      case 'renderTree': {
        const currentTree = state.trees[message.paneId];
        const expandedPaths = new Set();
        if (currentTree) {
          const collectExpanded = (node) => {
            if (!node) return;
            if (node.isExpanded && node.path) {
              expandedPaths.add(node.path);
            }
            if (node.children) {
              for (const child of node.children) {
                collectExpanded(child);
              }
            }
          };
          collectExpanded(currentTree);
        }

        if (message.tree && expandedPaths.size > 0) {
          const restoreExpanded = (node) => {
            if (!node) return;
            if (expandedPaths.has(node.path)) {
              node.isExpanded = true;
            }
            if (node.children) {
              for (const child of node.children) {
                restoreExpanded(child);
              }
            }
          };
          restoreExpanded(message.tree);
        }

        const contentEl = document.getElementById(`tree_content_${message.paneId}`);
        const prevScrollTop = contentEl ? contentEl.scrollTop : 0;

        state.trees[message.paneId] = message.tree;
        renderPaneTree(message.paneId);

        if (contentEl) {
          contentEl.scrollTop = prevScrollTop;
        }
        break;
      }

      case 'subfolderLoaded': {
        handleSubfolderLoaded(message.paneId, message.folderPath, message.children);
        break;
      }

      case 'paneFolderUpdated': {
        const pane = state.panes.find((p) => p.id === message.paneId);
        if (pane) {
          pane.rootPath = message.newPath;
          pane.name = message.newPath.split('/').pop() || message.newPath;
        }
        state.trees[message.paneId] = message.tree;
        renderPanes();
        break;
      }

      case 'setLayout': {
        state.layout = message.layout;
        state.userForcedLayout = true;
        updateLayoutClass();
        renderPanes(false);
        break;
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Toolbar & Settings Controls
  // ---------------------------------------------------------------------------
  if (btnToggleViewMode) {
    btnToggleViewMode.addEventListener('click', () => {
      state.viewMode = state.viewMode === 'split' ? 'focus' : 'split';
      renderPanes();
      saveState();
    });
  }

  btnAddPane.addEventListener('click', () => {
    vscode.postMessage({ command: 'addPane' });
  });

  btnRefreshAll.addEventListener('click', () => {
    vscode.postMessage({ command: 'ready' });
  });

  // Settings Modal Handlers
  btnOpenSettings.addEventListener('click', () => {
    openSettingsModal();
  });

  btnCloseSettings.addEventListener('click', () => {
    settingsModalBackdrop.style.display = 'none';
  });

  btnSaveSettings.addEventListener('click', () => {
    settingsModalBackdrop.style.display = 'none';
  });

  btnResetSizes.addEventListener('click', () => {
    state.panes.forEach((p) => {
      delete p.size;
    });
    renderPanes();
    saveState();
  });

  function openSettingsModal() {
    const radios = document.querySelectorAll('input[name="settingLayout"]');
    radios.forEach((r) => {
      // @ts-ignore
      r.checked = state.userForcedLayout ? r.value === state.layout : r.value === 'auto';
      r.onchange = () => {
        // @ts-ignore
        if (r.value === 'auto') {
          state.userForcedLayout = false;
        } else {
          // @ts-ignore
          state.layout = r.value;
          state.userForcedLayout = true;
        }
        updateLayoutClass();
        renderPanes(false);
        saveState();
      };
    });

    settingsPaneList.innerHTML = '';
    const visiblePanes = state.panes.filter((p) => !p.isHidden);
    visiblePanes.forEach((p, idx) => {
      const li = document.createElement('li');
      li.className = 'settings-pane-item';
      li.innerHTML = `
        <span><strong>#${idx + 1}</strong>: ${escapeHtml(p.name)}</span>
        <div class="pane-controls">
          <button class="pane-btn btn-first" title="Move to 1st" ${idx === 0 ? 'disabled' : ''}>1st</button>
          <button class="pane-btn btn-arrow" title="Shift Left/Up" ${idx === 0 ? 'disabled' : ''}>&lt;</button>
          <button class="pane-btn btn-arrow" title="Shift Right/Down" ${idx === visiblePanes.length - 1 ? 'disabled' : ''}>&gt;</button>
        </div>
      `;

      li.querySelector('.btn-first').onclick = () => {
        movePaneFirst(p.id);
        openSettingsModal();
      };
      li.querySelectorAll('.btn-arrow')[0].onclick = () => {
        movePaneShift(p.id, 'left');
        openSettingsModal();
      };
      li.querySelectorAll('.btn-arrow')[1].onclick = () => {
        movePaneShift(p.id, 'right');
        openSettingsModal();
      };

      settingsPaneList.appendChild(li);
    });

    settingsModalBackdrop.style.display = 'flex';
  }

  // Adaptive ResizeObserver
  if (window.ResizeObserver) {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (!state.userForcedLayout) {
          const autoLayout = width < 550 ? 'vertical' : 'horizontal';
          if (state.layout !== autoLayout) {
            state.layout = autoLayout;
            updateLayoutClass();
            renderPanes(false);
          }
        }
      }
    });
    ro.observe(container);
  }

  function updateLayoutClass() {
    if (state.viewMode === 'focus') {
      container.className = 'panes-container layout-focus';
    } else {
      container.className = `panes-container layout-${state.layout}`;
    }
    if (state.layout === 'horizontal') {
      container.querySelectorAll('.tree-pane').forEach((el) => {
        // @ts-ignore
        el.style.height = '';
        // @ts-ignore
        el.style.minHeight = '';
        // @ts-ignore
        el.style.maxHeight = '';
      });
    } else {
      container.querySelectorAll('.tree-pane').forEach((el) => {
        // @ts-ignore
        el.style.width = '';
        // @ts-ignore
        el.style.minWidth = '';
        // @ts-ignore
        el.style.maxWidth = '';
      });
    }
  }

  function saveState() {
    vscode.postMessage({
      command: 'savePanesState',
      panes: state.panes,
      layout: state.layout,
      viewMode: state.viewMode,
      activePaneId: state.activePaneId
    });
  }

  // Prevent default webview navigation on unhandled drag/drop
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
  });

  // ---------------------------------------------------------------------------
  // 3. Reordering & Sorting Logic
  // ---------------------------------------------------------------------------
  function movePaneFirst(paneId) {
    const idx = state.panes.findIndex((p) => p.id === paneId);
    if (idx > 0) {
      const [moved] = state.panes.splice(idx, 1);
      state.panes.unshift(moved);
      renderPanes();
      saveState();
    }
  }

  function movePaneShift(paneId, direction) {
    const idx = state.panes.findIndex((p) => p.id === paneId);
    if (idx !== -1) {
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx >= 0 && targetIdx < state.panes.length) {
        const [moved] = state.panes.splice(idx, 1);
        state.panes.splice(targetIdx, 0, moved);
        renderPanes();
        saveState();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Repositories Dropdown Popover & Filter Tabs
  // ---------------------------------------------------------------------------
  if (btnToggleRepoDropdown && reposDropdownMenu) {
    btnToggleRepoDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = reposDropdownMenu.style.display === 'flex';
      reposDropdownMenu.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        renderRepoChips();
      }
    });

    document.addEventListener('click', (e) => {
      // @ts-ignore
      if (reposDropdownWrapper && !reposDropdownWrapper.contains(e.target)) {
        reposDropdownMenu.style.display = 'none';
      }
    });
  }

  if (btnFilterReposOnly && btnFilterAllTypes) {
    btnFilterReposOnly.addEventListener('click', (e) => {
      e.stopPropagation();
      state.repoFilterMode = 'repoOnly';
      btnFilterReposOnly.classList.add('active');
      btnFilterAllTypes.classList.remove('active');
      renderRepoChips();
    });

    btnFilterAllTypes.addEventListener('click', (e) => {
      e.stopPropagation();
      state.repoFilterMode = 'all';
      btnFilterAllTypes.classList.add('active');
      btnFilterReposOnly.classList.remove('active');
      renderRepoChips();
    });
  }

  if (btnShowAllRepos) {
    btnShowAllRepos.addEventListener('click', (e) => {
      e.stopPropagation();
      const isRepoOnly = state.repoFilterMode !== 'all';
      const targetRepos = isRepoOnly
        ? state.availableRepos.filter((r) => r.isGit)
        : state.availableRepos;

      targetRepos.forEach((repo) => {
        const existing = state.panes.find((p) => p.rootPath === repo.path);
        if (existing) {
          existing.isHidden = false;
        } else {
          const newPaneId = `pane_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          state.panes.push({
            id: newPaneId,
            name: repo.name,
            rootPath: repo.path,
            filterText: '',
            searchOptions: { matchCase: false, matchWholeWord: false, useRegex: false },
            isCollapsed: false,
            isHidden: false
          });
          vscode.postMessage({
            command: 'requestFolder',
            paneId: newPaneId,
            folderPath: repo.path
          });
        }
      });
      renderRepoChips();
      renderPanes(false);
      saveState();
    });
  }

  if (btnHideAllRepos) {
    btnHideAllRepos.addEventListener('click', (e) => {
      e.stopPropagation();
      const isRepoOnly = state.repoFilterMode !== 'all';
      const targetRepos = isRepoOnly
        ? state.availableRepos.filter((r) => r.isGit)
        : state.availableRepos;

      targetRepos.forEach((repo) => {
        const existing = state.panes.find((p) => p.rootPath === repo.path);
        if (existing) {
          existing.isHidden = true;
        }
      });
      renderRepoChips();
      renderPanes(false);
      saveState();
    });
  }

  function updateRepoDropdownLabel() {
    const isRepoOnly = state.repoFilterMode !== 'all';
    const targetRepos = isRepoOnly
      ? state.availableRepos.filter((r) => r.isGit)
      : state.availableRepos;
    const visibleCount = state.panes.filter((p) => !p.isHidden).length;
    if (repoDropdownLabel) {
      repoDropdownLabel.textContent = isRepoOnly
        ? `Repos (${visibleCount}/${targetRepos.length}) ▾`
        : `All (${visibleCount}/${targetRepos.length}) ▾`;
    }
  }

  function renderRepoChips() {
    if (!repoChipsList) return;
    repoChipsList.innerHTML = '';

    const isRepoOnly = state.repoFilterMode !== 'all';
    const targetRepos = isRepoOnly
      ? state.availableRepos.filter((r) => r.isGit)
      : state.availableRepos;

    const sortedRepos = [...targetRepos].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

    const visibleCount = state.panes.filter((p) => !p.isHidden).length;
    const totalCount = sortedRepos.length;
    if (repoDropdownLabel) {
      repoDropdownLabel.textContent = isRepoOnly
        ? `Repos (${visibleCount}/${totalCount}) ▾`
        : `All (${visibleCount}/${totalCount}) ▾`;
    }

    if (reposMenuCountLabel) {
      reposMenuCountLabel.textContent = isRepoOnly
        ? `Git Repos (${totalCount})`
        : `All Folders (${totalCount})`;
    }

    if (sortedRepos.length === 0) {
      repoChipsList.innerHTML = `<span style="color: var(--text-muted); font-size: 11px; padding: 6px;">No ${isRepoOnly ? 'git repositories' : 'folders'} found.</span>`;
      return;
    }

    sortedRepos.forEach((repo) => {
      const existingPane = state.panes.find((p) => p.rootPath === repo.path);
      const isVisible = existingPane ? !existingPane.isHidden : false;

      const item = document.createElement('label');
      item.className = 'repo-menu-item';
      item.title = repo.path;
      item.innerHTML = `
        <input type="checkbox" ${isVisible ? 'checked' : ''} />
        <span class="repo-name">${escapeHtml(repo.name)}</span>
        ${repo.isGit ? '<span class="repo-badge">GIT</span>' : '<span class="dir-badge">DIR</span>'}
      `;

      const checkbox = item.querySelector('input');
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (existingPane) {
            existingPane.isHidden = false;
          } else {
            const newPaneId = `pane_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            state.panes.push({
              id: newPaneId,
              name: repo.name,
              rootPath: repo.path,
              filterText: '',
              searchOptions: { matchCase: false, matchWholeWord: false, useRegex: false },
              isCollapsed: false,
              isHidden: false
            });
            vscode.postMessage({
              command: 'requestFolder',
              paneId: newPaneId,
              folderPath: repo.path
            });
          }
        } else {
          if (existingPane) {
            existingPane.isHidden = true;
          }
        }
        renderPanes(false);
        updateRepoDropdownLabel();
        saveState();
      });

      repoChipsList.appendChild(item);
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Render Panes & Splitters (Split Mode vs Focus Mode, 2-3 Row Subheader)
  // ---------------------------------------------------------------------------
  function renderPanes(updateDropdown = true) {
    if (updateDropdown) {
      renderRepoChips();
    }

    const visiblePanes = state.panes.filter((p) => !p.isHidden);
    container.innerHTML = '';

    // Update View Mode Toggle Button
    if (viewModeIcon && viewModeText && btnToggleViewMode) {
      if (state.viewMode === 'focus') {
        viewModeIcon.textContent = '▦';
        viewModeText.textContent = 'Split';
        btnToggleViewMode.title = 'Switch to Split Mode (show all repos)';
        btnToggleViewMode.classList.add('btn-primary');
      } else {
        viewModeIcon.textContent = '⬚';
        viewModeText.textContent = 'Focus';
        btnToggleViewMode.title = 'Switch to Focus Mode (focus on latest active repo)';
        btnToggleViewMode.classList.remove('btn-primary');
      }
    }

    if (visiblePanes.length === 0) {
      badge.textContent = '0 trees';
      container.innerHTML = `
        <div class="empty-state">
          <p>No active tree panes.</p>
          <p style="font-size: 11px; margin-top: 4px;">Check any repo in the dropdown above or click below to add a tree.</p>
          <button class="icon-btn btn-primary" style="margin: 12px auto;" onclick="window.addPaneClick()">+ Add Directory Tree</button>
        </div>`;
      return;
    }

    const isFocus = state.viewMode === 'focus';
    let panesToRender = visiblePanes;

    if (isFocus) {
      let focusPane = visiblePanes.find((p) => p.id === state.activePaneId);
      if (!focusPane) {
        focusPane = visiblePanes[0];
        state.activePaneId = focusPane.id;
      }
      panesToRender = [focusPane];
      badge.textContent = '1 focused tree';
      container.className = 'panes-container layout-focus';
    } else {
      badge.textContent = `${visiblePanes.length} tree${visiblePanes.length === 1 ? '' : 's'}`;
      container.className = `panes-container layout-${state.layout}`;
    }

    panesToRender.forEach((pane, index) => {
      pane.searchOptions = pane.searchOptions || {
        matchCase: false,
        matchWholeWord: false,
        useRegex: false
      };

      const paneEl = document.createElement('div');
      paneEl.className = `tree-pane ${pane.isCollapsed && !isFocus ? 'is-collapsed' : ''} ${state.activePaneId === pane.id ? 'is-active-pane' : ''}`;
      paneEl.id = `pane_el_${pane.id}`;
      paneEl.dataset.paneId = pane.id;
      paneEl.dataset.paneIndex = String(index);

      paneEl.addEventListener('click', () => {
        state.activePaneId = pane.id;
      });

      if (!isFocus && pane.size && !pane.isCollapsed) {
        if (state.layout === 'horizontal') {
          paneEl.style.width = `${pane.size}px`;
          paneEl.style.flexBasis = `${pane.size}px`;
          paneEl.style.height = '';
          paneEl.style.minHeight = '';
          paneEl.style.maxHeight = '';
        } else {
          paneEl.style.height = `${pane.size}px`;
          paneEl.style.flexBasis = `${pane.size}px`;
          paneEl.style.width = '';
          paneEl.style.minWidth = '';
          paneEl.style.maxWidth = '';
        }
      } else {
        paneEl.style.height = '';
        paneEl.style.width = '';
        paneEl.style.flexBasis = '';
      }

      let repoOptions = `<option value="">-- Switch Root --</option>`;
      state.availableRepos.forEach((repo) => {
        const isSelected = repo.path === pane.rootPath ? 'selected' : '';
        const tag = repo.isGit ? '[GIT] ' : '';
        repoOptions += `<option value="${repo.path}" ${isSelected}>${tag}${repo.name}</option>`;
      });

      const focusBadgeHtml = isFocus ? '<span class="focus-badge">FOCUSED</span>' : '';

      paneEl.innerHTML = `
        <div class="pane-subheader" id="subheader_${pane.id}">
          <!-- ROW 1: :::, #no, repo name, [1st], [<], [>], [x] -->
          <div class="pane-row-1">
            <div class="row-left">
              <span class="drag-handle" draggable="true" title="Drag to reorder pane">:::</span>
              <span class="pane-index">#${index + 1}</span>
              <span class="pane-title" draggable="true" title="${pane.rootPath} (Drag into terminal or editor)">${escapeHtml(pane.name)}</span>
              ${pane.rootPath.includes('.git') || state.availableRepos.find((r) => r.path === pane.rootPath && r.isGit) ? `<span class="repo-badge btn-git-badge" data-repo-path="${escapeHtml(pane.rootPath)}" title="Open in Source Control (${escapeHtml(pane.name)})">GIT</span>` : ''}
              ${focusBadgeHtml}
            </div>
            <div class="row-right">
              ${!isFocus ? `<button class="pane-btn btn-first" title="Bring to First Column/Row" ${index === 0 ? 'style="opacity:0.4; pointer-events:none;"' : ''}>1st</button>
              <button class="pane-btn btn-arrow btn-left" title="Move Left / Up" ${index === 0 ? 'style="opacity:0.4; pointer-events:none;"' : ''}>&lt;</button>
              <button class="pane-btn btn-arrow btn-right" title="Move Right / Down" ${index === panesToRender.length - 1 ? 'style="opacity:0.4; pointer-events:none;"' : ''}>&gt;</button>` : ''}
              <button class="pane-btn btn-close" title="Close / Hide pane">✕</button>
            </div>
          </div>

          <!-- ROW 2: Expand toggle [▶] and Vanilla VS Code Search Input Widget -->
          <div class="pane-row-2">
            <button class="btn-expand-row3" title="Toggle Advanced Root Switcher (Row 3)">▶</button>
            <div class="find-widget-container" id="find_container_${pane.id}">
              <input 
                type="text" 
                class="find-input" 
                placeholder="Filter files (e.g. *.ts, /regex/)" 
                value="${escapeHtml(pane.filterText || '')}" 
                spellcheck="false"
              />
              <div class="find-actions">
                <button class="find-toggle-btn btn-case ${pane.searchOptions.matchCase ? 'active' : ''}" title="Match Case (Alt+C)">Aa</button>
                <button class="find-toggle-btn btn-word ${pane.searchOptions.matchWholeWord ? 'active' : ''}" title="Match Whole Word (Alt+W)"><u>ab</u></button>
                <button class="find-toggle-btn btn-regex ${pane.searchOptions.useRegex ? 'active' : ''}" title="Use Regular Expression (Alt+R)">.*</button>
              </div>
            </div>
          </div>

          <!-- ROW 3: Expandable Advanced Root Switcher & Controls -->
          <div class="pane-row-3">
            <select class="repo-select-dropdown">${repoOptions}</select>
            <button class="pane-btn btn-browse" title="Browse custom target folder">📁</button>
            <button class="pane-btn btn-refresh" title="Refresh tree">↻</button>
          </div>
        </div>

        <div class="tree-content" id="tree_content_${pane.id}">
          <div class="empty-state">Loading tree...</div>
        </div>
      `;

      // -----------------------------------------------------------------------
      // Drag-and-Drop Reordering via [:::] (Isolated to avoid tree drag conflicts)
      // -----------------------------------------------------------------------
      const dragHandle = paneEl.querySelector('.drag-handle');
      if (dragHandle && !isFocus) {
        dragHandle.addEventListener('dragstart', (e) => {
          // @ts-ignore
          e.dataTransfer.effectAllowed = 'move';
          // @ts-ignore
          e.dataTransfer.setData('application/vnd.code.treepane.reorder', pane.id);
          paneEl.classList.add('dragging');
        });

        dragHandle.addEventListener('dragend', () => {
          paneEl.classList.remove('dragging');
          document.querySelectorAll('.tree-pane').forEach((el) => el.classList.remove('drag-over'));
        });
      }

      // -----------------------------------------------------------------------
      // Drag-and-Drop Pane Title to Terminal or Editor (Exports rootPath)
      // -----------------------------------------------------------------------
      const paneTitleEl = paneEl.querySelector('.pane-title');
      if (paneTitleEl) {
        paneTitleEl.addEventListener('dragstart', (e) => {
          const rootPath = pane.rootPath;
          const terminalText = formatTerminalPath(rootPath);
          const uri = toFileUri(rootPath);

          currentDragSource = {
            sourcePaths: [rootPath],
            sourcePath: rootPath,
            sourcePaneId: pane.id,
            isDirectory: true
          };

          e.dataTransfer.setData('text/plain', terminalText);
          e.dataTransfer.setData('text/uri-list', uri);
          e.dataTransfer.setData('resourceurls', JSON.stringify([uri]));
          e.dataTransfer.setData('application/vnd.code.tree.resourceUrls', JSON.stringify([uri]));
          e.dataTransfer.setData('application/vnd.code.tree.treepane', JSON.stringify(currentDragSource));
          e.dataTransfer.setData('text/x-treepane-path', rootPath);
          e.dataTransfer.effectAllowed = 'copyMove';

          paneTitleEl.classList.add('dragging');
          document.body.classList.add('is-tree-dragging');
        });

        paneTitleEl.addEventListener('dragend', () => {
          paneTitleEl.classList.remove('dragging');
          document.body.classList.remove('is-tree-dragging');
          clearAllDragIndicators();
          currentDragSource = null;
          setTimeout(() => {
            isNodeDragging = false;
          }, 120);
        });
      }

      if (!isFocus) {
        paneEl.addEventListener('dragover', (e) => {
          e.preventDefault();
          // If pane reordering drag:
          if (e.dataTransfer && e.dataTransfer.types.includes('application/vnd.code.treepane.reorder')) {
            // @ts-ignore
            e.dataTransfer.dropEffect = 'move';
            paneEl.classList.add('drag-over');
            return;
          }
          // If file tree drag:
          const isCopy = e.ctrlKey || e.altKey;
          // @ts-ignore
          e.dataTransfer.dropEffect = isCopy ? 'copy' : 'move';
        });

        paneEl.addEventListener('dragleave', (e) => {
          if (!paneEl.contains(e.relatedTarget)) {
            paneEl.classList.remove('drag-over');
          }
        });

        paneEl.addEventListener('drop', (e) => {
          // If pane reordering drop:
          if (e.dataTransfer && e.dataTransfer.types.includes('application/vnd.code.treepane.reorder')) {
            e.preventDefault();
            paneEl.classList.remove('drag-over');
            // @ts-ignore
            const sourcePaneId = e.dataTransfer.getData('application/vnd.code.treepane.reorder');
            if (sourcePaneId && sourcePaneId !== pane.id) {
              const srcIdx = state.panes.findIndex((p) => p.id === sourcePaneId);
              const tgtIdx = state.panes.findIndex((p) => p.id === pane.id);
              if (srcIdx !== -1 && tgtIdx !== -1) {
                const [moved] = state.panes.splice(srcIdx, 1);
                state.panes.splice(tgtIdx, 0, moved);
                renderPanes();
                saveState();
              }
            }
            return;
          }

          // If file drop onto pane background / header:
          const payload = extractTreePayload(e);
          if (payload && pane.rootPath) {
            e.preventDefault();
            e.stopPropagation();
            clearAllDragIndicators();

            const sourcePaths = payload.sourcePaths && payload.sourcePaths.length > 0
              ? payload.sourcePaths
              : (payload.sourcePath ? [payload.sourcePath] : []);

            const validPaths = sourcePaths.filter((sp) => {
              const lSp = sp.toLowerCase();
              const lRoot = pane.rootPath.toLowerCase();
              const sourceDir = getParentDir(sp).toLowerCase();
              return sourceDir !== lRoot && lSp !== lRoot && !lRoot.startsWith(lSp + '/');
            });

            if (validPaths.length > 0) {
              const isCopy = e.ctrlKey || e.altKey;
              vscode.postMessage({
                command: isCopy ? 'copyItems' : 'moveItems',
                sourcePaths: validPaths,
                targetDirPath: pane.rootPath,
                sourcePaneId: payload.sourcePaneId,
                targetPaneId: pane.id
              });
            }
            return;
          }
        });
      }

      // -----------------------------------------------------------------------
      // Action & Row 3 Controls
      // -----------------------------------------------------------------------
      const subheader = paneEl.querySelector('.pane-subheader');
      const gitBadge = paneEl.querySelector('.btn-git-badge');
      if (gitBadge) {
        gitBadge.addEventListener('click', (e) => {
          e.stopPropagation();
          state.activePaneId = pane.id;
          vscode.postMessage({
            command: 'openSourceControl',
            repoPath: pane.rootPath
          });
        });
      }

      const btnExpandRow3 = paneEl.querySelector('.btn-expand-row3');
      btnExpandRow3.addEventListener('click', (e) => {
        e.stopPropagation();
        state.activePaneId = pane.id;
        subheader.classList.toggle('is-expanded-row3');
      });

      const btnFirst = paneEl.querySelector('.btn-first');
      if (btnFirst) {
        btnFirst.addEventListener('click', (e) => {
          e.stopPropagation();
          state.activePaneId = pane.id;
          movePaneFirst(pane.id);
        });
      }

      const btnLeft = paneEl.querySelector('.btn-left');
      if (btnLeft) {
        btnLeft.addEventListener('click', (e) => {
          e.stopPropagation();
          state.activePaneId = pane.id;
          movePaneShift(pane.id, 'left');
        });
      }

      const btnRight = paneEl.querySelector('.btn-right');
      if (btnRight) {
        btnRight.addEventListener('click', (e) => {
          e.stopPropagation();
          state.activePaneId = pane.id;
          movePaneShift(pane.id, 'right');
        });
      }

      paneEl.querySelector('.btn-close').addEventListener('click', (e) => {
        e.stopPropagation();
        pane.isHidden = true;
        renderPanes();
        saveState();
      });

      if (!isFocus) {
        paneEl.querySelector('.pane-row-1').addEventListener('dblclick', () => {
          pane.isCollapsed = !pane.isCollapsed;
          renderPanes();
          saveState();
        });
      }

      // Row 3 Root Switcher
      paneEl.querySelector('.repo-select-dropdown').addEventListener('change', (e) => {
        // @ts-ignore
        const newPath = e.target.value;
        if (newPath) {
          state.activePaneId = pane.id;
          pane.rootPath = newPath;
          pane.name = newPath.split('/').pop() || newPath;
          vscode.postMessage({
            command: 'requestFolder',
            paneId: pane.id,
            folderPath: newPath
          });
          renderPanes();
          saveState();
        }
      });

      paneEl.querySelector('.btn-browse').addEventListener('click', () => {
        state.activePaneId = pane.id;
        vscode.postMessage({ command: 'selectFolder', paneId: pane.id });
      });

      paneEl.querySelector('.btn-refresh').addEventListener('click', () => {
        state.activePaneId = pane.id;
        vscode.postMessage({
          command: 'requestFolder',
          paneId: pane.id,
          folderPath: pane.rootPath
        });
      });

      // -----------------------------------------------------------------------
      // Row 2: Vanilla VS Code Search Mechanics
      // -----------------------------------------------------------------------
      const findContainer = paneEl.querySelector('.find-widget-container');
      const findInput = paneEl.querySelector('.find-input');
      const btnCase = paneEl.querySelector('.btn-case');
      const btnWord = paneEl.querySelector('.btn-word');
      const btnRegex = paneEl.querySelector('.btn-regex');

      function triggerSearch() {
        state.activePaneId = pane.id;
        // @ts-ignore
        pane.filterText = findInput.value;
        renderPaneTree(pane.id);
        vscode.postMessage({
          command: 'updatePaneFilter',
          paneId: pane.id,
          filterText: pane.filterText
        });
      }

      findInput.addEventListener('input', triggerSearch);

      btnCase.addEventListener('click', () => {
        state.activePaneId = pane.id;
        pane.searchOptions.matchCase = !pane.searchOptions.matchCase;
        btnCase.classList.toggle('active', pane.searchOptions.matchCase);
        triggerSearch();
        saveState();
      });

      btnWord.addEventListener('click', () => {
        state.activePaneId = pane.id;
        pane.searchOptions.matchWholeWord = !pane.searchOptions.matchWholeWord;
        btnWord.classList.toggle('active', pane.searchOptions.matchWholeWord);
        triggerSearch();
        saveState();
      });

      btnRegex.addEventListener('click', () => {
        state.activePaneId = pane.id;
        pane.searchOptions.useRegex = !pane.searchOptions.useRegex;
        btnRegex.classList.toggle('active', pane.searchOptions.useRegex);
        triggerSearch();
        saveState();
      });

      container.appendChild(paneEl);
      renderPaneTree(pane.id);

      // Append Draggable Resizer Gutter (between adjacent visible panes only in Split Mode)
      if (!isFocus && index < panesToRender.length - 1) {
        const resizer = document.createElement('div');
        resizer.className = 'pane-resizer';
        resizer.title = 'Drag to shrink or expand adjacent panes';
        setupResizer(resizer, pane, panesToRender[index + 1]);
        container.appendChild(resizer);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Splitter Gutter Resizing Engine (Hardware Pointer Capture & Anti-Stuck)
  // ---------------------------------------------------------------------------
  let resizeWatchdogTimer = null;

  function armResizeWatchdog() {
    clearTimeout(resizeWatchdogTimer);
    resizeWatchdogTimer = setTimeout(() => {
      if (document.body.classList.contains('is-resizing') || document.body.classList.contains('is-resizing-v')) {
        cleanupInteractionStates();
      }
    }, 3500);
  }

  function setupResizer(resizerEl, leftPane, rightPane) {
    resizerEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; // Only primary mouse button
      e.preventDefault();

      const isHorizontal = state.layout === 'horizontal';
      document.body.classList.add(isHorizontal ? 'is-resizing' : 'is-resizing-v');
      resizerEl.classList.add('active');

      try {
        resizerEl.setPointerCapture(e.pointerId);
      } catch (err) {}

      armResizeWatchdog();

      const startCoord = isHorizontal ? e.clientX : e.clientY;
      const leftEl = document.getElementById(`pane_el_${leftPane.id}`);
      const rightEl = document.getElementById(`pane_el_${rightPane.id}`);

      const startLeftSize = isHorizontal ? (leftEl ? leftEl.offsetWidth : 120) : (leftEl ? leftEl.offsetHeight : 120);
      const startRightSize = isHorizontal ? (rightEl ? rightEl.offsetWidth : 120) : (rightEl ? rightEl.offsetHeight : 120);

      function onPointerMove(moveEvent) {
        armResizeWatchdog();
        const currentCoord = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
        const delta = currentCoord - startCoord;

        const newLeftSize = Math.max(100, startLeftSize + delta);
        const newRightSize = Math.max(100, startRightSize - delta);

        leftPane.size = newLeftSize;
        rightPane.size = newRightSize;

        if (leftEl && rightEl) {
          if (isHorizontal) {
            leftEl.style.height = '';
            rightEl.style.height = '';
            leftEl.style.minHeight = '';
            rightEl.style.minHeight = '';
            leftEl.style.maxHeight = '';
            rightEl.style.maxHeight = '';
            leftEl.style.width = `${newLeftSize}px`;
            leftEl.style.flexBasis = `${newLeftSize}px`;
            rightEl.style.width = `${newRightSize}px`;
            rightEl.style.flexBasis = `${newRightSize}px`;
          } else {
            leftEl.style.width = '';
            rightEl.style.width = '';
            leftEl.style.minWidth = '';
            rightEl.style.minWidth = '';
            leftEl.style.maxWidth = '';
            rightEl.style.maxWidth = '';
            leftEl.style.height = `${newLeftSize}px`;
            leftEl.style.flexBasis = `${newLeftSize}px`;
            rightEl.style.height = `${newRightSize}px`;
            rightEl.style.flexBasis = `${newRightSize}px`;
          }
        }
      }

      function onPointerEnd(endEvent) {
        clearTimeout(resizeWatchdogTimer);
        try {
          if (endEvent && endEvent.pointerId !== undefined && resizerEl.hasPointerCapture(endEvent.pointerId)) {
            resizerEl.releasePointerCapture(endEvent.pointerId);
          }
        } catch (err) {}

        cleanup();
        saveState();
      }

      function cleanup() {
        document.body.classList.remove('is-resizing', 'is-resizing-v');
        resizerEl.classList.remove('active');
        resizerEl.removeEventListener('pointermove', onPointerMove);
        resizerEl.removeEventListener('pointerup', onPointerEnd);
        resizerEl.removeEventListener('pointercancel', onPointerEnd);
        resizerEl.removeEventListener('lostpointercapture', cleanup);
        window.removeEventListener('pointerup', onPointerEnd);
      }

      resizerEl.addEventListener('pointermove', onPointerMove);
      resizerEl.addEventListener('pointerup', onPointerEnd);
      resizerEl.addEventListener('pointercancel', onPointerEnd);
      resizerEl.addEventListener('lostpointercapture', cleanup);
      window.addEventListener('pointerup', onPointerEnd, { once: true });
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Tree Rendering & Vanilla VS Code Search Matcher
  // ---------------------------------------------------------------------------
  function compileFilterMatcher(filterText, options, containerEl) {
    if (!filterText) {
      if (containerEl) containerEl.classList.remove('has-error');
      return null;
    }

    const { matchCase, matchWholeWord, useRegex } = options || {};

    if (useRegex) {
      try {
        let pattern = filterText;
        if (matchWholeWord) {
          pattern = `\\b(?:${pattern})\\b`;
        }
        const flags = matchCase ? '' : 'i';
        const re = new RegExp(pattern, flags);
        if (containerEl) containerEl.classList.remove('has-error');
        return {
          test: (name) => re.test(name),
          highlight: (name) => {
            try {
              const hlRegex = new RegExp(`(${pattern})`, flags + (flags.includes('g') ? '' : 'g'));
              return escapeHtml(name).replace(hlRegex, '<mark>$1</mark>');
            } catch (_) {
              return escapeHtml(name);
            }
          }
        };
      } catch (_) {
        if (containerEl) containerEl.classList.add('has-error');
        return {
          test: () => false,
          highlight: (name) => escapeHtml(name)
        };
      }
    } else {
      if (containerEl) containerEl.classList.remove('has-error');
      const escaped = escapeRegex(filterText);
      let pattern = escaped;
      if (matchWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      const flags = matchCase ? 'g' : 'gi';
      const re = new RegExp(pattern, flags);

      return {
        test: (name) => {
          re.lastIndex = 0;
          return re.test(name);
        },
        highlight: (name) => {
          return escapeHtml(name).replace(re, '<mark>$&</mark>');
        }
      };
    }
  }

  function renderPaneTree(paneId) {
    const contentEl = document.getElementById(`tree_content_${paneId}`);
    if (!contentEl) return;

    const tree = state.trees[paneId];
    const pane = state.panes.find((p) => p.id === paneId);
    const findContainer = document.getElementById(`find_container_${paneId}`);
    const matcher = pane ? compileFilterMatcher(pane.filterText, pane.searchOptions, findContainer) : null;

    if (!tree) {
      contentEl.innerHTML = `<div class="empty-state">Loading tree for ${pane ? escapeHtml(pane.name) : ''}...</div>`;
      return;
    }

    contentEl.dataset.paneId = paneId;
    const rootPath = pane ? pane.rootPath : (tree.path || '');
    contentEl.dataset.rootPath = rootPath;

    // Attach drop zone on tree content background (guarded to only attach once)
    if (!contentEl.dataset.dropSetup) {
      contentEl.dataset.dropSetup = 'true';
      setupPaneContentDropZone(contentEl);
    }

    contentEl.innerHTML = '';
    const fragment = document.createDocumentFragment();
    renderNodes(tree.children || [], 0, fragment, matcher, paneId);
    contentEl.appendChild(fragment);
  }

  function toggleNodeDirectory(node, nodeEl, paneId, depth, matcher) {
    node.isExpanded = !node.isExpanded;
    const arrow = nodeEl.querySelector('.tree-arrow');
    if (arrow) arrow.classList.toggle('expanded', node.isExpanded);
    const iconEl = nodeEl.querySelector('.tree-icon');
    if (iconEl && !node.isGitRepo) iconEl.textContent = node.isExpanded ? '📂' : '📁';

    const childrenContainer = nodeEl.nextElementSibling;
    if (childrenContainer && childrenContainer.classList.contains('tree-children')) {
      childrenContainer.style.display = node.isExpanded ? 'block' : 'none';

      // If expanding and has no rendered children yet, request on-demand load
      if (node.isExpanded && (!node.children || node.children.length === 0)) {
        if (!node._hasRequestedLoad) {
          node._hasRequestedLoad = true;
          const d = depth !== undefined ? depth : parseInt(nodeEl.dataset.depth || '0', 10);
          childrenContainer.innerHTML = `<div class="tree-loading" style="padding-left:${(d + 1) * 14 + 18}px; font-size:11px; opacity:0.6; padding-top:2px; padding-bottom:2px;">Loading...</div>`;
          vscode.postMessage({
            command: 'loadSubfolder',
            paneId: paneId,
            folderPath: node.path
          });
        }
      }
    }
  }

  function handleSubfolderLoaded(paneId, folderPath, children) {
    const tree = state.trees[paneId];
    if (tree) {
      function findAndAttach(parent) {
        if (!parent) return false;
        if (parent.path && parent.path.replace(/\\/g, '/').toLowerCase() === folderPath.replace(/\\/g, '/').toLowerCase()) {
          parent.children = children;
          return true;
        }
        if (parent.children) {
          for (const ch of parent.children) {
            if (findAndAttach(ch)) return true;
          }
        }
        return false;
      }
      findAndAttach(tree);
    }

    const paneEl = document.getElementById(`pane_el_${paneId}`);
    if (!paneEl) return;

    const escaped = CSS.escape(folderPath);
    const nodeEl = paneEl.querySelector(`.tree-node[data-path="${escaped}"]`);
    if (!nodeEl) return;

    const childrenContainer = nodeEl.nextElementSibling;
    if (!childrenContainer || !childrenContainer.classList.contains('tree-children')) return;

    childrenContainer.innerHTML = '';
    const depth = parseInt(nodeEl.dataset.depth || '0', 10);

    if (!children || children.length === 0) {
      childrenContainer.innerHTML = `<div class="tree-empty" style="padding-left:${(depth + 1) * 14 + 18}px; font-size:11px; opacity:0.5; padding-top:2px; padding-bottom:2px;">(empty)</div>`;
      return;
    }

    const pane = state.panes.find((p) => p.id === paneId);
    const findContainer = paneEl.querySelector('.tree-find-widget');
    const matcher = pane ? compileFilterMatcher(pane.filterText, pane.searchOptions, findContainer) : null;

    renderNodes(children, depth + 1, childrenContainer, matcher, paneId);
  }

  function startInlineRename(nodeEl, node, paneId) {
    if (!nodeEl) return;
    const labelEl = nodeEl.querySelector('.tree-label');
    if (!labelEl) return;

    if (nodeEl.querySelector('.tree-rename-input')) return;

    const originalName = node.name;
    const originalHtml = labelEl.innerHTML;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tree-rename-input';
    input.value = originalName;
    input.setAttribute('data-vscode-context', JSON.stringify({ preventDefaultContextMenuItems: true }));

    labelEl.innerHTML = '';
    labelEl.appendChild(input);

    let committed = false;

    const commit = () => {
      if (committed) return;
      committed = true;
      const newName = input.value.trim();
      if (newName && newName !== originalName) {
        vscode.postMessage({
          command: 'renameItem',
          oldPath: node.path,
          newName: newName
        });
      } else {
        labelEl.innerHTML = originalHtml;
      }
    };

    const cancel = () => {
      if (committed) return;
      committed = true;
      labelEl.innerHTML = originalHtml;
    };

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        commit();
      } else if (e.key === 'Escape') {
        cancel();
      }
    });

    input.addEventListener('blur', () => {
      commit();
    });

    input.focus();
    const ext = node.isDirectory ? '' : (originalName.lastIndexOf('.') > 0 ? originalName.substring(originalName.lastIndexOf('.')) : '');
    const baseLen = originalName.length - ext.length;
    input.setSelectionRange(0, baseLen > 0 ? baseLen : originalName.length);
  }

  function renderNodes(nodes, depth, containerEl, matcher, paneId) {
    nodes.forEach((node) => {
      const matchesFilter = matcher ? matcher.test(node.name) : true;
      const hasMatchingChild = matcher && node.isDirectory && checkChildMatches(node, matcher);

      if (matcher && !matchesFilter && !hasMatchingChild) {
        return;
      }

      const isExpanded = matcher ? true : node.isExpanded;

      const nodeEl = document.createElement('div');
      nodeEl.className = 'tree-node';
      nodeEl.dataset.path = node.path;
      nodeEl.dataset.isDir = String(node.isDirectory);
      nodeEl.dataset.paneId = paneId;
      nodeEl.dataset.depth = String(depth);
      nodeEl.setAttribute('draggable', 'true');
      nodeEl.setAttribute('data-vscode-context', JSON.stringify({ preventDefaultContextMenuItems: true }));

      if (selectedPaths.has(node.path)) {
        nodeEl.classList.add('selected');
      }

      let indentHtml = '';
      for (let i = 0; i < depth; i++) {
        indentHtml += '<span class="tree-indent"></span>';
      }

      const arrowHtml = node.isDirectory
        ? `<span class="tree-arrow ${isExpanded ? 'expanded' : ''}">▶</span>`
        : '<span class="tree-arrow"></span>';

      const icon = node.isDirectory
        ? (node.isGitRepo ? '📦' : (isExpanded ? '📂' : '📁'))
        : getFileIcon(node.name);

      let labelHtml = escapeHtml(node.name);
      if (matcher && matchesFilter) {
        labelHtml = matcher.highlight(node.name);
      }

      nodeEl.innerHTML = `
        ${indentHtml}
        ${arrowHtml}
        <span class="tree-icon">${icon}</span>
        <span class="tree-label">${labelHtml}</span>
      `;

      // -----------------------------------------------------------------------
      // Native HTML5 Drag & Drop with Multi-Selection Support
      // -----------------------------------------------------------------------
      nodeEl.addEventListener('dragstart', (e) => {
        if (e.target.closest('.tree-arrow') || e.target.closest('.tree-rename-input')) {
          e.preventDefault();
          return;
        }

        isNodeDragging = true;
        pendingSoleSelectionPath = null; // User started dragging: cancel single-select collapse

        // If dragging an unselected node, make it the sole selection
        if (!selectedPaths.has(node.path)) {
          selectedPaths.clear();
          selectedPaths.add(node.path);
          lastAnchorNode = { path: node.path, paneId, nodeEl };
          updateSelectionUI();
        }

        const activePaths = Array.from(selectedPaths);
        const terminalText = activePaths.map(formatTerminalPath).join(' ');
        const uriList = activePaths.map((p) => toFileUri(p)).join('\r\n');
        const uris = activePaths.map((p) => toFileUri(p));

        currentDragSource = {
          sourcePaths: activePaths,
          sourcePath: node.path,
          sourcePaneId: paneId,
          isDirectory: node.isDirectory
        };

        // 1. Terminal plain-text payload: space-separated and quoted paths for VS Code terminal, Windows Terminal, PowerShell, CMD, Bash
        e.dataTransfer.setData('text/plain', terminalText);

        // 2. Standard RFC-compliant CRLF-delimited file URI list
        e.dataTransfer.setData('text/uri-list', uriList);

        // 3. VS Code Workbench resource URLs (for dropping into editor groups, native explorer, and terminal)
        e.dataTransfer.setData('resourceurls', JSON.stringify(uris));
        e.dataTransfer.setData('application/vnd.code.tree.resourceUrls', JSON.stringify(uris));

        // 4. TreePane internal drag payload
        e.dataTransfer.setData('application/vnd.code.tree.treepane', JSON.stringify(currentDragSource));
        e.dataTransfer.setData('text/x-treepane-path', activePaths.join('\n'));

        e.dataTransfer.effectAllowed = 'copyMove';

        activePaths.forEach((p) => {
          document.querySelectorAll(`.tree-node[data-path="${CSS.escape(p)}"]`).forEach((el) => {
            el.classList.add('dragging');
          });
        });
        document.body.classList.add('is-tree-dragging');
      });

      nodeEl.addEventListener('dragend', () => {
        document.querySelectorAll('.tree-node.dragging').forEach((el) => el.classList.remove('dragging'));
        document.body.classList.remove('is-tree-dragging');
        clearAllDragIndicators();
        currentDragSource = null;
        setTimeout(() => {
          isNodeDragging = false;
        }, 120);
      });

      nodeEl.addEventListener('dragover', (e) => {
        if (!isTreeDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();

        const isCopy = e.ctrlKey || e.altKey;
        e.dataTransfer.dropEffect = isCopy ? 'copy' : 'move';

        document.querySelectorAll('.drag-over-folder, .drag-over-top, .drag-over-bottom').forEach((el) => {
          if (el !== nodeEl) el.classList.remove('drag-over-folder', 'drag-over-top', 'drag-over-bottom');
        });

        if (node.isDirectory) {
          nodeEl.classList.add('drag-over-folder');
        } else {
          const rect = nodeEl.getBoundingClientRect();
          if (e.clientY < rect.top + rect.height / 2) {
            nodeEl.classList.add('drag-over-top');
            nodeEl.classList.remove('drag-over-bottom');
          } else {
            nodeEl.classList.add('drag-over-bottom');
            nodeEl.classList.remove('drag-over-top');
          }
        }
      });

      nodeEl.addEventListener('dragleave', (e) => {
        if (!nodeEl.contains(e.relatedTarget)) {
          nodeEl.classList.remove('drag-over-folder', 'drag-over-top', 'drag-over-bottom');
        }
      });

      nodeEl.addEventListener('drop', (e) => {
        if (!isTreeDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();

        const payload = extractTreePayload(e);
        clearAllDragIndicators();

        if (!payload) return;
        const sourcePaths = payload.sourcePaths && payload.sourcePaths.length > 0
          ? payload.sourcePaths
          : (payload.sourcePath ? [payload.sourcePath] : []);

        if (sourcePaths.length === 0) return;

        let targetDir = node.isDirectory ? node.path : getParentDir(node.path);

        // Prevent moving a directory into itself or its own subdirectories
        const validPaths = sourcePaths.filter((sp) => {
          const lSp = sp.toLowerCase();
          const lTarget = targetDir.toLowerCase();
          return lSp !== lTarget && !lTarget.startsWith(lSp + '/');
        });

        if (validPaths.length === 0) return;

        const isCopy = e.ctrlKey || e.altKey;
        const isTop = nodeEl.classList.contains('drag-over-top');
        const isBottom = nodeEl.classList.contains('drag-over-bottom');

        if (validPaths.length === 1 && !node.isDirectory && (isTop || isBottom)) {
          const sp = validPaths[0];
          const sourceDir = getParentDir(sp);
          const isSameDir = sourceDir.replace(/\\/g, '/').toLowerCase() === targetDir.replace(/\\/g, '/').toLowerCase();
          if (isSameDir) {
            reorderTreeNodesLocally(paneId, sp, node.path, isTop ? 'before' : 'after');
            return;
          }
        }

        vscode.postMessage({
          command: isCopy ? 'copyItems' : 'moveItems',
          sourcePaths: validPaths,
          targetDirPath: targetDir,
          sourcePaneId: payload.sourcePaneId,
          targetPaneId: paneId
        });
      });

      // -----------------------------------------------------------------------
      // MouseDown Handling for Multi-Select (Shift-Click & Ctrl-Click)
      // Handles selection before Chromium's drag/drop or text-selection can swallow it
      // -----------------------------------------------------------------------
      nodeEl.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('.tree-arrow') || e.target.closest('.tree-rename-input')) return;

        const isCtrl = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;

        if (isCtrl) {
          handledModifierInMouseDown = true;
          e.preventDefault(); // Stop Chromium text selection & drag gesture suppression
          if (selectedPaths.has(node.path)) {
            selectedPaths.delete(node.path);
          } else {
            selectedPaths.add(node.path);
          }
          lastAnchorNode = { path: node.path, paneId, nodeEl };
          updateSelectionUI();
          return;
        }

        if (isShift) {
          handledModifierInMouseDown = true;
          e.preventDefault(); // Stop Chromium text selection
          const paneEl = nodeEl.closest('.tree-pane') || document.getElementById(`pane_el_${paneId}`);
          if (paneEl) {
            // Only select visible nodes (ignore collapsed children with display:none)
            const allVisibleNodes = Array.from(paneEl.querySelectorAll('.tree-node')).filter(
              (el) => el.offsetParent !== null
            );

            let anchorPath = lastAnchorNode && lastAnchorNode.paneId === paneId ? lastAnchorNode.path : null;
            let idxAnchor = anchorPath ? allVisibleNodes.findIndex((el) => el.dataset.path === anchorPath) : 0;
            if (idxAnchor === -1) idxAnchor = 0;

            const idxCurrent = allVisibleNodes.indexOf(nodeEl);
            if (idxCurrent !== -1) {
              const start = Math.min(idxAnchor, idxCurrent);
              const end = Math.max(idxAnchor, idxCurrent);
              selectedPaths.clear();
              for (let i = start; i <= end; i++) {
                selectedPaths.add(allVisibleNodes[i].dataset.path);
              }
              lastAnchorNode = { path: node.path, paneId, nodeEl };
              updateSelectionUI();
              return;
            }
          }
        }

        // Normal left click without modifiers:
        // If node is already part of an existing multi-selection, defer sole selection to click
        // so the user can drag the entire multi-selection without losing it!
        if (selectedPaths.has(node.path) && selectedPaths.size > 1) {
          pendingSoleSelectionPath = node.path;
        } else {
          pendingSoleSelectionPath = null;
          selectedPaths.clear();
          selectedPaths.add(node.path);
          lastAnchorNode = { path: node.path, paneId, nodeEl };
          updateSelectionUI();
        }
      });

      // -----------------------------------------------------------------------
      // Click Handling (File Opening / Folder Toggling / Delayed Selection Collapse)
      // -----------------------------------------------------------------------
      nodeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isNodeDragging) return;

        // Arrow click explicitly toggles directory
        if (e.target.closest('.tree-arrow')) {
          toggleNodeDirectory(node, nodeEl, paneId, depth, matcher);
          return;
        }

        // If this click had modifier keys or was already processed in mousedown, do not open/toggle
        if (handledModifierInMouseDown || e.ctrlKey || e.metaKey || e.shiftKey) {
          handledModifierInMouseDown = false;
          return;
        }

        // If user clicked without dragging on an item that was part of a multi-selection,
        // now collapse to this single item
        if (pendingSoleSelectionPath) {
          selectedPaths.clear();
          selectedPaths.add(pendingSoleSelectionPath);
          lastAnchorNode = { path: pendingSoleSelectionPath, paneId, nodeEl };
          updateSelectionUI();
          pendingSoleSelectionPath = null;
        }

        if (node.isDirectory) {
          toggleNodeDirectory(node, nodeEl, paneId, depth, matcher);
        } else {
          vscode.postMessage({
            command: 'openFile',
            filePath: node.path
          });
        }
      });

      containerEl.appendChild(nodeEl);

      if (node.isDirectory) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'tree-children';
        childrenDiv.dataset.parentPath = node.path;
        childrenDiv.style.display = isExpanded ? 'block' : 'none';
        if (node.children && node.children.length > 0) {
          renderNodes(node.children, depth + 1, childrenDiv, matcher, paneId);
        }
        containerEl.appendChild(childrenDiv);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Context Menu Subsystem (Right-Click: Copy Path, Relative, Advance)
  // ---------------------------------------------------------------------------
  let activeContextMenuEl = null;

  function closeContextMenu() {
    if (activeContextMenuEl) {
      activeContextMenuEl.remove();
      activeContextMenuEl = null;
    }
  }

  window.addEventListener('click', () => {
    closeContextMenu();
  });

  let fileClipboard = {
    operation: null, // 'copy' | 'cut'
    paths: [],
    sourcePaneId: null
  };

  function executeCopy(paths, paneId) {
    if (!paths || paths.length === 0) return;
    document.querySelectorAll('.tree-node.is-cut').forEach((el) => el.classList.remove('is-cut'));
    fileClipboard = {
      operation: 'copy',
      paths: [...paths],
      sourcePaneId: paneId
    };
    copyTextToClipboard(paths.join('\n'));
  }

  function executeCut(paths, paneId) {
    if (!paths || paths.length === 0) return;
    document.querySelectorAll('.tree-node.is-cut').forEach((el) => el.classList.remove('is-cut'));
    fileClipboard = {
      operation: 'cut',
      paths: [...paths],
      sourcePaneId: paneId
    };
    paths.forEach((p) => {
      const el = document.querySelector(`.tree-node[data-path="${CSS.escape(p)}"]`);
      if (el) el.classList.add('is-cut');
    });
    copyTextToClipboard(paths.join('\n'));
  }

  function executePaste(targetDirPath) {
    if (!fileClipboard || !fileClipboard.operation || fileClipboard.paths.length === 0) {
      return;
    }
    const { operation, paths } = fileClipboard;
    if (operation === 'copy') {
      vscode.postMessage({
        command: 'copyItems',
        sourcePaths: paths,
        targetDirPath
      });
    } else if (operation === 'cut') {
      vscode.postMessage({
        command: 'moveItems',
        sourcePaths: paths,
        targetDirPath
      });
      document.querySelectorAll('.tree-node.is-cut').forEach((el) => el.classList.remove('is-cut'));
      fileClipboard = { operation: null, paths: [], sourcePaneId: null };
    }
  }

  function executeCopyContent(paths) {
    if (!paths || paths.length === 0) return;
    vscode.postMessage({
      command: 'copySelectedContent',
      paths
    });
  }

  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return;
    }

    if (e.key === 'Escape') {
      cleanupInteractionStates();
      closeContextMenu();
      if (fileClipboard.operation === 'cut') {
        document.querySelectorAll('.tree-node.is-cut').forEach((el) => el.classList.remove('is-cut'));
        fileClipboard = { operation: null, paths: [], sourcePaneId: null };
      }
    } else if (e.key === 'F2') {
      const activeEl = document.querySelector('.tree-node.active') || document.querySelector('.tree-node.selected');
      if (activeEl) {
        const p = activeEl.dataset.path;
        const isDir = activeEl.dataset.isDir === 'true';
        const paneId = activeEl.dataset.paneId;
        const name = p.split('/').pop() || p;
        startInlineRename(activeEl, { path: p, name, isDirectory: isDir }, paneId);
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !e.altKey && !e.shiftKey) {
      const activePaths = selectedPaths.size > 0 ? Array.from(selectedPaths) : [];
      if (activePaths.length > 0) {
        e.preventDefault();
        const firstEl = document.querySelector(`.tree-node[data-path="${CSS.escape(activePaths[0])}"]`);
        const paneId = firstEl ? firstEl.dataset.paneId : state.activePaneId;
        executeCopy(activePaths, paneId);
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      const activePaths = selectedPaths.size > 0 ? Array.from(selectedPaths) : [];
      if (activePaths.length > 0) {
        e.preventDefault();
        const firstEl = document.querySelector(`.tree-node[data-path="${CSS.escape(activePaths[0])}"]`);
        const paneId = firstEl ? firstEl.dataset.paneId : state.activePaneId;
        executeCut(activePaths, paneId);
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      if (fileClipboard.paths.length > 0) {
        e.preventDefault();
        let targetDirPath = null;
        const activeNode = document.querySelector('.tree-node.active') || document.querySelector('.tree-node.selected');
        if (activeNode) {
          const p = activeNode.dataset.path;
          const isDir = activeNode.dataset.isDir === 'true';
          targetDirPath = isDir ? p : p.substring(0, p.lastIndexOf('/'));
        } else if (state.activePaneId) {
          const pane = state.panes.find((p) => p.id === state.activePaneId);
          if (pane) targetDirPath = pane.rootPath;
        } else if (state.panes.length > 0) {
          targetDirPath = state.panes[0].rootPath;
        }
        if (targetDirPath) {
          executePaste(targetDirPath);
        }
      }
    } else if (e.altKey && e.key.toLowerCase() === 'c') {
      const activePaths = selectedPaths.size > 0 ? Array.from(selectedPaths) : [];
      if (activePaths.length > 0) {
        e.preventDefault();
        executeCopyContent(activePaths);
      }
    }
  });

  window.addEventListener('scroll', () => {
    closeContextMenu();
  }, true);

  // ---------------------------------------------------------------------------
  // Universal Interaction Cleanup Engine & Escape Hatches (Prevent Stuck Cursor)
  // ---------------------------------------------------------------------------
  function cleanupInteractionStates() {
    clearTimeout(resizeWatchdogTimer);
    document.body.classList.remove('is-resizing', 'is-resizing-v', 'is-tree-dragging');
    document.querySelectorAll('.pane-resizer.active').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.tree-node.dragging, .pane-title.dragging, .tree-pane.dragging').forEach((el) => el.classList.remove('dragging'));
    clearAllDragIndicators();
    isNodeDragging = false;
    currentDragSource = null;
  }

  // Tier 1: Window Blur (when clicking outside webview iframe, editor tabs, status bar)
  window.addEventListener('blur', cleanupInteractionStates);

  // Tier 2: Document Mouse Leave (when pointer leaves webview boundary during drag/resize)
  document.addEventListener('mouseleave', () => {
    if (document.body.classList.contains('is-resizing') || document.body.classList.contains('is-resizing-v')) {
      cleanupInteractionStates();
    }
  });

  // Global Pointer Up as ultimate safety net
  window.addEventListener('pointerup', cleanupInteractionStates);

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    vscode.postMessage({
      command: 'copyToClipboard',
      text: text
    });
  }

  function toAdvancedFilePath(filePath) {
    let norm = filePath.replace(/\\/g, '/');
    norm = norm.replace(/^([a-zA-Z]):/, (_, drive) => `${drive.toLowerCase()}%3A`);
    if (!norm.startsWith('/')) {
      norm = '/' + norm;
    }
    return `(file;file://${norm})`;
  }

  function formatTerminalPath(filePath) {
    if (!filePath) return '';
    let p = filePath;
    if (/^[a-zA-Z]:/.test(p)) {
      p = p.replace(/\//g, '\\');
    }
    if (/[\s&()^%$#!;]/.test(p)) {
      return `"${p}"`;
    }
    return p;
  }

  function computeRelativePath(fullPath, rootPath) {
    const normFull = fullPath.replace(/\\/g, '/');
    const normRoot = (rootPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
    if (normRoot && normFull.toLowerCase().startsWith(normRoot.toLowerCase() + '/')) {
      return normFull.substring(normRoot.length + 1);
    }
    return normFull.split('/').pop() || normFull;
  }

  function showNodeContextMenu(e, node, paneId) {
    closeContextMenu();

    const pane = state.panes.find((p) => p.id === paneId);
    const rootPath = pane ? pane.rootPath : '';
    const fullPath = node.path;
    const targetDirPath = node.isDirectory ? fullPath : fullPath.substring(0, fullPath.lastIndexOf('/'));
    const canPaste = Boolean(fileClipboard.operation && fileClipboard.paths.length > 0);
    const pasteCount = canPaste ? ` (${fileClipboard.paths.length})` : '';

    const isMulti = selectedPaths.has(fullPath) && selectedPaths.size > 1;
    const activePaths = isMulti ? Array.from(selectedPaths) : [fullPath];
    const countBadge = isMulti ? ` (${activePaths.length} items)` : '';

    const advancePaths = activePaths.map((p) => toAdvancedFilePath(p)).join('\n');
    const fullPaths = activePaths.join('\n');
    const relPaths = activePaths.map((p) => computeRelativePath(p, rootPath)).join('\n');

    const menu = document.createElement('div');
    menu.className = 'treepane-context-menu';
    menu.setAttribute('data-vscode-context', JSON.stringify({ preventDefaultContextMenuItems: true }));

    menu.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }, true);

    menu.innerHTML = `
      <div class="context-menu-item" data-action="newFile">
        <span class="item-label">New File...</span>
      </div>
      <div class="context-menu-item" data-action="newFolder">
        <span class="item-label">New Folder...</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="cut">
        <span class="item-label">Cut${countBadge}</span>
        <span class="item-shortcut">Ctrl+X</span>
      </div>
      <div class="context-menu-item" data-action="copy">
        <span class="item-label">Copy${countBadge}</span>
        <span class="item-shortcut">Ctrl+C</span>
      </div>
      <div class="context-menu-item ${!canPaste ? 'disabled' : ''}" data-action="paste">
        <span class="item-label">Paste${pasteCount}</span>
        <span class="item-shortcut">Ctrl+V</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="copyContent">
        <span class="item-label">Copy Selected Content${countBadge}</span>
        <span class="item-shortcut">Alt+C</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="copyPath">
        <span class="item-label">Copy Path${countBadge}</span>
        <span class="item-shortcut">Shift+Alt+C</span>
      </div>
      <div class="context-menu-item" data-action="copyRelativePath">
        <span class="item-label">Copy Relative Path${countBadge}</span>
        <span class="item-shortcut">Ctrl+K Ctrl+Shift+C</span>
      </div>
      <div class="context-menu-item" data-action="copyTerminalPath">
        <span class="item-label">Copy Path for Terminal${countBadge}</span>
      </div>
      <div class="context-menu-item" data-action="copyPathAdvance">
        <span class="item-label">Copy Path Advance${countBadge}</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="sendToTerminal">
        <span class="item-label">Send Path to Terminal${countBadge}</span>
      </div>
      <div class="context-menu-item" data-action="openInTerminal">
        <span class="item-label">Open in Integrated Terminal</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="rename">
        <span class="item-label">Rename</span>
        <span class="item-shortcut">F2</span>
      </div>
      <div class="context-menu-item" data-action="moveToRepo">
        <span class="item-label">Move to Repo...${countBadge}</span>
      </div>
      <div class="context-menu-divider"></div>
      ${!node.isDirectory && !isMulti ? `<div class="context-menu-item" data-action="openFile"><span class="item-label">Open File</span></div>` : ''}
      <div class="context-menu-item" data-action="revealInOS">
        <span class="item-label">Reveal in File Explorer</span>
      </div>
    `;

    menu.addEventListener('click', (evt) => {
      evt.stopPropagation();
      const targetItem = evt.target.closest('.context-menu-item');
      if (!targetItem) return;

      const action = targetItem.dataset.action;
      switch (action) {
        case 'newFile':
          vscode.postMessage({
            command: 'createNewItem',
            paneId,
            targetDirPath,
            isFolder: false
          });
          break;
        case 'newFolder':
          vscode.postMessage({
            command: 'createNewItem',
            paneId,
            targetDirPath,
            isFolder: true
          });
          break;
        case 'cut':
          executeCut(activePaths, paneId);
          break;
        case 'copy':
          executeCopy(activePaths, paneId);
          break;
        case 'paste':
          if (canPaste) {
            executePaste(targetDirPath);
          }
          break;
        case 'copyContent':
          executeCopyContent(activePaths);
          break;
        case 'copyPath':
          copyTextToClipboard(fullPaths);
          break;
        case 'copyRelativePath':
          copyTextToClipboard(relPaths);
          break;
        case 'copyTerminalPath':
          copyTextToClipboard(activePaths.map(formatTerminalPath).join(' '));
          break;
        case 'copyPathAdvance':
          copyTextToClipboard(advancePaths);
          break;
        case 'sendToTerminal':
          vscode.postMessage({
            command: 'sendToTerminal',
            paths: activePaths,
            execute: false
          });
          break;
        case 'openInTerminal':
          vscode.postMessage({
            command: 'openInTerminal',
            folderPath: node.isDirectory ? fullPath : targetDirPath
          });
          break;
        case 'rename': {
          const targetNodeEl = document.querySelector(`.tree-node[data-path="${CSS.escape(fullPath)}"]`);
          startInlineRename(targetNodeEl, node, paneId);
          break;
        }
        case 'moveToRepo':
          vscode.postMessage({
            command: 'moveToRepo',
            sourcePaths: activePaths,
            sourcePaneId: paneId
          });
          break;
        case 'openFile':
          vscode.postMessage({ command: 'openFile', filePath: fullPath });
          break;
        case 'revealInOS':
          vscode.postMessage({ command: 'revealInOS', filePath: fullPath });
          break;
      }
      closeContextMenu();
    });

    document.body.appendChild(menu);
    activeContextMenuEl = menu;

    let posX = e.clientX;
    let posY = e.clientY;
    const rect = menu.getBoundingClientRect();
    if (posX + rect.width > window.innerWidth) {
      posX = Math.max(8, window.innerWidth - rect.width - 8);
    }
    if (posY + rect.height > window.innerHeight) {
      posY = Math.max(8, window.innerHeight - rect.height - 8);
    }

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;
  }

  function showPaneContextMenu(e, pane) {
    closeContextMenu();

    const fullPath = pane.rootPath;
    const relPath = pane.name;
    const advancePath = toAdvancedFilePath(fullPath);
    const canPaste = Boolean(fileClipboard.operation && fileClipboard.paths.length > 0);
    const pasteCount = canPaste ? ` (${fileClipboard.paths.length})` : '';

    const menu = document.createElement('div');
    menu.className = 'treepane-context-menu';
    menu.setAttribute('data-vscode-context', JSON.stringify({ preventDefaultContextMenuItems: true }));

    menu.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }, true);

    menu.innerHTML = `
      <div class="context-menu-item" data-action="newFile">
        <span class="item-label">New File...</span>
      </div>
      <div class="context-menu-item" data-action="newFolder">
        <span class="item-label">New Folder...</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item ${!canPaste ? 'disabled' : ''}" data-action="paste">
        <span class="item-label">Paste into Root${pasteCount}</span>
        <span class="item-shortcut">Ctrl+V</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="copyPath">
        <span class="item-label">Copy Path</span>
        <span class="item-shortcut">Shift+Alt+C</span>
      </div>
      <div class="context-menu-item" data-action="copyRelativePath">
        <span class="item-label">Copy Relative Path</span>
      </div>
      <div class="context-menu-item" data-action="copyTerminalPath">
        <span class="item-label">Copy Path for Terminal</span>
      </div>
      <div class="context-menu-item" data-action="copyPathAdvance">
        <span class="item-label">Copy Path Advance</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="sendToTerminal">
        <span class="item-label">Send Path to Terminal</span>
      </div>
      <div class="context-menu-item" data-action="openInTerminal">
        <span class="item-label">Open in Integrated Terminal</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="revealInOS">
        <span class="item-label">Reveal in File Explorer</span>
      </div>
      <div class="context-menu-item" data-action="refreshTree">
        <span class="item-label">Refresh Tree</span>
      </div>
    `;

    menu.addEventListener('click', (evt) => {
      evt.stopPropagation();
      const targetItem = evt.target.closest('.context-menu-item');
      if (!targetItem) return;

      const action = targetItem.dataset.action;
      switch (action) {
        case 'newFile':
          vscode.postMessage({
            command: 'createNewItem',
            paneId,
            targetDirPath: fullPath,
            isFolder: false
          });
          break;
        case 'newFolder':
          vscode.postMessage({
            command: 'createNewItem',
            paneId,
            targetDirPath: fullPath,
            isFolder: true
          });
          break;
        case 'paste':
          if (canPaste) {
            executePaste(fullPath);
          }
          break;
        case 'copyPath':
          copyTextToClipboard(fullPath);
          break;
        case 'copyRelativePath':
          copyTextToClipboard(relPath);
          break;
        case 'copyTerminalPath':
          copyTextToClipboard(formatTerminalPath(fullPath));
          break;
        case 'copyPathAdvance':
          copyTextToClipboard(advancePath);
          break;
        case 'sendToTerminal':
          vscode.postMessage({
            command: 'sendToTerminal',
            paths: [fullPath],
            execute: false
          });
          break;
        case 'openInTerminal':
          vscode.postMessage({
            command: 'openInTerminal',
            folderPath: fullPath
          });
          break;
        case 'revealInOS':
          vscode.postMessage({ command: 'revealInOS', filePath: fullPath });
          break;
        case 'refreshTree':
          vscode.postMessage({ command: 'requestFolder', paneId: pane.id, folderPath: pane.rootPath });
          break;
      }
      closeContextMenu();
    });

    document.body.appendChild(menu);
    activeContextMenuEl = menu;

    let posX = e.clientX;
    let posY = e.clientY;
    const rect = menu.getBoundingClientRect();
    if (posX + rect.width > window.innerWidth) {
      posX = Math.max(8, window.innerWidth - rect.width - 8);
    }
    if (posY + rect.height > window.innerHeight) {
      posY = Math.max(8, window.innerHeight - rect.height - 8);
    }

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;
  }

  // ---------------------------------------------------------------------------
  // Global Right-Click Context Menu Listener (Suppresses Browser & Electron Default)
  // ---------------------------------------------------------------------------
  function handleGlobalContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Check if right-clicked on or inside a tree node
    const targetNode = e.target.closest('.tree-node');
    if (targetNode) {
      const path = targetNode.dataset.path;
      const isDir = targetNode.dataset.isDir === 'true';
      const paneId = targetNode.dataset.paneId;

      // If right-clicked node is not part of existing selection, select it solely
      if (!selectedPaths.has(path)) {
        selectedPaths.clear();
        selectedPaths.add(path);
        lastAnchorNode = { path, paneId, nodeEl: targetNode };
        updateSelectionUI();
      }

      showNodeContextMenu(e, { path, name: path.split('/').pop() || path, isDirectory: isDir }, paneId);
      return false;
    }

    // Check if right-clicked on empty area inside tree content or pane
    const targetPane = e.target.closest('.tree-pane') || e.target.closest('.tree-content');
    if (targetPane) {
      const paneEl = targetPane.closest('.tree-pane') || targetPane;
      const paneId = paneEl.dataset.paneId || paneEl.id.replace('pane_el_', '');
      const pane = state.panes.find((p) => p.id === paneId);
      if (pane && pane.rootPath) {
        showPaneContextMenu(e, pane);
        return false;
      }
    }

    closeContextMenu();
    return false;
  }

  document.addEventListener('contextmenu', handleGlobalContextMenu, true);
  window.addEventListener('contextmenu', handleGlobalContextMenu, true);
  document.body.oncontextmenu = (e) => {
    e.preventDefault();
    return false;
  };

  function setupPaneContentDropZone(contentEl) {
    contentEl.addEventListener('dragover', (e) => {
      if (!isTreeDrag(e)) return;
      e.preventDefault();
      const isCopy = e.ctrlKey || e.altKey;
      e.dataTransfer.dropEffect = isCopy ? 'copy' : 'move';
      contentEl.classList.add('drag-over-pane');
    });

    contentEl.addEventListener('dragleave', (e) => {
      if (!contentEl.contains(e.relatedTarget)) {
        contentEl.classList.remove('drag-over-pane');
      }
    });

    contentEl.addEventListener('drop', (e) => {
      if (!isTreeDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      contentEl.classList.remove('drag-over-pane');
      clearAllDragIndicators();

      const paneId = contentEl.dataset.paneId;
      const rootPath = contentEl.dataset.rootPath;
      const payload = extractTreePayload(e);
      if (!payload || !rootPath) return;

      const sourcePaths = payload.sourcePaths && payload.sourcePaths.length > 0
        ? payload.sourcePaths
        : (payload.sourcePath ? [payload.sourcePath] : []);

      const validPaths = sourcePaths.filter((sp) => {
        const lSp = sp.toLowerCase();
        const lRoot = rootPath.toLowerCase();
        const sDir = getParentDir(sp).toLowerCase();
        return sDir !== lRoot && lSp !== lRoot && !lRoot.startsWith(lSp + '/');
      });

      if (validPaths.length === 0) return;

      const isCopy = e.ctrlKey || e.altKey;
      vscode.postMessage({
        command: isCopy ? 'copyItems' : 'moveItems',
        sourcePaths: validPaths,
        targetDirPath: rootPath,
        sourcePaneId: payload.sourcePaneId,
        targetPaneId: paneId
      });
    });
  }

  function toFileUri(filePath) {
    let p = filePath.replace(/\\/g, '/');
    if (!p.startsWith('/')) {
      p = '/' + p;
    }
    return 'file://' + encodeURI(p);
  }

  function getParentDir(filePath) {
    const norm = filePath.replace(/\\/g, '/');
    const lastSlash = norm.lastIndexOf('/');
    if (lastSlash <= 0) return norm;
    return norm.substring(0, lastSlash);
  }

  function isTreeDrag(e) {
    if (!e.dataTransfer) return false;
    const types = Array.from(e.dataTransfer.types || []);
    if (types.includes('application/vnd.code.treepane.reorder')) {
      return false;
    }
    return true;
  }

  function decodeAdvancedFilePath(str) {
    if (!str) return str;
    const match = str.trim().match(/^\(file;file:\/\/\/?([^)]+)\)$/i);
    if (match) {
      let p = decodeURIComponent(match[1]);
      if (/^\/[a-zA-Z]:/.test(p)) {
        p = p.substring(1);
      }
      return p;
    }
    return str.trim();
  }

  function extractTreePayload(e) {
    if (currentDragSource && currentDragSource.sourcePaths) {
      return currentDragSource;
    }
    if (currentDragSource && currentDragSource.sourcePath) {
      return {
        ...currentDragSource,
        sourcePaths: [currentDragSource.sourcePath]
      };
    }
    if (!e.dataTransfer) return null;

    try {
      const raw = e.dataTransfer.getData('application/vnd.code.tree.treepane') || e.dataTransfer.getData('application/json');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (parsed.sourcePaths && Array.isArray(parsed.sourcePaths)) return parsed;
          if (parsed.sourcePath) return { ...parsed, sourcePaths: [parsed.sourcePath] };
        }
      }
    } catch (_) {}

    try {
      const customPath = e.dataTransfer.getData('text/x-treepane-path');
      if (customPath) {
        const lines = customPath.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          return { sourcePaths: lines, sourcePath: lines[0], isDirectory: false, sourcePaneId: null };
        }
      }
    } catch (_) {}

    try {
      const plain = e.dataTransfer.getData('text/plain');
      if (plain) {
        const lines = plain.split('\n').map((l) => decodeAdvancedFilePath(l.trim())).filter(Boolean);
        if (lines.length > 0) {
          return { sourcePaths: lines, sourcePath: lines[0], isDirectory: false, sourcePaneId: null };
        }
      }
    } catch (_) {}

    try {
      const uriList = e.dataTransfer.getData('text/uri-list');
      if (uriList) {
        const lines = uriList.split('\n')
          .map((l) => l.trim())
          .filter((l) => l.startsWith('file://'))
          .map((l) => {
            let p = decodeURI(l.replace(/^file:\/\/\/?/, ''));
            if (/^\/[a-zA-Z]:/.test(p)) p = p.substring(1);
            return p;
          })
          .filter(Boolean);
        if (lines.length > 0) {
          return { sourcePaths: lines, sourcePath: lines[0], isDirectory: false, sourcePaneId: null };
        }
      }
    } catch (_) {}

    return null;
  }

  function clearAllDragIndicators() {
    document.querySelectorAll('.drag-over-folder, .drag-over-top, .drag-over-bottom, .drag-over-pane').forEach((el) => {
      el.classList.remove('drag-over-folder', 'drag-over-top', 'drag-over-bottom', 'drag-over-pane');
    });
  }

  function reorderTreeNodesLocally(paneId, sourcePath, targetPath, position) {
    const tree = state.trees[paneId];
    if (!tree) return;

    function reorderInArray(list) {
      const srcIdx = list.findIndex((n) => n.path === sourcePath);
      const tgtIdx = list.findIndex((n) => n.path === targetPath);
      if (srcIdx !== -1 && tgtIdx !== -1) {
        const [item] = list.splice(srcIdx, 1);
        const newTgtIdx = list.findIndex((n) => n.path === targetPath);
        const insertIdx = position === 'before' ? newTgtIdx : newTgtIdx + 1;
        list.splice(insertIdx, 0, item);
        return true;
      }
      for (const item of list) {
        if (item.isDirectory && item.children && item.children.length > 0) {
          if (reorderInArray(item.children)) return true;
        }
      }
      return false;
    }

    if (reorderInArray(tree.children || [])) {
      renderPaneTree(paneId);
    }
  }

  function checkChildMatches(node, matcher) {
    if (!node.children) return false;
    for (const child of node.children) {
      if (matcher.test(child.name)) return true;
      if (child.isDirectory && checkChildMatches(child, matcher)) return true;
    }
    return false;
  }

  function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return '🔷';
      case 'js':
      case 'jsx':
        return '🟨';
      case 'json':
        return '🟡';
      case 'md':
        return '📝';
      case 'ps1':
      case 'psm1':
        return '💙';
      case 'py':
        return '🐍';
      case 'sh':
      case 'bat':
        return '⚙️';
      case 'html':
      case 'htm':
        return '🌐';
      case 'css':
      case 'scss':
        return '🎨';
      case 'png':
      case 'jpg':
      case 'svg':
        return '🖼️';
      default:
        return '📄';
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeRegex(string) {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  // @ts-ignore
  window.addPaneClick = function () {
    vscode.postMessage({ command: 'addPane' });
  };

  // Signal ready to Extension Host
  vscode.postMessage({ command: 'ready' });
})();
