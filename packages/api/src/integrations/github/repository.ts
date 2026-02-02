// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Repository operations via the GitHub Contents API.
 *
 * Uses installation access tokens to perform read-only operations:
 * list files, read file contents, list branches, and get commit info.
 */

import type {
  GitHubFile,
  GitHubFileContent,
  GitHubBranch,
  GitHubCommit,
  GitHubAppConfig,
} from "./types.js";
import { getInstallationToken } from "./app.js";

const GITHUB_API_BASE = "https://api.github.com";
const API_VERSION_HEADER = "2022-11-28";

/** Custom error for GitHub API failures. */
export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`GitHub API error ${status}: ${body}`);
    this.name = "GitHubApiError";
  }
}

/**
 * GitHub repository client that manages its own authentication.
 *
 * Accepts the app config and installation ID, and obtains
 * (or refreshes) an installation token automatically.
 */
export class RepositoryClient {
  constructor(
    private readonly config: GitHubAppConfig,
    private readonly installationId: number,
  ) {}

  /**
   * List files and directories at a given path in the repository.
   * Returns an array of file/directory entries (non-recursive).
   */
  async listFiles(owner: string, repo: string, path = "", ref?: string): Promise<GitHubFile[]> {
    const url = new URL(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`);
    if (ref) url.searchParams.set("ref", ref);

    const response = await this.request(url.toString());
    const data = await response.json();
    return Array.isArray(data) ? (data as GitHubFile[]) : [data as GitHubFile];
  }

  /**
   * Read the contents of a single file.
   * The content is Base64-encoded by the GitHub API.
   */
  async readFile(owner: string, repo: string, path: string, ref?: string): Promise<GitHubFileContent> {
    const url = new URL(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`);
    if (ref) url.searchParams.set("ref", ref);

    const response = await this.request(url.toString());
    return (await response.json()) as GitHubFileContent;
  }

  /**
   * Read and decode a file's content to a UTF-8 string.
   * Convenience wrapper around readFile that handles Base64 decoding.
   */
  async readFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    const file = await this.readFile(owner, repo, path, ref);
    return Buffer.from(file.content, "base64").toString("utf-8");
  }

  /** List all branches for a repository. */
  async listBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    const response = await this.request(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/branches`,
    );
    return (await response.json()) as GitHubBranch[];
  }

  /**
   * Get the latest commit SHA for a specific branch.
   * Returns the SHA string of the branch's HEAD commit.
   */
  async getLatestCommitSha(owner: string, repo: string, branch: string): Promise<string> {
    const response = await this.request(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${branch}`,
    );
    const data = (await response.json()) as GitHubCommit;
    return data.sha;
  }

  /** Get full commit details by SHA. */
  async getCommit(owner: string, repo: string, sha: string): Promise<GitHubCommit> {
    const response = await this.request(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${sha}`,
    );
    return (await response.json()) as GitHubCommit;
  }

  /** Execute an authenticated GET request against the GitHub API. */
  private async request(url: string): Promise<Response> {
    const token = await getInstallationToken(this.config, this.installationId);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": API_VERSION_HEADER,
      },
    });

    if (!response.ok) {
      throw new GitHubApiError(response.status, await response.text());
    }

    return response;
  }
}
