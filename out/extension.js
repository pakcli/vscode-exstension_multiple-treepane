"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const TreeSidebarProvider_1 = require("./TreeSidebarProvider");
const TreePanelManager_1 = require("./TreePanelManager");
function activate(context) {
    // 1. Register Sidebar WebviewViewProvider (Sidepanel view)
    const sidebarProvider = new TreeSidebarProvider_1.TreeSidebarProvider(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(TreeSidebarProvider_1.TreeSidebarProvider.viewType, sidebarProvider, {
        webviewOptions: { retainContextWhenHidden: true }
    }));
    // 2. Register Editor Tab Command (Opens full-width horizontal multi-column tab)
    context.subscriptions.push(vscode.commands.registerCommand('multipleTreePane.openEditorTab', () => {
        TreePanelManager_1.TreePanelManager.createOrShow(context);
    }));
    // 3. Register Refresh Command
    context.subscriptions.push(vscode.commands.registerCommand('multipleTreePane.refresh', () => {
        sidebarProvider.refresh();
    }));
    // 4. Register Add Pane Command
    context.subscriptions.push(vscode.commands.registerCommand('multipleTreePane.addPane', () => {
        sidebarProvider.addPane();
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map