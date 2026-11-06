import * as vscode from 'vscode';
import * as path from 'path';
import { PaneConfig } from './types';
import { WebviewUtils } from './WebviewUtils';

export interface WatcherClient {
  getWebview: () => vscode.Webview | undefined;
  getPanes: () => PaneConfig[];
}

export class PaneWatcherManager implements vscode.Disposable {
  private static instance: PaneWatcherManager;
  private watchers = new Map<string, vscode.FileSystemWatcher>();
  private clients = new Set<WatcherClient>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingPaths = new Set<string>();

  public static getInstance(): PaneWatcherManager {
    if (!PaneWatcherManager.instance) {
      PaneWatcherManager.instance = new PaneWatcherManager();
    }
    return PaneWatcherManager.instance;
  }

  public registerClient(client: WatcherClient): vscode.Disposable {
    this.clients.add(client);
    this.syncWatchers();

    return {
      dispose: () => {
        this.clients.delete(client);
        this.syncWatchers();
      }
    };
  }

  public syncWatchers(): void {
    const activeRoots = new Set<string>();
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
        } catch (err) {
          console.error(`Failed to register watcher for root: ${root}`, err);
        }
      }
    }
  }

  private queuePath(filePath: string): void {
    const norm = filePath.replace(/\\/g, '/');
    // Ignore transient files and build artifacts
    if (
      norm.includes('/node_modules/') ||
      norm.includes('/.git/') ||
      norm.includes('/out/') ||
      norm.includes('/dist/') ||
      norm.endsWith('.tmp') ||
      norm.endsWith('.bak') ||
      norm.endsWith('.old')
    ) {
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

  private async flush(): Promise<void> {
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
      const affectedPaneIds: string[] = [];

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
        await WebviewUtils.refreshPaneTrees(webview, panes, affectedPaneIds);
      }
    }
  }

  public dispose(): void {
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
