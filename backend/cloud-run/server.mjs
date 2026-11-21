import { createServer } from 'node:http';
import handler from './play-prayer-packs.mjs';

const limit = 16 * 1024;

createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url !== '/play-prayer-packs' || req.method !== 'POST') {
    res.writeHead(req.url === '/play-prayer-packs' ? 405 : 404).end();
    return;
  }
  try {
    let size = 0;
    const chunks = [];
    // Leave the socket open long enough to send 413 when the limit is exceeded.
    for await (const chunk of req.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      if (size > limit) {
        res.writeHead(413, { Connection: 'close' }).end();
        return;
      }
      chunks.push(chunk);
    }
    const result = await handler(new Request('https://localhost/play-prayer-packs', {
      method: 'POST',
      headers: { authorization: req.headers.authorization ?? '' },
      body: Buffer.concat(chunks)
    }));
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(Buffer.from(await result.arrayBuffer()));
  } catch {
    if (!res.headersSent) res.writeHead(503);
    res.end();
  }
}).listen(Number(process.env.PORT || 8080), '0.0.0.0');
