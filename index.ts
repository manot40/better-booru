const [scriptFile, cssFile] = await Promise.all([Bun.file("script.js").text(), Bun.file("style.css").text()]);

Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);
    url.port = "443";
    url.protocol = "https";
    url.hostname = "safebooru.org";

    const booruRes = await fetch(url, { headers: { "user-agent": req.headers.get("user-agent") || "" } });

    const headers = new Headers();
    headers.set("Content-Type", booruRes.headers.get("Content-Type") || "text/plaintext");
    headers.set("Access-Control-Allow-Origin", "safebooru.org");
    headers.set("Access-Control-Allow-Methods", "GET");

    if (req.headers.get("Accept")?.includes("text/html")) {
      const text = await booruRes.text();
      const inject = `<style>${cssFile}</style>\n<script type="module">${scriptFile}</script>`;
      return new Response(text.replace(/<\/head>/, inject + "\n</head>"), { headers });
    }

    return new Response(await booruRes.arrayBuffer(), { headers });
  },
});

export {};
