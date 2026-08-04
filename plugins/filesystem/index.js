const fs = require('fs');
const path = require('path');
const os = require('os');
const Ajv = require('ajv');
const { promisify } = require('util');
const stat = promisify(fs.stat);

const ajv = new Ajv();

const BASE_DIR = process.env.EDGEPILOT_FS_ROOT ? path.resolve(process.env.EDGEPILOT_FS_ROOT) : process.cwd();

function safeResolve(p) {
  if (!p) p = '.';
  // prevent absolute paths reaching outside BASE_DIR
  const resolved = path.resolve(BASE_DIR, p);
  if (!resolved.startsWith(BASE_DIR)) throw { code: 'not_allowed', message: 'Path outside allowed root' };
  return resolved;
}

function makeResult(success, output, error, code, details) {
  const r = { success };
  if (output !== undefined) r.output = output;
  if (error) r.error = String(error);
  if (code) r.code = code;
  if (details) r.details = details;
  return r;
}

async function listDir(args) {
  try {
    const p = safeResolve(args.path || '.');
    const entries = await fs.promises.readdir(p, { withFileTypes: true });
    const out = [];
    for (const e of entries) {
      const full = path.join(p, e.name);
      const s = await fs.promises.stat(full);
      out.push({ name: e.name, path: path.relative(BASE_DIR, full), isFile: e.isFile(), isDirectory: e.isDirectory(), size: s.size, mtimeMs: s.mtimeMs });
    }
    return makeResult(true, out);
  } catch (e) {
    return makeResult(false, null, e.message || e, e.code || 'io_error');
  }
}

async function readFile(args) {
  try {
    const p = safeResolve(args.path);
    const enc = args.encoding || 'utf8';
    const data = await fs.promises.readFile(p);
    const out = enc === 'base64' ? data.toString('base64') : data.toString('utf8');
    return makeResult(true, { content: out });
  } catch (e) {
    if (e.code === 'ENOENT') return makeResult(false, null, 'Not found', 'not_found');
    return makeResult(false, null, e.message || e, e.code || 'io_error');
  }
}

async function writeFile(args) {
  try {
    const p = safeResolve(args.path);
    const enc = args.encoding || 'utf8';
    const overwrite = args.overwrite !== false;
    try {
      await fs.promises.access(p);
      if (!overwrite) return makeResult(false, null, 'File exists', 'exists');
    } catch (_) {
      // not exists
    }
    const data = enc === 'base64' ? Buffer.from(args.content, 'base64') : String(args.content);
    await fs.promises.mkdir(path.dirname(p), { recursive: true });
    await fs.promises.writeFile(p, data, enc === 'utf8' ? 'utf8' : undefined);
    return makeResult(true, { path: path.relative(BASE_DIR, p) });
  } catch (e) {
    return makeResult(false, null, e.message || e, e.code || 'io_error');
  }
}

async function appendFile(args) {
  try {
    const p = safeResolve(args.path);
    const enc = args.encoding || 'utf8';
    const data = enc === 'base64' ? Buffer.from(args.content, 'base64') : String(args.content);
    await fs.promises.mkdir(path.dirname(p), { recursive: true });
    await fs.promises.appendFile(p, data);
    return makeResult(true, { path: path.relative(BASE_DIR, p) });
  } catch (e) {
    return makeResult(false, null, e.message || e, e.code || 'io_error');
  }
}

async function mkdir(args) {
  try {
    const p = safeResolve(args.path);
    await fs.promises.mkdir(p, { recursive: true });
    return makeResult(true, { path: path.relative(BASE_DIR, p) });
  } catch (e) {
    return makeResult(false, null, e.message || e, e.code || 'io_error');
  }
}

async function remove(args) {
  try {
    const p = safeResolve(args.path);
    const recursive = !!args.recursive;
    const stat = await fs.promises.stat(p).catch(() => null);
    if (!stat) return makeResult(false, null, 'Not found', 'not_found');
    if (stat.isDirectory()) {
      if (!recursive) {
        // attempt rmdir; will fail if not empty
        await fs.promises.rmdir(p);
      } else {
        await fs.promises.rm(p, { recursive: true, force: true });
      }
    } else {
      await fs.promises.unlink(p);
    }
    return makeResult(true, { path: path.relative(BASE_DIR, p) });
  } catch (e) {
    return makeResult(false, null, e.message || e, e.code || 'io_error');
  }
}

async function copy(args) {
  try {
    const src = safeResolve(args.src);
    const dest = safeResolve(args.dest);
    const overwrite = !!args.overwrite;
    if (!overwrite) {
      try { await fs.promises.access(dest); return makeResult(false, null, 'Destination exists', 'exists'); } catch(_) {}
    }
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.copyFile(src, dest);
    return makeResult(true, { src: path.relative(BASE_DIR, src), dest: path.relative(BASE_DIR, dest) });
  } catch (e) {
    return makeResult(false, null, e.message || e, e.code || 'io_error');
  }
}

async function move(args) {
  try {
    const src = safeResolve(args.src);
    const dest = safeResolve(args.dest);
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.rename(src, dest);
    return makeResult(true, { src: path.relative(BASE_DIR, src), dest: path.relative(BASE_DIR, dest) });
  } catch (e) {
    return makeResult(false, null, e.message || e, e.code || 'io_error');
  }
}

async function search(args) {
  try {
    const root = safeResolve(args.path || '.');
    const pattern = args.pattern || ".*";
    const re = new RegExp(pattern, 'i');
    const maxResults = args.maxResults || 1000;
    const results = [];

    async function walk(dir) {
      const ents = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const e of ents) {
        const full = path.join(dir, e.name);
        const rel = path.relative(BASE_DIR, full);
        if (re.test(e.name) || re.test(rel)) {
          const s = await fs.promises.stat(full);
          results.push({ name: e.name, path: rel, isFile: e.isFile(), isDirectory: e.isDirectory(), size: s.size, mtimeMs: s.mtimeMs });
          if (results.length >= maxResults) return;
        }
        if (e.isDirectory()) {
          await walk(full);
          if (results.length >= maxResults) return;
        }
      }
    }

    await walk(root);
    return makeResult(true, results.slice(0, maxResults));
  } catch (e) {
    return makeResult(false, null, e.message || e, e.code || 'io_error');
  }
}

async function metadata(args) {
  try {
    const p = safeResolve(args.path);
    const s = await fs.promises.stat(p);
    return makeResult(true, { path: path.relative(BASE_DIR, p), size: s.size, mtimeMs: s.mtimeMs, atimeMs: s.atimeMs, ctimeMs: s.ctimeMs, mode: s.mode });
  } catch (e) {
    return makeResult(false, null, e.message || e, e.code || 'io_error');
  }
}

// validators (Ajv compiled from manifest shapes could be used, but we define inline simple validators where useful)

module.exports = {
  manifest: require('./plugin.json'),
  initialize: async function(ctx) {
    // plugin initialization hook
    console.log('Filesystem plugin initialized. BASE_DIR=', BASE_DIR);
  },
  shutdown: async function(ctx) {
    console.log('Filesystem plugin shutdown.');
  },
  tools: [
    { id: 'fs.list', name: 'List Directory', execute: async (args, ctx) => {
      const schema = module.exports.manifest.tools.find(t=>t.id==='fs.list').input_schema;
      const validate = ajv.compile(schema);
      if (!validate(args)) return makeResult(false,null,'Invalid input','invalid_input',validate.errors);
      return listDir(args);
    }},
    { id: 'fs.read', name: 'Read File', execute: async (args, ctx) => {
      const schema = module.exports.manifest.tools.find(t=>t.id==='fs.read').input_schema;
      const validate = ajv.compile(schema);
      if (!validate(args)) return makeResult(false,null,'Invalid input','invalid_input',validate.errors);
      return readFile(args);
    }},
    { id: 'fs.write', name: 'Write File', execute: async (args, ctx) => {
      const schema = module.exports.manifest.tools.find(t=>t.id==='fs.write').input_schema;
      const validate = ajv.compile(schema);
      if (!validate(args)) return makeResult(false,null,'Invalid input','invalid_input',validate.errors);
      return writeFile(args);
    }},
    { id: 'fs.append', name: 'Append File', execute: async (args, ctx) => {
      const schema = module.exports.manifest.tools.find(t=>t.id==='fs.append').input_schema;
      const validate = ajv.compile(schema);
      if (!validate(args)) return makeResult(false,null,'Invalid input','invalid_input',validate.errors);
      return appendFile(args);
    }},
    { id: 'fs.mkdir', name: 'Create Directory', execute: async (args, ctx) => {
      const schema = module.exports.manifest.tools.find(t=>t.id==='fs.mkdir').input_schema;
      const validate = ajv.compile(schema);
      if (!validate(args)) return makeResult(false,null,'Invalid input','invalid_input',validate.errors);
      return mkdir(args);
    }},
    { id: 'fs.delete', name: 'Delete Path', execute: async (args, ctx) => {
      const schema = module.exports.manifest.tools.find(t=>t.id==='fs.delete').input_schema;
      const validate = ajv.compile(schema);
      if (!validate(args)) return makeResult(false,null,'Invalid input','invalid_input',validate.errors);
      return remove(args);
    }},
    { id: 'fs.copy', name: 'Copy File', execute: async (args, ctx) => {
      const schema = module.exports.manifest.tools.find(t=>t.id==='fs.copy').input_schema;
      const validate = ajv.compile(schema);
      if (!validate(args)) return makeResult(false,null,'Invalid input','invalid_input',validate.errors);
      return copy(args);
    }},
    { id: 'fs.move', name: 'Move/Rename', execute: async (args, ctx) => {
      const schema = module.exports.manifest.tools.find(t=>t.id==='fs.move').input_schema;
      const validate = ajv.compile(schema);
      if (!validate(args)) return makeResult(false,null,'Invalid input','invalid_input',validate.errors);
      return move(args);
    }},
    { id: 'fs.search', name: 'Search Files', execute: async (args, ctx) => {
      const schema = module.exports.manifest.tools.find(t=>t.id==='fs.search').input_schema;
      const validate = ajv.compile(schema);
      if (!validate(args)) return makeResult(false,null,'Invalid input','invalid_input',validate.errors);
      return search(args);
    }},
    { id: 'fs.metadata', name: 'File Metadata', execute: async (args, ctx) => {
      const schema = module.exports.manifest.tools.find(t=>t.id==='fs.metadata').input_schema;
      const validate = ajv.compile(schema);
      if (!validate(args)) return makeResult(false,null,'Invalid input','invalid_input',validate.errors);
      return metadata(args);
    }}
  ]
};
