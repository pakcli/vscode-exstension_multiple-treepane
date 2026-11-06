import * as child_process from 'child_process';
import * as path from 'path';

export class GitStatusService {
  /**
   * Discovers and parses git status for a repository root into a normalized path status map.
   */
  public static async getRepoStatusMap(repoRoot: string): Promise<Map<string, 'M' | 'U' | 'A' | 'D' | 'R'>> {
    return new Promise((resolve) => {
      child_process.execFile(
        'git',
        ['status', '--porcelain', '-uall'],
        { cwd: repoRoot, timeout: 4000 },
        (err, stdout) => {
          const map = new Map<string, 'M' | 'U' | 'A' | 'D' | 'R'>();
          if (err || !stdout) {
            resolve(map);
            return;
          }

          const lines = stdout.split(/\r?\n/);
          for (const line of lines) {
            if (line.length < 4) {
              continue;
            }
            const indexStatus = line[0];
            const worktreeStatus = line[1];
            let relPath = line.substring(3).trim();

            if (relPath.includes(' -> ')) {
              relPath = relPath.split(' -> ')[1].trim();
            }
            if (relPath.startsWith('"') && relPath.endsWith('"')) {
              relPath = relPath.slice(1, -1);
            }

            let code: 'M' | 'U' | 'A' | 'D' | 'R' = 'M';
            if (indexStatus === '?' || worktreeStatus === '?') {
              code = 'U';
            } else if (indexStatus === 'A' || worktreeStatus === 'A') {
              code = 'A';
            } else if (indexStatus === 'D' || worktreeStatus === 'D') {
              code = 'D';
            } else if (indexStatus === 'R' || worktreeStatus === 'R') {
              code = 'R';
            } else if (indexStatus === 'M' || worktreeStatus === 'M') {
              code = 'M';
            }

            const fullNorm = path.join(repoRoot, relPath).replace(/\\/g, '/');
            map.set(fullNorm.toLowerCase(), code);
          }
          resolve(map);
        }
      );
    });
  }
}
