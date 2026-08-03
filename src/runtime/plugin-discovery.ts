import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { PluginManager } from './plugin-manager';
import { PermissionManager } from './permission-manager';
import { ConsoleLogger } from './logger';

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

        // attempt to load node modules if language == node and entry exists
        let moduleObj: any = undefined;
        if (!manifest.language || manifest.language === 'node') {
          const entry = manifest.entry || 'index.js';
          const entryPath = path.join(sub, entry);
          if (fs.existsSync(entryPath)) {
            try {
              moduleObj = require(entryPath);
            } catch (e) {
              this.logger.warn(`Failed to require module ${entryPath}: ${e}`);
            }
          } else {
            this.logger.info(`Entry ${entryPath} for plugin ${manifest.id} not found; registering manifest only`);
          }
        }

        const pluginWrapper: any = {
          manifest,
          module: moduleObj,
          tools: moduleObj && moduleObj.default && Array.isArray(moduleObj.default.tools) ? moduleObj.default.tools : (moduleObj && moduleObj.tools) || manifest.tools || [] ,
          initialize: moduleObj && moduleObj.default && moduleObj.default.initialize ? moduleObj.default.initialize : (moduleObj && moduleObj.initialize),
          shutdown: moduleObj && moduleObj.default && moduleObj.default.shutdown ? moduleObj.default.shutdown : (moduleObj && moduleObj.shutdown)
        };

        this.pm.register(pluginWrapper);

      } catch (e) {
        this.logger.error(`Error discovering plugin at ${manifestPath}:`, e);
      }
    }
  }
}
