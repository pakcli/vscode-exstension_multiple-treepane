import * as vscode from 'vscode';
import { PaneConfig } from './types';
import { WebviewUtils } from './WebviewUtils';
import { FileSystemService } from './FileSystemService';

export class TreePanelManager {
  public static currentPanel: TreePanelManager | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _panes: PaneConfig[] = [];
  private _layout: 'horizontal' | 'vertical' = 'horizontal';

  public static createOrShow(context: vscode.ExtensionContext): void {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    if (TreePanelManager.currentPanel) {
      TreePanelManager.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'multipleTreePane.editorTab',
      '🌲 Multi-Tree Explorer',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri]
      }
    );

    TreePanelManager.currentPanel = new TreePanelManager(panel, context);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly _context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._loadState();

    this._panel.webview.html = WebviewUtils.getHtmlContent(
      this._panel.webview,
      this._context.extensionUri,
      'editor'
    );

    this._panel.webview.onDidReceiveMessage((message) => {
      WebviewUtils.handleInboundMessage(
        message,
        this._panel.webview,
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

    this._panel.onDidDispose(() => {
      TreePanelManager.currentPanel = undefined;
    });
  }

  private _loadState(): void {
    const saved = this._context.workspaceState.get<{ panes: PaneConfig[]; layout: 'horizontal' | 'vertical' }>('multiTreeState');
    if (saved && saved.panes && saved.panes.length > 0) {
      this._panes = saved.panes;
      this._layout = saved.layout || 'horizontal';
    } else {
      // Initialize with up to 3-5 distinct subfolders from workspace for instant multi-repo view!
      const workspaceFolders = vscode.workspace.workspaceFolders || [];
      const defaultRoot = workspaceFolders[0]?.uri.fsPath.replace(/\\/g, '/') || '';
      
      this._panes = [
        {
          id: 'pane_1',
          name: defaultRoot ? defaultRoot.split('/').pop() || 'Tree 1' : 'Tree 1',
          rootPath: defaultRoot,
          filterText: '',
          isCollapsed: false
        }
      ];
      this._layout = 'horizontal';
    }
  }

  private _saveState(): void {
    this._context.workspaceState.update('multiTreeState', {
      panes: this._panes,
      layout: this._layout
    });
  }
}
