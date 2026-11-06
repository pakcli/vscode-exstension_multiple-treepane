import * as vscode from 'vscode';
import { PaneConfig } from './types';
import { WebviewUtils } from './WebviewUtils';
import { FileSystemService } from './FileSystemService';

export class TreeSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'multipleTreePane.sidebarView';
  private _view?: vscode.WebviewView;
  private _panes: PaneConfig[] = [];
  private _layout: 'horizontal' | 'vertical' = 'vertical';

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._loadState();
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri]
    };

    webviewView.webview.html = WebviewUtils.getHtmlContent(
      webviewView.webview,
      this._context.extensionUri,
      'sidebar'
    );

    webviewView.webview.onDidReceiveMessage((message) => {
      WebviewUtils.handleInboundMessage(
        message,
        webviewView.webview,
        this._context,
        this._panes,
        this._layout,
        (newPanes, newLayout) => {
          this._panes = newPanes;
          this._layout = newLayout;
          this._saveState();
        }
      );
    });
  }

  public async addPane(folderPath?: string): Promise<void> {
    if (!this._view) {
      return;
    }
    const defaultPath = folderPath || (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath.replace(/\\/g, '/') || '');
    const newPaneId = `pane_${Date.now()}`;
    const newName = defaultPath ? defaultPath.split('/').pop() || 'Pane' : 'New Tree';
    const newPane: PaneConfig = {
      id: newPaneId,
      name: newName,
      rootPath: defaultPath,
      filterText: '',
      isCollapsed: false
    };
    this._panes.push(newPane);
    this._saveState();

    if (defaultPath) {
      const tree = await FileSystemService.readFolderTree(defaultPath);
      this._view.webview.postMessage({
        command: 'renderTree',
        paneId: newPaneId,
        tree
      });
    }
  }

  public refresh(): void {
    if (this._view) {
      this._view.webview.postMessage({ command: 'ready' });
    }
  }

  private _loadState(): void {
    const saved = this._context.workspaceState.get<{ panes: PaneConfig[]; layout: 'horizontal' | 'vertical' }>('multiTreeState');
    if (saved && saved.panes && saved.panes.length > 0) {
      this._panes = saved.panes;
      this._layout = saved.layout || 'vertical';
    } else {
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

  private _saveState(): void {
    this._context.workspaceState.update('multiTreeState', {
      panes: this._panes,
      layout: this._layout
    });
  }
}
