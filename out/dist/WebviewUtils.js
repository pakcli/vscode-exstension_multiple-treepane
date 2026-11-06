"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebviewUtils = void 0;
const vscode = require("vscode");
const FileSystemService_1 = require("./FileSystemService");
class WebviewUtils {
    static async handleInboundMessage(message, webview, context, panes, currentLayout, onPanesChange) {
        switch (message.command) {
            case 'ready': {
                const repos = await FileSystemService_1.FileSystemService.discoverWorkspaceRepos();
                const gitRepos = repos.filter((r) => r.isGit);
                // If panes is empty or only contains a non-git umbrella root, default to actual git repos!
                if (panes.length === 0 ||
                    (panes.length === 1 && !FileSystemService_1.FileSystemService.checkIsGitRepoSync(panes[0].rootPath) && gitRepos.length > 0)) {
                    const defaults = gitRepos.length > 0 ? gitRepos.slice(0, 3) : repos.slice(0, 1);
                    panes.length = 0;
                    defaults.forEach((r, i) => {
                        panes.push({
                            id: `pane_${Date.now()}_${i}`,
                            name: r.name,
                            rootPath: r.path,
                            filterText: '',
                            searchOptions: { matchCase: false, matchWholeWord: false, useRegex: false },
                            isCollapsed: false,
                            isHidden: false
                        });
                    });
                    onPanesChange(panes, currentLayout);
                }
                webview.postMessage({
                    command: 'init',
                    panes,
                    availableRepos: repos,
                    defaultLayout: currentLayout
                });
                // Render tree for each pane
                for (const pane of panes) {
                    if (pane.rootPath && !pane.isHidden) {
                        const tree = await FileSystemService_1.FileSystemService.readFolderTree(pane.rootPath);
                        webview.postMessage({
                            command: 'renderTree',
                            paneId: pane.id,
                            tree
                        });
                    }
                }
                break;
            }
            case 'openFile': {
                await FileSystemService_1.FileSystemService.openFileInEditor(message.filePath);
                break;
            }
            case 'requestFolder': {
                const tree = await FileSystemService_1.FileSystemService.readFolderTree(message.folderPath);
                webview.postMessage({
                    command: 'renderTree',
                    paneId: message.paneId,
                    tree
                });
                break;
            }
            case 'loadSubfolder': {
                const children = await FileSystemService_1.FileSystemService.readSubfolderChildren(message.folderPath);
                webview.postMessage({
                    command: 'subfolderLoaded',
                    paneId: message.paneId,
                    folderPath: message.folderPath,
                    children
                });
                break;
            }
            case 'selectFolder': {
                const picked = await FileSystemService_1.FileSystemService.promptSelectFolder();
                if (picked) {
                    const targetPane = panes.find((p) => p.id === message.paneId);
                    if (targetPane) {
                        targetPane.rootPath = picked;
                        targetPane.name = picked.split('/').pop() || picked;
                        const tree = await FileSystemService_1.FileSystemService.readFolderTree(picked);
                        webview.postMessage({
                            command: 'paneFolderUpdated',
                            paneId: message.paneId,
                            newPath: picked,
                            tree
                        });
                        onPanesChange(panes, currentLayout);
                    }
                }
                break;
            }
            case 'addPane': {
                const defaultPath = message.folderPath || (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath.replace(/\\/g, '/') || '');
                const newPaneId = `pane_${Date.now()}`;
                const newName = defaultPath ? defaultPath.split('/').pop() || 'Pane' : 'New Tree';
                const newPane = {
                    id: newPaneId,
                    name: newName,
                    rootPath: defaultPath,
                    filterText: '',
                    isCollapsed: false,
                    size: 280
                };
                panes.push(newPane);
                onPanesChange(panes, currentLayout);
                if (defaultPath) {
                    const tree = await FileSystemService_1.FileSystemService.readFolderTree(defaultPath);
                    webview.postMessage({
                        command: 'renderTree',
                        paneId: newPaneId,
                        tree
                    });
                }
                break;
            }
            case 'removePane': {
                const idx = panes.findIndex((p) => p.id === message.paneId);
                if (idx !== -1) {
                    panes.splice(idx, 1);
                    onPanesChange(panes, currentLayout);
                }
                break;
            }
            case 'reorderPanes': {
                const { sourceIndex, targetIndex } = message;
                if (sourceIndex >= 0 &&
                    sourceIndex < panes.length &&
                    targetIndex >= 0 &&
                    targetIndex < panes.length) {
                    const [moved] = panes.splice(sourceIndex, 1);
                    panes.splice(targetIndex, 0, moved);
                    onPanesChange(panes, currentLayout);
                }
                break;
            }
            case 'movePaneFirst': {
                const idx = panes.findIndex((p) => p.id === message.paneId);
                if (idx > 0) {
                    const [moved] = panes.splice(idx, 1);
                    panes.unshift(moved);
                    onPanesChange(panes, currentLayout);
                }
                break;
            }
            case 'movePaneShift': {
                const idx = panes.findIndex((p) => p.id === message.paneId);
                if (idx !== -1) {
                    const targetIdx = message.direction === 'left' ? idx - 1 : idx + 1;
                    if (targetIdx >= 0 && targetIdx < panes.length) {
                        const [moved] = panes.splice(idx, 1);
                        panes.splice(targetIdx, 0, moved);
                        onPanesChange(panes, currentLayout);
                    }
                }
                break;
            }
            case 'toggleLayout': {
                const nextLayout = currentLayout === 'horizontal' ? 'vertical' : 'horizontal';
                onPanesChange(panes, nextLayout);
                webview.postMessage({
                    command: 'setLayout',
                    layout: nextLayout
                });
                break;
            }
            case 'updatePaneFilter': {
                const target = panes.find((p) => p.id === message.paneId);
                if (target) {
                    target.filterText = message.filterText;
                    onPanesChange(panes, currentLayout);
                }
                break;
            }
            case 'savePanesState': {
                onPanesChange(message.panes, message.layout);
                break;
            }
            case 'moveItem': {
                const { sourcePath, targetDirPath, sourcePaneId, targetPaneId } = message;
                const res = await FileSystemService_1.FileSystemService.moveItem(sourcePath, targetDirPath);
                if (res.success) {
                    await WebviewUtils.refreshPaneTrees(webview, panes, panes.map((p) => p.id));
                }
                break;
            }
            case 'copyItem': {
                const { sourcePath, targetDirPath, sourcePaneId, targetPaneId } = message;
                const res = await FileSystemService_1.FileSystemService.copyItem(sourcePath, targetDirPath);
                if (res.success) {
                    await WebviewUtils.refreshPaneTrees(webview, panes, panes.map((p) => p.id));
                }
                break;
            }
            case 'moveItems': {
                const { sourcePaths, targetDirPath } = message;
                const res = await FileSystemService_1.FileSystemService.moveItems(sourcePaths, targetDirPath);
                if (res.success) {
                    await WebviewUtils.refreshPaneTrees(webview, panes, panes.map((p) => p.id));
                }
                break;
            }
            case 'copyItems': {
                const { sourcePaths, targetDirPath } = message;
                const res = await FileSystemService_1.FileSystemService.copyItems(sourcePaths, targetDirPath);
                if (res.success) {
                    await WebviewUtils.refreshPaneTrees(webview, panes, panes.map((p) => p.id));
                }
                break;
            }
            case 'renameItem': {
                const res = await FileSystemService_1.FileSystemService.renameItem(message.oldPath, message.newName);
                if (res.success) {
                    await WebviewUtils.refreshPaneTrees(webview, panes, panes.map((p) => p.id));
                }
                break;
            }
            case 'createNewItem': {
                const { targetDirPath, isFolder, paneId } = message;
                const res = await FileSystemService_1.FileSystemService.createNewItem(targetDirPath, Boolean(isFolder));
                if (res.success) {
                    await WebviewUtils.refreshPaneTrees(webview, panes, [paneId]);
                }
                break;
            }
            case 'moveToRepo': {
                const repos = await FileSystemService_1.FileSystemService.discoverWorkspaceRepos();
                if (repos.length === 0) {
                    vscode.window.showWarningMessage('No workspace repositories available.');
                    break;
                }
                const items = repos.map((r) => ({
                    label: `${r.isGit ? '$(repo)' : '$(folder)'} ${r.name}`,
                    description: r.path,
                    detail: r.isGit ? 'Git Repository' : 'Workspace Directory',
                    repo: r
                }));
                const countText = message.sourcePaths.length > 1 ? `${message.sourcePaths.length} items` : 'item';
                const picked = await vscode.window.showQuickPick(items, {
                    placeHolder: `Select destination repository/directory to move ${countText} to:`
                });
                if (picked) {
                    const res = await FileSystemService_1.FileSystemService.moveItems(message.sourcePaths, picked.repo.path);
                    if (res.success) {
                        await WebviewUtils.refreshPaneTrees(webview, panes, panes.map((p) => p.id));
                    }
                }
                break;
            }
            case 'copyToClipboard': {
                await vscode.env.clipboard.writeText(message.text);
                vscode.window.setStatusBarMessage(`Copied: ${message.text}`, 3000);
                break;
            }
            case 'copySelectedContent': {
                await FileSystemService_1.FileSystemService.copySelectedContent(message.paths);
                break;
            }
            case 'openSourceControl': {
                await FileSystemService_1.FileSystemService.openSourceControlForRepo(message.repoPath);
                break;
            }
            case 'openInTerminal': {
                await FileSystemService_1.FileSystemService.openInTerminal(message.folderPath);
                break;
            }
            case 'sendToTerminal': {
                await FileSystemService_1.FileSystemService.sendPathsToTerminal(message.paths, Boolean(message.execute));
                break;
            }
            case 'openToSide': {
                await FileSystemService_1.FileSystemService.openToSide(message.filePath);
                break;
            }
            case 'compareFiles': {
                await FileSystemService_1.FileSystemService.compareFiles(message.sourcePath, message.targetPath);
                break;
            }
            case 'findInFolder': {
                await FileSystemService_1.FileSystemService.findInFolder(message.folderPath);
                break;
            }
            case 'deleteItem': {
                const res = await FileSystemService_1.FileSystemService.deleteItem(message.filePath, message.useTrash !== false);
                if (res.success) {
                    await WebviewUtils.refreshPaneTrees(webview, panes, [message.paneId]);
                }
                break;
            }
            case 'duplicateItem': {
                const res = await FileSystemService_1.FileSystemService.duplicateItem(message.sourcePath);
                if (res.success) {
                    await WebviewUtils.refreshPaneTrees(webview, panes, [message.paneId]);
                }
                break;
            }
            case 'revealInOS': {
                const uri = vscode.Uri.file(message.filePath);
                await vscode.commands.executeCommand('revealFileInOS', uri);
                break;
            }
        }
    }
    /**
     * Refreshes the tree data for designated panes and dispatches updated trees to the webview.
     */
    static async refreshPaneTrees(webview, panes, paneIds) {
        const validIds = Array.from(new Set(paneIds.filter(Boolean)));
        for (const paneId of validIds) {
            const pane = panes.find((p) => p.id === paneId);
            if (pane && pane.rootPath) {
                const tree = await FileSystemService_1.FileSystemService.readFolderTree(pane.rootPath);
                webview.postMessage({
                    command: 'renderTree',
                    paneId: pane.id,
                    tree
                });
            }
        }
    }
    static getHtmlContent(webview, extensionUri, initialMode) {
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.css'));
        const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));
        const defaultLayout = initialMode === 'sidebar' ? 'vertical' : 'horizontal';
        const nonce = getNonce();
        return `<!DOCTYPE html>
<html lang="en" data-vscode-context='{"preventDefaultContextMenuItems": true}'>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
  <link href="${cssUri}" rel="stylesheet">
  <title>Multiple TreePane Explorer</title>
</head>
<body data-mode="${initialMode}" data-layout="${defaultLayout}" data-vscode-context='{"preventDefaultContextMenuItems": true}'>
  <header class="treepane-header">
    <div class="header-left">
      <span class="header-title">TreePane Explorer</span>
      <span class="pane-count-badge" id="paneCountBadge">0 trees</span>
    </div>
    <div class="header-actions">
      <div class="repos-dropdown-wrapper" id="reposDropdownWrapper">
        <button class="icon-btn" id="btnToggleRepoDropdown" title="Toggle Workspace Repositories (Show / Hide)">
          <span class="btn-icon">📁</span>
          <span class="btn-text" id="repoDropdownLabel">Repos ▾</span>
        </button>
        <div class="repos-dropdown-menu" id="reposDropdownMenu" style="display: none;">
          <div class="repos-filter-toggle-bar">
            <button class="filter-tab-btn active" id="btnFilterReposOnly" title="Show only Git repositories">Git Repos</button>
            <button class="filter-tab-btn" id="btnFilterAllTypes" title="Show all workspace folders">All Folders</button>
          </div>
          <div class="repos-menu-header">
            <span class="repos-menu-title" id="reposMenuCountLabel">Repositories (A-Z)</span>
            <div class="repos-menu-actions">
              <button class="menu-action-btn" id="btnShowAllRepos">All</button>
              <button class="menu-action-btn" id="btnHideAllRepos">None</button>
            </div>
          </div>
          <div class="repos-menu-list" id="repoChipsList">
            <!-- Dynamic checkboxes rendered via main.js -->
          </div>
        </div>
      </div>

      <button class="icon-btn" id="btnToggleViewMode" title="Toggle between Multi-Tree Split and Single-Repo Focus Mode">
        <span class="btn-icon" id="viewModeIcon">⬚</span>
        <span class="btn-text" id="viewModeText">Focus</span>
      </button>
      <button class="icon-btn btn-primary" id="btnAddPane" title="Add folder tree pane">
        <span class="btn-icon">+</span>
        <span class="btn-text">Add Tree</span>
      </button>
      <button class="icon-btn" id="btnRefreshAll" title="Refresh all trees">
        <span class="btn-icon">↻</span>
      </button>
      <button class="icon-btn" id="btnOpenSettings" title="Settings">
        <span class="btn-icon">⚙</span>
      </button>
    </div>
  </header>

  <main class="treepane-viewport">
    <div class="panes-container layout-${defaultLayout}" id="panesContainer">
      <!-- Dynamic Panes & Split Resizers rendered via main.js -->
    </div>
  </main>

  <!-- Settings Modal Dialog -->
  <div class="settings-modal-backdrop" id="settingsModalBackdrop" style="display: none;">
    <div class="settings-modal">
      <div class="modal-header">
        <h3>⚙ Multiple TreePane Settings</h3>
        <button class="icon-btn btn-close-modal" id="btnCloseSettings">✕</button>
      </div>
      <div class="modal-body">
        <div class="setting-group">
          <label class="setting-label">Split Layout Direction:</label>
          <div class="radio-options">
            <label><input type="radio" name="settingLayout" value="horizontal"> Horizontal (Side-by-Side: T | T | T)</label>
            <label><input type="radio" name="settingLayout" value="vertical"> Vertical (Stacked: T / T / T)</label>
            <label><input type="radio" name="settingLayout" value="auto"> Auto-Detect by Viewport Width</label>
          </div>
        </div>

        <div class="setting-group">
          <label class="setting-label">Active Tree Ordering & Priority:</label>
          <p class="setting-desc">Use [:::] to drag & drop panes, [<] / [>] arrows to shift, or [First] to bring any tree to the front.</p>
          <ul class="settings-pane-list" id="settingsPaneList">
            <!-- Dynamic pane order items -->
          </ul>
        </div>

        <div class="setting-group">
          <label class="setting-label">Pane Sizing Actions:</label>
          <button class="icon-btn" id="btnResetSizes">Reset All Panes to Equal Width</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="icon-btn btn-primary" id="btnSaveSettings">Done</button>
      </div>
    </div>
  </div>

  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
    }
}
exports.WebviewUtils = WebviewUtils;
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=WebviewUtils.js.map