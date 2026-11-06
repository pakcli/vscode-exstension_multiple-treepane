"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaneWatcherManager = void 0;
const vscode = require("vscode");
const path = require("path");
const WebviewUtils_1 = require("./WebviewUtils");
class PaneWatcherManager {
    static instance;
    watchers = new Map();
    clients = new Set();
    debounceTimer = null;
    pendingPaths = new Set();
    static getInstance() {
        if (!PaneWatcherManager.instance) {
            PaneWatcherManager.instance = new PaneWatcherManager();
        }
        return PaneWatcherManager.instance;
    }
    registerClient(client) {
        this.clients.add(client);
        this.syncWatchers();
        return {
            dispose: () => {
                this.clients.delete(client);
                this.syncWatchers();
            }
        };
    }
    syncWatchers() {
        const activeRoots = new Set();
        for (const client of this.clients) {
            for (const pane of client.getPanes()) {
                if (pane.rootPath) {
                    activeRoots.add(path.normalize(pane.rootPath));
                }
            }
        }
        // Dispose obsolete watchers
        for (const [watchedRoot, watcher] of this.watchers.entries()) {
            if (!activeRoots.has(watchedRoot)) {
                watcher.dispose();
                this.watchers.delete(watchedRoot);
            }
        }
        // Register new watchers
        for (const root of activeRoots) {
            if (!this.watchers.has(root)) {
                try {
                    const pattern = new vscode.RelativePattern(vscode.Uri.file(root), '**/*');
                    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
                    watcher.onDidCreate((uri) => this.queuePath(uri.fsPath));
                    watcher.onDidDelete((uri) => this.queuePath(uri.fsPath));
                    watcher.onDidChange((uri) => this.queuePath(uri.fsPath));
                    this.watchers.set(root, watcher);
                }
                catch (err) {
                    console.error(`Failed to register watcher for root: ${root}`, err);
                }
            }
        }
    }
    queuePath(filePath) {
        const norm = filePath.replace(/\\/g, '/');
        // Ignore transient files and build artifacts
        if (norm.includes('/node_modules/') ||
            norm.includes('/.git/') ||
            norm.includes('/out/') ||
            norm.includes('/dist/') ||
            norm.endsWith('.tmp') ||
            norm.endsWith('.bak') ||
            norm.endsWith('.old')) {
            return;
        }
        this.pendingPaths.add(norm);
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.flush();
        }, 150);
    }
    async flush() {
        if (this.pendingPaths.size === 0) {
            return;
        }
        const changedPaths = Array.from(this.pendingPaths);
        this.pendingPaths.clear();
        for (const client of this.clients) {
            const webview = client.getWebview();
            if (!webview) {
                continue;
            }
            const panes = client.getPanes();
            const affectedPaneIds = [];
            for (const pane of panes) {
                if (!pane.rootPath) {
                    continue;
                }
                const normRoot = pane.rootPath.replace(/\\/g, '/').toLowerCase();
                const isAffected = changedPaths.some((p) => {
                    const lowerP = p.toLowerCase();
                    return lowerP === normRoot || lowerP.startsWith(normRoot + '/');
                });
                if (isAffected) {
                    affectedPaneIds.push(pane.id);
                }
            }
            if (affectedPaneIds.length > 0) {
                await WebviewUtils_1.WebviewUtils.refreshPaneTrees(webview, panes, affectedPaneIds);
            }
        }
    }
    dispose() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        for (const watcher of this.watchers.values()) {
            watcher.dispose();
        }
        this.watchers.clear();
        this.clients.clear();
    }
}
exports.PaneWatcherManager = PaneWatcherManager;
//# sourceMappingURL=PaneWatcherManager.js.map