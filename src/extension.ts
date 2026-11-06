import * as vscode from 'vscode';
import { TreeSidebarProvider } from './TreeSidebarProvider';
import { TreePanelManager } from './TreePanelManager';

export function activate(context: vscode.ExtensionContext) {
  // 1. Register Sidebar WebviewViewProvider (Sidepanel view)
  const sidebarProvider = new TreeSidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(TreeSidebarProvider.viewType, sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  // 2. Register Editor Tab Command (Opens full-width horizontal multi-column tab)
  context.subscriptions.push(
    vscode.commands.registerCommand('multipleTreePane.openEditorTab', () => {
      TreePanelManager.createOrShow(context);
    })
  );

  // 3. Register Refresh Command
  context.subscriptions.push(
    vscode.commands.registerCommand('multipleTreePane.refresh', () => {
      sidebarProvider.refresh();
    })
  );

  // 4. Register Add Pane Command
  context.subscriptions.push(
    vscode.commands.registerCommand('multipleTreePane.addPane', () => {
      sidebarProvider.addPane();
    })
  );
}

export function deactivate() {}
