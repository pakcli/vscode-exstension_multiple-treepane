export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  isGitRepo?: boolean;
  gitStatus?: 'M' | 'U' | 'A' | 'D' | 'R';
  children?: TreeNode[];
  isExpanded?: boolean;
}

export interface SearchOptions {
  matchCase: boolean;
  matchWholeWord: boolean;
  useRegex: boolean;
}

export interface PaneConfig {
  id: string;
  name: string;
  rootPath: string;
  filterText: string;
  searchOptions?: SearchOptions;
  isCollapsed: boolean;
  isHidden?: boolean;
  size?: number; // width in px (horizontal) or height in px (vertical)
}

export interface RepoOption {
  name: string;
  path: string;
  isGit: boolean;
}

export type InboundMessage =
  | { command: 'ready' }
  | { command: 'openFile'; filePath: string }
  | { command: 'requestFolder'; paneId: string; folderPath: string }
  | { command: 'selectFolder'; paneId: string }
  | { command: 'addPane'; folderPath?: string }
  | { command: 'removePane'; paneId: string }
  | { command: 'reorderPanes'; sourceIndex: number; targetIndex: number }
  | { command: 'movePaneFirst'; paneId: string }
  | { command: 'movePaneShift'; paneId: string; direction: 'left' | 'right' }
  | { command: 'toggleLayout' }
  | { command: 'updatePaneFilter'; paneId: string; filterText: string }
  | { command: 'savePanesState'; panes: PaneConfig[]; layout: 'horizontal' | 'vertical'; viewMode?: 'split' | 'focus'; activePaneId?: string }
  | { command: 'moveItem'; sourcePath: string; targetDirPath: string; sourcePaneId?: string; targetPaneId?: string }
  | { command: 'copyItem'; sourcePath: string; targetDirPath: string; sourcePaneId?: string; targetPaneId?: string }
  | { command: 'moveItems'; sourcePaths: string[]; targetDirPath: string; sourcePaneId?: string; targetPaneId?: string }
  | { command: 'copyItems'; sourcePaths: string[]; targetDirPath: string; sourcePaneId?: string; targetPaneId?: string }
  | { command: 'renameItem'; oldPath: string; newName?: string }
  | { command: 'moveToRepo'; sourcePaths: string[]; sourcePaneId?: string }
  | { command: 'copyToClipboard'; text: string }
  | { command: 'copySelectedContent'; paths: string[] }
  | { command: 'openSourceControl'; repoPath: string }
  | { command: 'openInTerminal'; folderPath: string }
  | { command: 'sendToTerminal'; paths: string[]; execute?: boolean }
  | { command: 'createNewItem'; paneId: string; targetDirPath: string; isFolder: boolean }
  | { command: 'openToSide'; filePath: string }
  | { command: 'compareFiles'; sourcePath: string; targetPath: string }
  | { command: 'findInFolder'; folderPath: string }
  | { command: 'deleteItem'; filePath: string; paneId: string; useTrash?: boolean }
  | { command: 'duplicateItem'; sourcePath: string; paneId: string }
  | { command: 'revealInOS'; filePath: string }
  | { command: 'loadSubfolder'; paneId: string; folderPath: string };

export type OutboundMessage =
  | { command: 'init'; panes: PaneConfig[]; availableRepos: RepoOption[]; defaultLayout: 'horizontal' | 'vertical' }
  | { command: 'renderTree'; paneId: string; tree: TreeNode }
  | { command: 'subfolderLoaded'; paneId: string; folderPath: string; children: TreeNode[] }
  | { command: 'paneFolderUpdated'; paneId: string; newPath: string; tree: TreeNode }
  | { command: 'setLayout'; layout: 'horizontal' | 'vertical' };
