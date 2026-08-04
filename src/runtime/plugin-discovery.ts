import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { PluginManager } from './plugin-manager';
import { PermissionManager } from './permission-manager';
import { ConsoleLogger } from './logger';

// PluginDiscovery now enforces standardized plugin contract:
// - plugin.json must exist
// - manifest.entry must point to a Node module that exports the plugin wrapper
// - the module must export { manifest, tools: [{ id, execute }], initialize?, shutdown? }

export class PluginDiscovery {
  private ajv = new Ajv();
  private logger = new ConsoleLogger();

  constructor(private pluginDir: string, private pm: PluginManager, private perm: PermissionManager) {}

  discover(): void {
    if (!fs.existsSync(this.pluginDir)) {
      this.logger.warn(`Plugin directory ${this.pluginDir} does not exist`);
      return;
    }
    const entries = fs.readdirSync(this.pluginDir, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const sub = path.join(this.pluginDir, ent.name);
      const manifestPath = path.join(sub, 'plugin.json');
      if (!fs.existsSync(manifestPath)) {
        this.logger.info(`Skipping ${ent.name}: no plugin.json found`);
        continue;
      }
      try {
        const raw = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(raw);
        // validate using schema file if present in repo
        const schemaPath = path.join(process.cwd(), 'spec', 'schemas', 'plugin.json');
        let valid = true;
        if (fs.existsSync(schemaPath)) {
          const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
          const validate = this.ajv.compile(schema);
          valid = validate(manifest) as boolean;
          if (!valid) {
            this.logger.error(`Manifest validation failed for ${manifest.id}:`, validate.errors);
            continue;
          }
        }
        // register permissions as granted only if declared 'none' or explicitly allowed by policy
        const declaredPermissions = manifest.permissions || [];
        if (declaredPermissions.length === 0 || (declaredPermissions.length === 1 && declaredPermissions[0] === 'none')) {
          // grant no permissions
          this.perm.grant(manifest.id, []);
        } else {
          // for now, do not auto-grant dangerous permissions; require admin to grant later
          this.logger.info(`Plugin ${manifest.id} declares permissions: ${declaredPermissions.join(', ')}. Not auto-granting.`);
        }

        // Load entry module and enforce the wrapper contract
        const entry = manifest.entry || 'index.js';
        const entryPath = path.join(sub, entry);
        if (!fs.existsSync(entryPath)) {
          this.logger.error(`Entry ${entryPath} for plugin ${manifest.id} not found; skipping plugin`);
          continue;
        }

        let moduleObj: any;
        try {
          moduleObj = require(entryPath);
        } catch (e) {
          this.logger.error(`Failed to require module ${entryPath}: ${e}`);
          continue;
        }

        // Expect moduleObj to be the wrapper
        const wrapper = moduleObj.default || moduleObj;
        if (!wrapper || !wrapper.manifest || !Array.isArray(wrapper.tools)) {
          this.logger.error(`Plugin ${manifest.id} entry did not export a valid plugin wrapper (manifest + tools)`);
          continue;
        }

        // Validate tools shape: each tool must have id and execute function
        let ok = true;
        for (const t of wrapper.tools) {
          if (!t || !t.id || typeof t.execute !== 'function') {
            this.logger.error(`Plugin ${manifest.id} tool ${t && t.id} missing execute() — plugin skipped`);
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        const pluginWrapper: any = {
          manifest: wrapper.manifest,
          module: wrapper,
          tools: wrapper.tools,
          initialize: typeof wrapper.initialize === 'function' ? wrapper.initialize : undefined,
          shutdown: typeof wrapper.shutdown === 'function' ? wrapper.shutdown : undefined
        };

        this.pm.register(pluginWrapper);

      } catch (e) {
        this.logger.error(`Error discovering plugin at ${manifestPath}:`, e);
      }
    }
  }
}
