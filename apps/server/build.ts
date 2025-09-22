import { extname, basename } from 'node:path';

const dist = new Bun.Glob('./dist/*.js{,.map}');
const elysia = import.meta.require('elysia/package.json').version;
const bytesToSize = (bytes: number) => Math.max(0.01, bytes / (1024 * 1024)).toFixed(2) + ' MB';

for await (const file of dist.scan()) {
  await Bun.file(file).unlink();
}

const result = await Bun.build({
  throw: false,
  target: 'bun',
  outdir: './dist',
  external: ['@img/sharp-*'],
  splitting: true,
  sourcemap: 'linked',
  entrypoints: ['src/index.ts', 'src/worker.ts'],
  define: {
    'global.ELYSIA_VERSION': JSON.stringify(elysia),
  },
});

if (result.success) {
  const mapped = result.outputs.reduce((acc, output) => {
    const ext = extname(output.path);
    const [name] = basename(output.path).split('.');
    const key = `${name}.js`;

    acc[key] ??= <OutputMap['string']>{};
    acc[key][ext === '.js' ? 'chunk' : 'map'] = bytesToSize(output.size);

    return acc;
  }, {} as OutputMap);

  console.info(Bun.color('green', 'ansi') + 'Server Build Success', Bun.color('gray', 'ansi'));
  Object.entries(mapped).forEach(([key, value]) => {
    console.info(key, value.chunk, `[map: ${value.map}]`);
  });
} else {
  console.error(Bun.color('red', 'ansi'), 'Server Build Failed');
  result.logs.forEach((log) => console.warn(Bun.color('yellow', 'ansi'), log));
}

export {};

type OutputMap = Record<string, Record<'chunk' | 'map', string>>;
