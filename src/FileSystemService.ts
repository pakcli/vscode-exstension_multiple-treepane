import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TreeNode, RepoOption } from './types';

export class FileSystemService {
  /**
   * Scans workspace folders and subdirectories to discover active repositories/projects.
   */
  public static async discoverWorkspaceRepos(): Promise<RepoOption[]> {
    const repos: RepoOption[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders || [];

    for (const folder of workspaceFolders) {
      const rootPath = folder.uri.fsPath;
      const rootIsGit = this.checkIsGitRepoSync(rootPath);

      if (rootIsGit) {
        repos.push({
          name: folder.name,
          path: rootPath.replace(/\\/g, '/'),
          isGit: true
        });
      }

      // Scan 1 level down for sub-repos or project folders
      try {
        if (fs.existsSync(rootPath)) {
          const entries = fs.readdirSync(rootPath, { withFileTypes: true });
          for (const entry of entries) {
            if (
              entry.isDirectory() &&
              !entry.name.startsWith('.') &&
              entry.name !== 'node_modules' &&
              entry.name !== 'trash-bin' &&
              entry.name !== 'dist' &&
              entry.name !== 'build'
            ) {
              const fullSubPath = path.join(rootPath, entry.name);
              const isGit = this.checkIsGitRepoSync(fullSubPath);
              repos.push({
                name: entry.name,
                path: fullSubPath.replace(/\\/g, '/'),
                isGit
              });
            }
          }
        }
      } catch {
        // Silently continue if directory read fails
      }

      // If root is not git, add it as a general workspace folder option
      if (!rootIsGit) {
        repos.push({
          name: `${folder.name} (Workspace Root)`,
          path: rootPath.replace(/\\/g, '/'),
          isGit: false
        });
      }
    }

    // Sort: Git repos first, then alphabetically
    return repos.sort((a, b) => {
      if (a.isGit !== b.isGit) {
        return a.isGit ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  /**
   * Synchronously checks if a folder is a Git repository (.git dir or file).
   */
  public static checkIsGitRepoSync(folderPath: string): boolean {
    try {
      const gitPath = path.join(folderPath, '.git');
      return fs.existsSync(gitPath);
    } catch {
      return false;
    }
  }

  /**
   * Reads a folder and builds a shallow or recursive TreeNode structure.
   */
  public static async readFolderTree(folderPath: string, maxDepth: number = 7): Promise<TreeNode> {
    const normPath = folderPath.replace(/\\/g, '/');
    const folderName = path.basename(normPath) || normPath;
    const uri = vscode.Uri.file(normPath);

    const isGit = this.checkIsGitRepoSync(normPath);
    const rootNode: TreeNode = {
      name: folderName,
      path: normPath,
      isDirectory: true,
      isGitRepo: isGit,
      isExpanded: true,
      children: []
    };

    rootNode.children = await this.readChildren(uri, 1, maxDepth);
    return rootNode;
  }

  /**
   * Reads direct children of a subfolder on demand for dynamic/lazy expansion.
   */
  public static async readSubfolderChildren(folderPath: string, depth: number = 3): Promise<TreeNode[]> {
    const normPath = folderPath.replace(/\\/g, '/');
    const uri = vscode.Uri.file(normPath);
    return this.readChildren(uri, 1, depth);
  }

  /**
   * Helper to read children up to maxDepth.
   */
  private static async readChildren(uri: vscode.Uri, currentDepth: number, maxDepth: number): Promise<TreeNode[]> {
    if (currentDepth > maxDepth) {
      return [];
    }

    try {
      const entries = await vscode.workspace.fs.readDirectory(uri);
      // Sort directories first, then files alphabetically
      entries.sort((a, b) => {
        if (a[1] === b[1]) {
          return a[0].localeCompare(b[0]);
        }
        return a[1] === vscode.FileType.Directory ? -1 : 1;
      });

      const nodes: TreeNode[] = [];

      for (const [name, type] of entries) {
        if (
          name === '.git' ||
          name === 'node_modules' ||
          name === 'trash-bin' ||
          name === '.next' ||
          name === '.nuxt' ||
          name === '.cache' ||
          name === 'dist' ||
          name === 'build'
        ) {
          continue;
        }

        const childUri = vscode.Uri.file(path.join(uri.fsPath, name));
        const childPath = childUri.fsPath.replace(/\\/g, '/');
        const isDir = type === vscode.FileType.Directory;

        const node: TreeNode = {
          name,
          path: childPath,
          isDirectory: isDir,
          isExpanded: false
        };

        if (isDir) {
          node.isGitRepo = this.checkIsGitRepoSync(childPath);
          if (currentDepth < maxDepth) {
            node.children = await this.readChildren(childUri, currentDepth + 1, maxDepth);
          } else {
            node.children = [];
          }
        }

        nodes.push(node);
      }

      return nodes;
    } catch {
      return [];
    }
  }

  /**
   * Opens a file in the active editor area.
   */
  public static async openFileInEditor(filePath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(filePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: true, preserveFocus: false });
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to open file: ${filePath}`);
    }
  }

  /**
   * Prompts user with native folder dialog to pick a target directory.
   */
  public static async promptSelectFolder(): Promise<string | undefined> {
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select Tree Root'
    });

    if (selected && selected.length > 0) {
      return selected[0].fsPath.replace(/\\/g, '/');
    }
    return undefined;
  }

  /**
   * Moves a file or directory into target directory.
   */
  public static async moveItem(sourcePath: string, targetDirPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const normSource = sourcePath.replace(/\\/g, '/');
      const normTargetDir = targetDirPath.replace(/\\/g, '/');
      const fileName = path.basename(normSource);
      const destPath = path.posix.join(normTargetDir, fileName);

      const lowerSource = normSource.toLowerCase();
      const lowerDest = destPath.toLowerCase();
      const lowerTargetDir = normTargetDir.toLowerCase();

      if (lowerSource === lowerDest) {
        return { success: false, error: 'Source and destination locations are identical.' };
      }

      if (lowerTargetDir === lowerSource || lowerTargetDir.startsWith(lowerSource + '/')) {
        vscode.window.showWarningMessage(`Cannot move directory into its own child hierarchy.`);
        return { success: false, error: 'Cannot move directory into its own hierarchy.' };
      }

      const sourceUri = vscode.Uri.file(normSource);
      let destUri = vscode.Uri.file(destPath);
      let finalName = fileName;

      // Handle existing file collision smoothly without blocking modals
      try {
        await vscode.workspace.fs.stat(destUri);
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        const timestamp = Date.now().toString().slice(-4);
        finalName = `${base}_${timestamp}${ext}`;
        destUri = vscode.Uri.file(path.posix.join(normTargetDir, finalName));
      } catch {
        // Target doesn't exist, proceed safely
      }

      await vscode.workspace.fs.rename(sourceUri, destUri, { overwrite: true });
      vscode.window.showInformationMessage(`Moved: ${fileName} -> ${path.basename(normTargetDir)}/${finalName !== fileName ? ` (${finalName})` : ''}`);
      return { success: true };
    } catch (err: any) {
      vscode.window.showErrorMessage(`Move failed: ${err.message || err}`);
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Copies a file or directory into target directory.
   */
  public static async copyItem(sourcePath: string, targetDirPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const normSource = sourcePath.replace(/\\/g, '/');
      const normTargetDir = targetDirPath.replace(/\\/g, '/');
      const fileName = path.basename(normSource);
      let destPath = path.posix.join(normTargetDir, fileName);

      const lowerSource = normSource.toLowerCase();
      const lowerTargetDir = normTargetDir.toLowerCase();

      if (lowerTargetDir === lowerSource || lowerTargetDir.startsWith(lowerSource + '/')) {
        vscode.window.showWarningMessage(`Cannot copy directory into its own child hierarchy.`);
        return { success: false, error: 'Cannot copy directory into its own hierarchy.' };
      }

      const sourceUri = vscode.Uri.file(normSource);
      let destUri = vscode.Uri.file(destPath);

      try {
        await vscode.workspace.fs.stat(destUri);
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        const timestamp = Date.now().toString().slice(-4);
        const newName = `${base}_copy_${timestamp}${ext}`;
        destUri = vscode.Uri.file(path.posix.join(normTargetDir, newName));
      } catch {
        // Safe to copy
      }

      await vscode.workspace.fs.copy(sourceUri, destUri, { overwrite: false });
      vscode.window.showInformationMessage(`Copied: ${fileName} -> ${path.basename(normTargetDir)}/`);
      return { success: true };
    } catch (err: any) {
      vscode.window.showErrorMessage(`Copy failed: ${err.message || err}`);
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Renames a file or directory.
   */
  public static async renameItem(
    oldPath: string,
    newName?: string
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    try {
      const normOld = oldPath.replace(/\\/g, '/');
      const oldBase = path.basename(normOld);

      let targetName = newName?.trim();
      if (!targetName) {
        const ext = path.extname(oldBase);
        const nameWithoutExt = path.basename(oldBase, ext);
        targetName = await vscode.window.showInputBox({
          prompt: `Rename '${oldBase}' to:`,
          value: oldBase,
          valueSelection: [0, nameWithoutExt.length]
        });
      }

      if (!targetName || targetName === oldBase) {
        return { success: false };
      }

      const parentDir = path.dirname(normOld);
      const newFullPath = path.posix.join(parentDir.replace(/\\/g, '/'), targetName);
      const oldUri = vscode.Uri.file(normOld);
      const newUri = vscode.Uri.file(newFullPath);

      await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: false });
      vscode.window.showInformationMessage(`Renamed: ${oldBase} -> ${targetName}`);
      return { success: true, newPath: newFullPath };
    } catch (err: any) {
      vscode.window.showErrorMessage(`Rename failed: ${err.message || err}`);
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Moves multiple files or directories into a target directory.
   */
  public static async moveItems(
    sourcePaths: string[],
    targetDirPath: string
  ): Promise<{ success: boolean; movedCount: number; errors: string[] }> {
    let movedCount = 0;
    const errors: string[] = [];

    for (const src of sourcePaths) {
      const res = await this.moveItem(src, targetDirPath);
      if (res.success) {
        movedCount++;
      } else if (res.error) {
        errors.push(`${path.basename(src)}: ${res.error}`);
      }
    }

    if (movedCount > 1) {
      vscode.window.showInformationMessage(`Moved ${movedCount} items to ${path.basename(targetDirPath)}/`);
    }
    return { success: movedCount > 0, movedCount, errors };
  }

  /**
   * Copies multiple files or directories into a target directory.
   */
  public static async copyItems(
    sourcePaths: string[],
    targetDirPath: string
  ): Promise<{ success: boolean; copiedCount: number; errors: string[] }> {
    let copiedCount = 0;
    const errors: string[] = [];

    for (const src of sourcePaths) {
      const res = await this.copyItem(src, targetDirPath);
      if (res.success) {
        copiedCount++;
      } else if (res.error) {
        errors.push(`${path.basename(src)}: ${res.error}`);
      }
    }

    if (copiedCount > 1) {
      vscode.window.showInformationMessage(`Copied ${copiedCount} items to ${path.basename(targetDirPath)}/`);
    }
    return { success: copiedCount > 0, copiedCount, errors };
  }

  /**
   * Reads the text content of selected file(s) and copies it to the clipboard.
   * Formats multi-file selections cleanly with file headers.
   */
  public static async copySelectedContent(paths: string[]): Promise<void> {
    if (!paths || paths.length === 0) {
      return;
    }

    const fileEntries: { path: string; name: string; content: string }[] = [];

    for (const p of paths) {
      try {
        const normPath = p.replace(/\\/g, '/');
        const uri = vscode.Uri.file(normPath);
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type === vscode.FileType.File) {
          const raw = await vscode.workspace.fs.readFile(uri);
          const text = Buffer.from(raw).toString('utf8');
          fileEntries.push({
            path: normPath,
            name: path.basename(normPath),
            content: text
          });
        }
      } catch {
        // Skip inaccessible file
      }
    }

    if (fileEntries.length === 0) {
      vscode.window.showWarningMessage('No readable files in selection to copy content.');
      return;
    }

    let resultText = '';
    if (fileEntries.length === 1) {
      resultText = fileEntries[0].content;
    } else {
      resultText = fileEntries
        .map((f) => `// === File: ${f.name} (${f.path}) ===\n${f.content}`)
        .join('\n\n');
    }

    await vscode.env.clipboard.writeText(resultText);
    vscode.window.setStatusBarMessage(
      `Copied content of ${fileEntries.length} file(s) to clipboard`,
      3000
    );
  }

  /**
   * Opens and focuses the native Source Control view for the specified repository.
   */
  public static async openSourceControlForRepo(repoPath: string): Promise<void> {
    try {
      // First reveal / focus the Source Control view container
      await vscode.commands.executeCommand('workbench.view.scm');

      // Attempt to focus the specific repo if VS Code's git extension is available
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (gitExtension) {
        if (!gitExtension.isActive) {
          await gitExtension.activate();
        }
        const git = gitExtension.exports?.getAPI?.(1);
        if (git && git.repositories && git.repositories.length > 0) {
          const normTarget = repoPath.replace(/\\/g, '/').toLowerCase();
          const targetRepo = git.repositories.find((r: any) => {
            const rPath = r.rootUri.fsPath.replace(/\\/g, '/').toLowerCase();
            return rPath === normTarget || normTarget.startsWith(rPath);
          });
          if (targetRepo && targetRepo.ui) {
            if (typeof targetRepo.ui.focus === 'function') {
              targetRepo.ui.focus();
            }
          }
        }
      }
      vscode.window.setStatusBarMessage(`Opened Source Control: ${path.basename(repoPath)}`, 3000);
    } catch {
      // Fallback: make sure at least Source Control view is opened
      await vscode.commands.executeCommand('workbench.view.scm');
    }
  }
}
