import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHubClient } from '../src/maintainer/github.ts';

test('reads pins through GraphQL and rejects a private pin before generation', async () => {
  const requests: string[] = [];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    requests.push(String(input));
    const body = JSON.stringify({ data: { user: { pinnedItems: { nodes: [{ id: 'R_1', nameWithOwner: 'Michaelvasandani/public', url: 'https://github.com/Michaelvasandani/public', isPrivate: false, isFork: false }] } } } });
    return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const pins = await new GitHubClient({ fetchImpl }).getPinnedProjects('Michaelvasandani');
  assert.equal(pins[0].repositoryId, 'R_1');
  assert.match(requests[0], /graphql/);
});

test('uses only the public actor-events endpoint for activity discovery', async () => {
  let requested = '';
  const fetchImpl = async (input: string | URL | Request): Promise<Response> => {
    requested = String(input);
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  await new GitHubClient({ fetchImpl }).listPublicEvents('Michaelvasandani');
  assert.match(requested, /\/users\/Michaelvasandani\/events\/public/);
  assert.doesNotMatch(requested, /\/events\?/);
});
