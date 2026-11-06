"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeSidebarProvider = void 0;
const vscode = require("vscode");
const WebviewUtils_1 = require("./WebviewUtils");
const FileSystemService_1 = require("./FileSystemService");
class TreeSidebarProvider {
    _context;
    static viewType = 'multipleTreePane.sidebarView';
    _view;
    _panes = [];
    _layout = 'vertical';
    constructor(_context) {
        this._context = _context;
        this._loadState();
    }
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._context.extensionUri]
        };
        webviewView.webview.html = WebviewUtils_1.WebviewUtils.getHtmlContent(webviewView.webview, this._context.extensionUri, 'sidebar');
        webviewView.webview.onDidReceiveMessage((message) => {
            WebviewUtils_1.WebviewUtils.handleInboundMessage(message, webviewView.webview, this._context, this._panes, this._layout, (newPanes, newLayout) => {
                this._panes = newPanes;
                this._layout = newLayout;
                this._saveState();
            });
        });
    }
    async addPane(folderPath) {
        if (!this._view) {
            return;
        }
        const defaultPath = folderPath || (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath.replace(/\\/g, '/') || '');
        const newPaneId = `pane_${Date.now()}`;
        const newName = defaultPath ? defaultPath.split('/').pop() || 'Pane' : 'New Tree';
        const newPane = {
            id: newPaneId,
            name: newName,
            rootPath: defaultPath,
            filterText: '',
            isCollapsed: false
        };
        this._panes.push(newPane);
        this._saveState();
        if (defaultPath) {
            const tree = await FileSystemService_1.FileSystemService.readFolderTree(defaultPath);
            this._view.webview.postMessage({
                command: 'renderTree',
                paneId: newPaneId,
                tree
            });
        }
    }
    refresh() {
        if (this._view) {
            this._view.webview.postMessage({ command: 'ready' });
        }
    }
    _loadState() {
        const saved = this._context.workspaceState.get('multiTreeState');
        if (saved && saved.panes && saved.panes.length > 0) {
            this._panes = saved.panes;
            this._layout = saved.layout || 'vertical';
        }
        else {
            // Initialize with default panes from workspace
            const defaultRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath.replace(/\\/g, '/') || '';
            this._panes = [
                {
                    id: 'pane_1',
                    name: defaultRoot ? defaultRoot.split('/').pop() || 'Tree 1' : 'Tree 1',
                    rootPath: defaultRoot,
                    filterText: '',
                    isCollapsed: false
                }
            ];
            this._layout = 'vertical';
        }
    }
    _saveState() {
        this._context.workspaceState.update('multiTreeState', {
            panes: this._panes,
            layout: this._layout
        });
    }
}
exports.TreeSidebarProvider = TreeSidebarProvider;
//# sourceMappingURL=TreeSidebarProvider.js.map