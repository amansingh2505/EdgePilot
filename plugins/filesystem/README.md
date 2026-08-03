# EdgePilot FileSystem Plugin

This plugin provides filesystem operations for EdgePilot.

Configuration:
- Set the environment variable EDGEPILOT_FS_ROOT to restrict all operations to a specific directory. If not set, operations are relative to the runtime working directory.

Permissions:
- Declares permission "filesystem". The runtime must grant this permission for plugin to execute.

Example usage (via RuntimeEngine):

- Execute fs.list:
  { pluginId: 'org.edgepilot.filesystem', toolId: 'fs.list', args: { path: '.' } }

- Execute fs.read:
  { pluginId: 'org.edgepilot.filesystem', toolId: 'fs.read', args: { path: 'README.md', encoding: 'utf8' } }

