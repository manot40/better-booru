const dist = new Bun.Glob('./dist/*.js{,.map}');

async function main() {
  for (const file of dist.scanSync()) await Bun.file(file).unlink();
  const result = await Bun.build({
    target: 'bun',
    outdir: './dist',
    external: ['@img/sharp-*'],
    splitting: true,
    sourcemap: 'linked',
    entrypoints: ['src/index.ts'],
  });

  console.info(result.success ? 'Server Build Success' : 'Server Build Failed');
}

main();
