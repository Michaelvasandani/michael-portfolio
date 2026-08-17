import { validateSiteContent } from '../src/maintainer/site.ts';

const root = process.cwd();
const result = await validateSiteContent({ root });
console.log(`Validated Minimal-theme portfolio (${result.checkedFiles.length} source files).`);
