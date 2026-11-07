const fs = require('node:fs');
const path = require('node:path');

async function sync() {
  const setup = process.argv[2] === '--setup';
  const indexFile = path.join(__dirname, 'index-dir');
  const chooseIndex = setup && !fs.existsSync(indexFile);
  if (!chooseIndex) {
    const saved = fs.readFileSync(indexFile, 'utf8');
    if (!saved) throw new Error('The saved index directory is empty.');
    process.env.CODEGRAPH_DIR = saved;
  }
  process.env.CODEGRAPH_TELEMETRY = '0';

  const { CodeGraph, getCodeGraphDir } = require('@colbymchenry/codegraph');
  const project = process.cwd();
  // The SDK opens this exact root. The CLI can walk up to an ancestor index.
  const graph = await CodeGraph.open(project);
  try {
    await graph.sync();
    if (chooseIndex) fs.writeFileSync(indexFile, path.basename(getCodeGraphDir(project)), { flag: 'wx' });
  } finally {
    graph.destroy();
  }
}

sync().catch(error => {
  console.error(`CodeGraph: ${error.message}`);
  process.exitCode = 1;
});
