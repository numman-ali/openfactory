// SPDX-License-Identifier: AGPL-3.0-only

/**
 * TypeScript types for GitHub API interactions.
 */

/** GitHub App configuration loaded from environment variables. */
export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string;
  clientId: string;
  clientSecret: string;
}

/** Cached installation token with expiration. */
export interface InstallationToken {
  token: string;
  expiresAt: Date;
  installationId: number;
}

/** GitHub repository file entry from the Contents API. */
export interface GitHubFile {
  path: string;
  name: string;
  type: "file" | "dir" | "symlink" | "submodule";
  size: number;
  sha: string;
  url: string;
  html_url: string;
  download_url: string | null;
}

/** GitHub file content from the Contents API. */
export interface GitHubFileContent {
  path: string;
  name: string;
  content: string;
  encoding: "base64" | "utf-8";
  sha: string;
  size: number;
  type: "file";
}

/** GitHub branch information. */
export interface GitHubBranch {
  name: string;
  commit: { sha: string; url: string };
  protected: boolean;
}

/** GitHub commit reference. */
export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
}

/** Payload for GitHub push webhook events. */
export interface PushEvent {
  ref: string;
  before: string;
  after: string;
  repository: {
    id: number;
    full_name: string;
    html_url: string;
    default_branch: string;
  };
  commits: PushEventCommit[];
  head_commit: PushEventCommit | null;
  installation?: { id: number };
  sender: { login: string; id: number };
}

/** Individual commit within a push event. */
export interface PushEventCommit {
  id: string;
  message: string;
  timestamp: string;
  added: string[];
  modified: string[];
  removed: string[];
  author: { name: string; email: string; username?: string };
}

/** Payload for GitHub installation webhook events. */
export interface InstallationEvent {
  action: "created" | "deleted" | "suspend" | "unsuspend" | "new_permissions_accepted";
  installation: {
    id: number;
    app_id: number;
    account: {
      login: string;
      id: number;
      type: string;
    };
    target_type: string;
    permissions: Record<string, string>;
    events: string[];
  };
  repositories?: Array<{
    id: number;
    full_name: string;
    private: boolean;
  }>;
  sender: { login: string; id: number };
}

/** GitHub OAuth callback query parameters. */
export interface OAuthCallbackQuery {
  code?: string;
  installation_id?: string;
  setup_action?: string;
  state?: string;
}

/** Response from GitHub's installation token endpoint. */
export interface GitHubInstallationTokenResponse {
  token: string;
  expires_at: string;
  permissions: Record<string, string>;
}

/** Error response from GitHub API. */
export interface GitHubErrorResponse {
  message: string;
  documentation_url?: string;
  status?: string;
}
