// SPDX-License-Identifier: AGPL-3.0-only

/**
 * GitHub API client for repository operations.
 *
 * Uses the GitHub App installation token to perform read-only
 * operations on repositories: list files, read contents, list branches.
 */

export interface GitHubFile {
  path: string;
  type: "file" | "dir";
  size: number;
  sha: string;
}

export interface GitHubFileContent {
  path: string;
  content: string;
  encoding: string;
  sha: string;
  size: number;
}

export interface GitHubBranch {
  name: string;
  commit: { sha: string };
  protected: boolean;
}

export class GitHubClient {
  private baseUrl = "https://api.github.com";

  constructor(private installationToken: string) {}

  async listFiles(owner: string, repo: string, path = "", ref?: string): Promise<GitHubFile[]> {
    const url = new URL(`${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`);
    if (ref) url.searchParams.set("ref", ref);
    const response = await fetch(url.toString(), { headers: this.headers() });
    if (!response.ok) throw new GitHubApiError(response.status, await response.text());
    const data = await response.json();
    return Array.isArray(data) ? (data as GitHubFile[]) : [data as GitHubFile];
  }

  async readFile(owner: string, repo: string, path: string, ref?: string): Promise<GitHubFileContent> {
    const url = new URL(`${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`);
    if (ref) url.searchParams.set("ref", ref);
    const response = await fetch(url.toString(), { headers: this.headers() });
    if (!response.ok) throw new GitHubApiError(response.status, await response.text());
    return (await response.json()) as GitHubFileContent;
  }

  async listBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/branches`,
      { headers: this.headers() },
    );
    if (!response.ok) throw new GitHubApiError(response.status, await response.text());
    return (await response.json()) as GitHubBranch[];
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.installationToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }
}

export class GitHubApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`GitHub API error ${status}: ${body}`);
    this.name = "GitHubApiError";
  }
}
