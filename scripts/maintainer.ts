import { runPortfolioMaintainer, type MaintainerMode } from '../src/maintainer/run.ts';

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const mode = (argument('mode') ?? 'pins') as MaintainerMode;
if (mode !== 'pins' && mode !== 'digest') throw new Error('--mode must be pins or digest');

try {
  const result = await runPortfolioMaintainer({
    root: process.env.PORTFOLIO_ROOT ?? process.cwd(),
    mode,
    login: process.env.PORTFOLIO_GITHUB_LOGIN ?? 'Michaelvasandani',
    githubToken: process.env.GITHUB_TOKEN,
    openAiApiKey: process.env.OPENAI_API_KEY,
    openAiModel: process.env.OPENAI_MODEL,
    dryRun: process.argv.includes('--dry-run'),
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Portfolio Maintainer failed closed: ${message}`);
  process.exitCode = 1;
}
