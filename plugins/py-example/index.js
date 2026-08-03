const { spawnSync } = require('child_process');
const path = require('path');

const manifest = require('./plugin.json');

function makeResult(success, output, error, code, details) {
  const r = { success };
  if (output !== undefined) r.output = output;
  if (error) r.error = String(error);
  if (code) r.code = code;
  if (details) r.details = details;
  return r;
}

async function executePythonTool(toolId, args) {
  // Call plugin.py via python, pass JSON on stdin, expect JSON on stdout
  const pluginPath = path.join(__dirname, 'plugin.py');
  try {
    const proc = spawnSync('python', [pluginPath, toolId], { input: JSON.stringify(args || {}), encoding: 'utf8', timeout: 30000 });
    if (proc.error) {
      return makeResult(false, null, proc.error.message || String(proc.error), 'exec_error');
    }
    if (proc.status !== 0) {
      // try parse stderr
      return makeResult(false, null, proc.stderr || `python exited with ${proc.status}`, 'exec_error');
    }
    const out = proc.stdout || '';
    try {
      const parsed = JSON.parse(out);
      return makeResult(true, parsed);
    } catch (e) {
      return makeResult(false, null, 'invalid_python_output', 'exec_error', out);
    }
  } catch (e) {
    return makeResult(false, null, e?.message ?? String(e), 'exec_error');
  }
}

const tools = manifest.tools.map(t => ({
  id: t.id,
  name: t.name || t.id,
  async execute(args, ctx) {
    return await executePythonTool(t.id, args);
  }
}));

module.exports = {
  manifest,
  initialize: async (ctx) => { console.log('py-example wrapper initialized'); },
  shutdown: async (ctx) => { console.log('py-example wrapper shutdown'); },
  tools
};
