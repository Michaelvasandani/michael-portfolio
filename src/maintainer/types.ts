export interface GeneratedProject {
  repositoryId: string;
  repository: string;
  url: string;
  purpose: string;
  contribution: string;
  technologies: string[];
  evidenceUrl: string;
  createdAt: string;
}

export interface DigestEntry {
  id: string;
  date: string;
  headline: string;
  summary: string;
  technologies: string[];
  evidenceUrl: string;
}

export interface RecentWorkDigest {
  schemaVersion: 1;
  updatedAt: string | null;
  entries: DigestEntry[];
}

export interface GeneratedContent {
  schemaVersion: 1;
  generatedAt: string | null;
  projects: GeneratedProject[];
  recentWork?: RecentWorkDigest;
}

export interface MaintainerCheckpoint {
  revision: string;
  committedAt: string;
}

export interface MaintainerState {
  schemaVersion: 1;
  pinSnapshot: string[];
  representedRepositoryIds: string[];
  activityCursor: string | null;
  lastPinSyncAt: string | null;
  lastDigestRefreshAt: string | null;
  checkpoint: MaintainerCheckpoint | null;
  publishedRevision: string | null;
  openIncidentFingerprints: string[];
  openReviewFingerprints: string[];
}

export interface CandidatePatch {
  paths: string[];
  generated: GeneratedContent;
  state: MaintainerState;
}

export interface CandidateValidation {
  ok: true;
  changedPaths: string[];
}

export interface PinSnapshot {
  repositoryId: string;
  repository: string;
  url: string;
  isPrivate: boolean;
  isFork: boolean;
  description?: string | null;
  isArchived?: boolean;
  technologies?: string[];
}

export interface PublicRepository {
  id?: string;
  node_id?: string;
  full_name: string;
  html_url: string;
  url?: string;
  description?: string | null;
  visibility?: string;
  private?: boolean;
  fork?: boolean;
  archived?: boolean;
  default_branch?: string;
  topics?: string[];
  language?: string | null;
  pushed_at?: string | null;
  updated_at?: string | null;
}

export interface EvidenceBundle {
  repository: {
    id: string;
    fullName: string;
    url: string;
    description: string | null;
    defaultBranch: string;
    topics: string[];
    languages: string[];
  };
  readme: string;
  commits: Array<{ sha: string; message: string; url: string; authoredAt: string | null; authorLogin: string | null }>;
  pullRequests: Array<{ number: number; title: string; body: string | null; url: string; mergedAt: string | null; authorLogin: string | null }>;
  releases: Array<{ tag: string; name: string; body: string | null; url: string; publishedAt: string | null }>;
  changedFiles: string[];
}

export interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  repo?: { name?: string };
  actor?: { login?: string };
  payload?: Record<string, unknown>;
}
