"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemService = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const GitStatusService_1 = require("./GitStatusService");
class FileSystemService {
    /**
     * Scans workspace folders and subdirectories to discover active repositories/projects.
     */
    static async discoverWorkspaceRepos() {
        const repos = [];
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
                        if (entry.isDirectory() &&
                            !entry.name.startsWith('.') &&
                            entry.name !== 'node_modules' &&
                            entry.name !== 'trash-bin' &&
                            entry.name !== 'dist' &&
                            entry.name !== 'build') {
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
            }
            catch {
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
    static checkIsGitRepoSync(folderPath) {
        try {
            const gitPath = path.join(folderPath, '.git');
            return fs.existsSync(gitPath);
        }
        catch {
            return false;
        }
    }
    /**
     * Reads a folder and builds a shallow or recursive TreeNode structure.
     */
    static async readFolderTree(folderPath, maxDepth = 7) {
        const normPath = folderPath.replace(/\\/g, '/');
        const folderName = path.basename(normPath) || normPath;
        const uri = vscode.Uri.file(normPath);
        const isGit = this.checkIsGitRepoSync(normPath);
        let gitMap;
        if (isGit) {
            try {
                gitMap = await GitStatusService_1.GitStatusService.getRepoStatusMap(normPath);
            }
            catch { }
        }
        const rootNode = {
            name: folderName,
            path: normPath,
            isDirectory: true,
            isGitRepo: isGit,
            isExpanded: true,
            children: []
        };
        rootNode.children = await this.readChildren(uri, 1, maxDepth, gitMap);
        return rootNode;
    }
    /**
     * Reads direct children of a subfolder on demand for dynamic/lazy expansion.
     */
    static async readSubfolderChildren(folderPath, depth = 3) {
        const normPath = folderPath.replace(/\\/g, '/');
        const uri = vscode.Uri.file(normPath);
        let gitMap;
        let curr = normPath;
        while (curr && curr !== path.dirname(curr)) {
            if (this.checkIsGitRepoSync(curr)) {
                try {
                    gitMap = await GitStatusService_1.GitStatusService.getRepoStatusMap(curr);
                }
                catch { }
                break;
            }
            curr = path.dirname(curr).replace(/\\/g, '/');
        }
        return this.readChildren(uri, 1, depth, gitMap);
    }
    /**
     * Helper to read children up to maxDepth.
     */
    static async readChildren(uri, currentDepth, maxDepth, gitMap) {
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
            const nodes = [];
            for (const [name, type] of entries) {
                if (name === '.git' ||
                    name === 'node_modules' ||
                    name === 'trash-bin' ||
                    name === '.next' ||
                    name === '.nuxt' ||
                    name === '.cache' ||
                    name === 'dist' ||
                    name === 'build') {
                    continue;
                }
                const childUri = vscode.Uri.file(path.join(uri.fsPath, name));
                const childPath = childUri.fsPath.replace(/\\/g, '/');
                const isDir = type === vscode.FileType.Directory;
                const node = {
                    name,
                    path: childPath,
                    isDirectory: isDir,
                    isExpanded: false
                };
                if (gitMap && gitMap.has(childPath.toLowerCase())) {
                    node.gitStatus = gitMap.get(childPath.toLowerCase());
                }
                if (isDir) {
                    node.isGitRepo = this.checkIsGitRepoSync(childPath);
                    if (currentDepth < maxDepth) {
                        node.children = await this.readChildren(childUri, currentDepth + 1, maxDepth, gitMap);
                    }
                    else {
                        node.children = [];
                    }
                }
                nodes.push(node);
            }
            return nodes;
        }
        catch {
            return [];
        }
    }
    /**
     * Opens a file in the active editor area.
     */
    static async openFileInEditor(filePath) {
        try {
            const uri = vscode.Uri.file(filePath);
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc, { preview: true, preserveFocus: false });
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to open file: ${filePath}`);
        }
    }
    /**
     * Prompts user with native folder dialog to pick a target directory.
     */
    static async promptSelectFolder() {
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
     * Enforces [[zero-hardcoded-sensitive-variables]] containment jail:
     * Rejects null-bytes or unbounded escape traversal sequences.
     */
    static isPathSafe(targetPath) {
        if (!targetPath || typeof targetPath !== 'string')
            return false;
        if (targetPath.includes('\0') || targetPath.includes('../../../../') || targetPath.includes('..\\..\\..\\..')) {
            return false;
        }
        return true;
    }
    /**
     * Moves a file or directory into target directory.
     */
    static async moveItem(sourcePath, targetDirPath) {
        try {
            if (!this.isPathSafe(sourcePath) || !this.isPathSafe(targetDirPath)) {
                vscode.window.showErrorMessage('Security Alert: Path traversal rejected by containment guard.');
                return { success: false, error: 'Path traversal rejected by containment guard.' };
            }
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
            }
            catch {
                // Target doesn't exist, proceed safely
            }
            await vscode.workspace.fs.rename(sourceUri, destUri, { overwrite: true });
            vscode.window.showInformationMessage(`Moved: ${fileName} -> ${path.basename(normTargetDir)}/${finalName !== fileName ? ` (${finalName})` : ''}`);
            return { success: true };
        }
        catch (err) {
            vscode.window.showErrorMessage(`Move failed: ${err.message || err}`);
            return { success: false, error: err.message || String(err) };
        }
    }
    /**
     * Copies a file or directory into target directory.
     */
    static async copyItem(sourcePath, targetDirPath) {
        try {
            if (!this.isPathSafe(sourcePath) || !this.isPathSafe(targetDirPath)) {
                vscode.window.showErrorMessage('Security Alert: Path traversal rejected by containment guard.');
                return { success: false, error: 'Path traversal rejected by containment guard.' };
            }
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
            }
            catch {
                // Safe to copy
            }
            await vscode.workspace.fs.copy(sourceUri, destUri, { overwrite: false });
            vscode.window.showInformationMessage(`Copied: ${fileName} -> ${path.basename(normTargetDir)}/`);
            return { success: true };
        }
        catch (err) {
            vscode.window.showErrorMessage(`Copy failed: ${err.message || err}`);
            return { success: false, error: err.message || String(err) };
        }
    }
    /**
     * Renames a file or directory.
     */
    static async renameItem(oldPath, newName) {
        try {
            if (!this.isPathSafe(oldPath) || (newName && !this.isPathSafe(newName))) {
                vscode.window.showErrorMessage('Security Alert: Path traversal rejected by containment guard.');
                return { success: false, error: 'Path traversal rejected by containment guard.' };
            }
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
        }
        catch (err) {
            vscode.window.showErrorMessage(`Rename failed: ${err.message || err}`);
            return { success: false, error: err.message || String(err) };
        }
    }
    /**
     * Creates a new file or directory inside targetDirPath.
     */
    static async createNewItem(targetDirPath, isFolder, specifiedName) {
        try {
            if (!this.isPathSafe(targetDirPath)) {
                vscode.window.showErrorMessage('Security Alert: Path traversal rejected by containment guard.');
                return { success: false, error: 'Path traversal rejected by containment guard.' };
            }
            let itemName = specifiedName?.trim();
            if (!itemName) {
                itemName = await vscode.window.showInputBox({
                    prompt: isFolder ? 'Enter new folder name:' : 'Enter new file name (e.g. index.ts):',
                    placeHolder: isFolder ? 'new-folder' : 'new-file.txt',
                    validateInput: (val) => {
                        const trimmed = val.trim();
                        if (!trimmed) {
                            return 'Name cannot be empty.';
                        }
                        if (trimmed.includes('/') || trimmed.includes('\\') || trimmed === '..' || trimmed === '.') {
                            return 'Name cannot contain path separators or parent directory references.';
                        }
                        return null;
                    }
                });
            }
            if (!itemName) {
                return { success: false };
            }
            const normTarget = targetDirPath.replace(/\\/g, '/');
            const newFullPath = path.posix.join(normTarget, itemName);
            const newUri = vscode.Uri.file(newFullPath);
            try {
                await vscode.workspace.fs.stat(newUri);
                vscode.window.showWarningMessage(`${isFolder ? 'Folder' : 'File'} '${itemName}' already exists.`);
                return { success: false, error: 'Item already exists.' };
            }
            catch {
                // Safe to create
            }
            if (isFolder) {
                await vscode.workspace.fs.createDirectory(newUri);
                vscode.window.showInformationMessage(`Folder created: ${itemName}`);
            }
            else {
                await vscode.workspace.fs.writeFile(newUri, new Uint8Array(0));
                vscode.window.showInformationMessage(`File created: ${itemName}`);
                try {
                    const doc = await vscode.workspace.openTextDocument(newUri);
                    await vscode.window.showTextDocument(doc, { preview: false });
                }
                catch { }
            }
            return { success: true, newPath: newFullPath };
        }
        catch (err) {
            vscode.window.showErrorMessage(`Creation failed: ${err.message || err}`);
            return { success: false, error: err.message || String(err) };
        }
    }
    /**
     * Moves multiple files or directories into a target directory.
     */
    static async moveItems(sourcePaths, targetDirPath) {
        let movedCount = 0;
        const errors = [];
        for (const src of sourcePaths) {
            const res = await this.moveItem(src, targetDirPath);
            if (res.success) {
                movedCount++;
            }
            else if (res.error) {
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
    static async copyItems(sourcePaths, targetDirPath) {
        let copiedCount = 0;
        const errors = [];
        for (const src of sourcePaths) {
            const res = await this.copyItem(src, targetDirPath);
            if (res.success) {
                copiedCount++;
            }
            else if (res.error) {
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
    static async copySelectedContent(paths) {
        if (!paths || paths.length === 0) {
            return;
        }
        const fileEntries = [];
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
            }
            catch {
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
        }
        else {
            resultText = fileEntries
                .map((f) => `// === File: ${f.name} (${f.path}) ===\n${f.content}`)
                .join('\n\n');
        }
        await vscode.env.clipboard.writeText(resultText);
        vscode.window.setStatusBarMessage(`Copied content of ${fileEntries.length} file(s) to clipboard`, 3000);
    }
    /**
     * Opens and focuses the native Source Control view for the specified repository.
     */
    static async openSourceControlForRepo(repoPath) {
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
                    const targetRepo = git.repositories.find((r) => {
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
        }
        catch {
            // Fallback: make sure at least Source Control view is opened
            await vscode.commands.executeCommand('workbench.view.scm');
        }
    }
    /**
     * Opens integrated terminal targeting specified folder.
     */
    static async openInTerminal(targetPath) {
        try {
            const normPath = targetPath.replace(/\\/g, '/');
            let dirPath = normPath;
            try {
                if (fs.existsSync(normPath)) {
                    const stat = fs.statSync(normPath);
                    if (!stat.isDirectory()) {
                        dirPath = path.dirname(normPath);
                    }
                }
            }
            catch {
                // fallback
            }
            const terminal = vscode.window.createTerminal({
                name: `TreePane: ${path.basename(dirPath) || dirPath}`,
                cwd: dirPath
            });
            terminal.show();
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to open terminal: ${err.message || err}`);
        }
    }
    /**
     * Sends formatted paths directly to the active VS Code terminal without executing.
     */
    static async sendPathsToTerminal(paths, execute = false) {
        try {
            let terminal = vscode.window.activeTerminal;
            if (!terminal) {
                terminal = vscode.window.createTerminal('TreePane');
            }
            terminal.show();
            const formatted = paths
                .map((p) => {
                let clean = p;
                if (/^[a-zA-Z]:/.test(clean)) {
                    clean = clean.replace(/\//g, '\\');
                }
                if (/[\s&()^%$#!;]/.test(clean)) {
                    return `"${clean}"`;
                }
                return clean;
            })
                .join(' ');
            terminal.sendText(formatted, execute);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to send path to terminal: ${err.message || err}`);
        }
    }
    /**
     * Opens file beside active editor column.
     */
    static async openToSide(filePath) {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.commands.executeCommand('vscode.open', uri, {
                viewColumn: vscode.ViewColumn.Beside
            });
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to open to side: ${err.message || err}`);
        }
    }
    /**
     * Compares two files using VS Code native diff viewer.
     */
    static async compareFiles(sourcePath, targetPath) {
        try {
            const uriA = vscode.Uri.file(sourcePath);
            const uriB = vscode.Uri.file(targetPath);
            const nameA = path.basename(sourcePath);
            const nameB = path.basename(targetPath);
            await vscode.commands.executeCommand('vscode.diff', uriA, uriB, `${nameA} ↔ ${nameB}`);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Comparison failed: ${err.message || err}`);
        }
    }
    /**
     * Scopes global search to a target folder.
     */
    static async findInFolder(folderPath) {
        try {
            const norm = folderPath.replace(/\\/g, '/');
            await vscode.commands.executeCommand('workbench.action.findInFiles', {
                query: '',
                filesToInclude: `${norm}/**`
            });
        }
        catch (err) {
            vscode.window.showErrorMessage(`Find in folder failed: ${err.message || err}`);
        }
    }
    /**
     * Deletes a file or directory safely to trash.
     */
    static async deleteItem(targetPath, useTrash = true) {
        try {
            if (!this.isPathSafe(targetPath)) {
                vscode.window.showErrorMessage('Security Alert: Path traversal rejected by containment guard.');
                return { success: false, error: 'Path traversal rejected by containment guard.' };
            }
            const uri = vscode.Uri.file(targetPath);
            const base = path.basename(targetPath);
            const actionLabel = useTrash ? 'Move to Trash' : 'Delete Permanently';
            const confirmed = await vscode.window.showWarningMessage(`Are you sure you want to delete '${base}'?`, { modal: true }, actionLabel);
            if (confirmed !== actionLabel) {
                return { success: false };
            }
            await vscode.workspace.fs.delete(uri, { useTrash, recursive: true });
            vscode.window.showInformationMessage(`Deleted: ${base}`);
            return { success: true };
        }
        catch (err) {
            vscode.window.showErrorMessage(`Delete failed: ${err.message || err}`);
            return { success: false, error: err.message || String(err) };
        }
    }
    /**
     * Duplicates a file or folder next to the original with _copy suffix.
     */
    static async duplicateItem(sourcePath) {
        try {
            const parentDir = path.dirname(sourcePath);
            return await this.copyItem(sourcePath, parentDir);
        }
        catch (err) {
            return { success: false, error: err.message || String(err) };
        }
    }
}
exports.FileSystemService = FileSystemService;
//# sourceMappingURL=FileSystemService.js.map