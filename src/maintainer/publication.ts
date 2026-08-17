const GENERATED_PATHS = new Set([
  '_data/generated/projects.json',
  '_data/generated/recent-work.json',
  '.portfolio-maintainer/state.json',
]);

export type PublicationRoute = 'direct' | 'pull-request' | 'abort';

export interface PublicationDecisionInput {
  changedPaths: string[];
  valid: boolean;
  branchRequiresPullRequest: boolean;
  requiresHumanReview: boolean;
  staleBase?: boolean;
}

export function decidePublicationRoute(input: PublicationDecisionInput): PublicationRoute {
  if (!input.valid || input.staleBase || input.changedPaths.length === 0 || input.changedPaths.some((path) => !GENERATED_PATHS.has(path))) return 'abort';
  if (input.branchRequiresPullRequest || input.requiresHumanReview) return 'pull-request';
  return 'direct';
}
