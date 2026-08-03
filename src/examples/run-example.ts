// example runner for the runtime engine
// uses require to avoid TS path-resolve complexities in small example
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PluginManager } = require('../runtime/plugin-manager');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AjvOptionalValidator } = require('../runtime/validator');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ConsoleLogger } = require('../runtime/logger');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { RuntimeEngine } = require('../runtime/runtime-engine');

async function main() {
  const pm = new PluginManager();
  // load TS example plugin
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const plugin = require('../../plugins/ts-example');
  pm.register(plugin.default || plugin);

  const validator = new AjvOptionalValidator();
  const logger = new ConsoleLogger();

  const engine = new RuntimeEngine(pm, validator, logger);

  const resp = await engine.handle({ pluginId: plugin.manifest.id, toolId: 'example.echo', args: { hello: 'world' } });
  console.log('Execution response:', JSON.stringify(resp, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
