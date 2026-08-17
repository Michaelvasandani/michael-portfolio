import type { EvidenceBundle, GitHubEvent, PinSnapshot, PublicRepository } from './types.ts';
import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';

type FetchLike = typeof fetch;

export class GitHubApiError extends Error {
  readonly status: number;
  readonly transient: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.transient = status === 408 || status === 425 || status === 429 || status >= 500;
  }
}

const API_ROOT = 'https://api.github.com';
const GRAPHQL_ROOT = 'https://api.github.com/graphql';
const API_VERSION = '2022-11-28';

function ensurePublicRepository(repository: PublicRepository): PublicRepository {
  const isPublic = repository.visibility === 'public' || repository.private === false;
  if (!isPublic) throw new GitHubApiError(`Repository ${repository.full_name} is not confirmed public`, 422);
  if (repository.fork === true) throw new GitHubApiError(`Repository ${repository.full_name} is a fork`, 422);
  if (!repository.full_name || !repository.html_url) throw new GitHubApiError('Repository metadata is incomplete', 422);
  return repository;
}

function splitRepositoryName(name: string): [string, string] {
  const [owner, repo, ...rest] = name.split('/');
  if (!owner || !repo || rest.length > 0) throw new GitHubApiError(`Invalid public repository name: ${name}`, 422);
  return [owner, repo];
}

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit)}\n[truncated]`;
}

export interface GitHubClientOptions {
  token?: string;
  fetchImpl?: FetchLike;
  apiRoot?: string;
}

export class GitHubClient {
  private readonly token?: string;
  private readonly fetchImpl: FetchLike;
  private readonly apiRoot: string;
  private readonly octokit?: Octokit;
  private readonly graphqlClient?: typeof graphql;

  constructor(options: GitHubClientOptions = {}) {
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.apiRoot = options.apiRoot ?? API_ROOT;
    if (!options.fetchImpl) {
      this.octokit = new Octokit(this.token ? { auth: this.token } : {});
      this.graphqlClient = graphql.defaults(this.token ? { headers: { authorization: `bearer ${this.token}` } } : {});
    }
  }

  private headers(accept = 'application/vnd.github+json'): Record<string, string> {
    return {
      Accept: accept,
      'X-GitHub-Api-Version': API_VERSION,
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  private async requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    if (this.octokit && url.startsWith(this.apiRoot)) {
      const parsed = new URL(url);
      try {
        const response = await this.octokit.request({ method: (init.method ?? 'GET') as 'GET', url: `${parsed.pathname}${parsed.search}`, headers: this.headers() });
        return response.data as T;
      } catch (error) {
        const status = typeof error === 'object' && error && 'status' in error && typeof (error as { status?: unknown }).status === 'number' ? (error as { status: number }).status : 503;
        throw new GitHubApiError(`GitHub API request failed (${status})`, status);
      }
    }
    let response: Response;
    try {
      response = await this.fetchImpl(url, { ...init, headers: { ...this.headers(), ...(init.headers ?? {}) } });
    } catch (error) {
      throw new GitHubApiError(`GitHub API network failure: ${error instanceof Error ? error.message : String(error)}`, 503);
    }
    if (!response.ok) throw new GitHubApiError(`GitHub API request failed (${response.status})`, response.status);
    return await response.json() as T;
  }

  private async requestText(url: string, init: RequestInit = {}): Promise<string> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, { ...init, headers: { ...this.headers('application/vnd.github.raw+json'), ...(init.headers ?? {}) } });
    } catch (error) {
      throw new GitHubApiError(`GitHub API network failure: ${error instanceof Error ? error.message : String(error)}`, 503);
    }
    if (!response.ok) throw new GitHubApiError(`GitHub API request failed (${response.status})`, response.status);
    return await response.text();
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    if (this.graphqlClient) {
      try {
        return await this.graphqlClient<T>(query, variables);
      } catch (error) {
        const status = typeof error === 'object' && error && 'status' in error && typeof (error as { status?: unknown }).status === 'number' ? (error as { status: number }).status : 503;
        throw new GitHubApiError(`GitHub GraphQL request failed (${status})`, status);
      }
    }
    let response: Response;
    try {
      response = await this.fetchImpl(GRAPHQL_ROOT, {
        method: 'POST',
        headers: { ...this.headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
    } catch (error) {
      throw new GitHubApiError(`GitHub GraphQL network failure: ${error instanceof Error ? error.message : String(error)}`, 503);
    }
    if (!response.ok) throw new GitHubApiError(`GitHub GraphQL request failed (${response.status})`, response.status);
    const payload = await response.json() as { data?: T; errors?: Array<{ message?: string }> };
    if (payload.errors?.length || !payload.data) throw new GitHubApiError(payload.errors?.map((error) => error.message).filter(Boolean).join('; ') || 'GitHub GraphQL returned no data', 422);
    return payload.data;
  }

  async getPinnedProjects(login: string): Promise<PinSnapshot[]> {
    const data = await this.graphql<{ user: { pinnedItems: { nodes: Array<Partial<PinSnapshot> & { id?: string; nameWithOwner?: string; url?: string; isPrivate?: boolean; isFork?: boolean; isArchived?: boolean; description?: string | null }> } } | null }>(`query PortfolioPins($login: String!) { user(login: $login) { pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { id nameWithOwner url description isPrivate isFork isArchived } } } } }`, { login });
    if (!data.user) throw new GitHubApiError(`GitHub user ${login} was not found`, 404);
    return data.user.pinnedItems.nodes.map((node) => {
      if (!node.id || !node.nameWithOwner || !node.url || node.isPrivate !== false || node.isFork === true) throw new GitHubApiError('Pinned repository was not confirmed public and non-fork', 422);
      return {
        repositoryId: node.id,
        repository: node.nameWithOwner,
        url: node.url,
        isPrivate: node.isPrivate,
        isFork: node.isFork ?? false,
        description: node.description,
        isArchived: node.isArchived,
      };
    });
  }

  async listPublicEvents(login: string, page = 1): Promise<GitHubEvent[]> {
    const url = new URL(`${this.apiRoot}/users/${encodeURIComponent(login)}/events/public`);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    return await this.requestJson<GitHubEvent[]>(url.toString());
  }

  async getRepository(fullName: string): Promise<PublicRepository> {
    const [owner, repo] = splitRepositoryName(fullName);
    const repository = await this.requestJson<PublicRepository>(`${this.apiRoot}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
    return ensurePublicRepository(repository);
  }

  async getReadme(fullName: string): Promise<string> {
    const [owner, repo] = splitRepositoryName(fullName);
    try {
      return truncate(await this.requestText(`${this.apiRoot}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`), 12000);
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 404) return '';
      throw error;
    }
  }

  async getLanguages(fullName: string): Promise<string[]> {
    const [owner, repo] = splitRepositoryName(fullName);
    const languages = await this.requestJson<Record<string, number>>(`${this.apiRoot}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`);
    return Object.keys(languages).slice(0, 12);
  }

  async getCommits(fullName: string, actor: string, since?: string): Promise<EvidenceBundle['commits']> {
    const [owner, repo] = splitRepositoryName(fullName);
    const url = new URL(`${this.apiRoot}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`);
    url.searchParams.set('author', actor);
    url.searchParams.set('per_page', '30');
    if (since) url.searchParams.set('since', since);
    const commits = await this.requestJson<Array<{ sha: string; html_url: string; commit?: { message?: string; author?: { date?: string | null } }; author?: { login?: string | null } }>>(url.toString());
    return commits.map((commit) => ({ sha: commit.sha, message: truncate(commit.commit?.message ?? '', 500), url: commit.html_url, authoredAt: commit.commit?.author?.date ?? null, authorLogin: commit.author?.login ?? null }));
  }

  async getCompare(fullName: string, before: string, after: string): Promise<string[]> {
    const [owner, repo] = splitRepositoryName(fullName);
    const comparison = await this.requestJson<{ files?: Array<{ filename?: string }> }>(`${this.apiRoot}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(before)}...${encodeURIComponent(after)}`);
    return (comparison.files ?? []).map((file) => file.filename).filter((filename): filename is string => Boolean(filename)).slice(0, 200);
  }

  async getPullRequest(fullName: string, number: number): Promise<EvidenceBundle['pullRequests'][number]> {
    const [owner, repo] = splitRepositoryName(fullName);
    const pull = await this.requestJson<{ number: number; title: string; body: string | null; html_url: string; merged_at: string | null; user?: { login?: string | null } }>(`${this.apiRoot}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`);
    return { number: pull.number, title: truncate(pull.title, 300), body: pull.body ? truncate(pull.body, 1600) : null, url: pull.html_url, mergedAt: pull.merged_at, authorLogin: pull.user?.login ?? null };
  }

  async getRelease(fullName: string, id: number): Promise<EvidenceBundle['releases'][number]> {
    const [owner, repo] = splitRepositoryName(fullName);
    const release = await this.requestJson<{ tag_name: string; name: string | null; body: string | null; html_url: string; published_at: string | null }>(`${this.apiRoot}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/${id}`);
    return { tag: release.tag_name, name: truncate(release.name ?? release.tag_name, 240), body: release.body ? truncate(release.body, 1600) : null, url: release.html_url, publishedAt: release.published_at };
  }

  async collectEvidence(fullName: string, actor: string, events: GitHubEvent[], since?: string): Promise<EvidenceBundle> {
    const repository = ensurePublicRepository(await this.getRepository(fullName));
    const [owner, repo] = splitRepositoryName(fullName);
    const repoEvents = events.filter((event) => event.repo?.name === fullName);
    const commits = await this.getCommits(fullName, actor, since);
    const pullRequests: EvidenceBundle['pullRequests'] = [];
    const releases: EvidenceBundle['releases'] = [];
    const changedFiles: string[] = [];
    for (const event of repoEvents) {
      const payload = event.payload ?? {};
      if (event.type === 'PushEvent' && typeof payload.before === 'string' && typeof payload.head === 'string') {
        changedFiles.push(...await this.getCompare(fullName, payload.before, payload.head));
      }
      if (event.type === 'PullRequestEvent' && typeof payload.number === 'number') {
        const pull = await this.getPullRequest(fullName, payload.number);
        if (pull.mergedAt) pullRequests.push(pull);
      }
      if (event.type === 'ReleaseEvent' && typeof (payload.release as { id?: unknown } | undefined)?.id === 'number') {
        releases.push(await this.getRelease(fullName, (payload.release as { id: number }).id));
      }
    }
    const languages = await this.getLanguages(fullName);
    return {
      repository: {
        id: repository.node_id ?? repository.id ?? `${owner}/${repo}`,
        fullName: repository.full_name,
        url: repository.html_url,
        description: repository.description ?? null,
        defaultBranch: repository.default_branch ?? 'main',
        topics: repository.topics ?? [],
        languages,
      },
      readme: await this.getReadme(fullName),
      commits,
      pullRequests,
      releases,
      changedFiles: [...new Set(changedFiles)].slice(0, 300),
    };
  }
}
