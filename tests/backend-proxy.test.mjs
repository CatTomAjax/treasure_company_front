import assert from 'node:assert/strict';
import { proxyBackend } from '../lib/backend-proxy.ts';
const original = globalThis.fetch,
  calls = [];
let checks = 0;
const check = (v, label) => {
  assert.ok(v, label);
  checks++;
};
try {
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    calls.push(request);
    const h = new Headers({
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
      'Content-Length': '123',
    });
    h.append(
      'Set-Cookie',
      'qianhai_session=test-only; Path=/; HttpOnly; SameSite=Strict; Domain=backend.test',
    );
    h.append('Set-Cookie', 'other=test-only; Path=/; HttpOnly');
    return new Response(
      JSON.stringify({
        ok: true,
        body: request.body ? await request.text() : '',
      }),
      { headers: h },
    );
  };
  const url = 'https://front.test/api/platform/auth?q=test';
  const response = await proxyBackend(
    new Request(url, {
      method: 'POST',
      headers: {
        Origin: 'https://front.test',
        Cookie: 'qianhai_session=test-only',
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
      },
      body: '{"action":"login"}',
    }),
    'http://backend.test:3003',
  );
  check(response.status === 200, '合法同源请求可代理');
  check(
    calls[0].headers.get('accept-encoding') === 'identity',
    '浏览器压缩能力不透传到 Node 后端请求，避免 zstd 响应被误当 JSON',
  );
  check(
    calls[0].url === 'http://backend.test:3003/api/platform/auth?q=test',
    '路径和查询参数保留',
  );
  check(
    calls[0].headers.get('origin') === 'http://backend.test:3003',
    '仅在校验后重写同源头',
  );
  check(
    calls[0].headers.get('cookie') === 'qianhai_session=test-only',
    '现有登录会话可透传',
  );
  check(
    (await response.json()).body === '{"action":"login"}',
    '原始请求体保留',
  );
  check(response.headers.getSetCookie().length === 2, '多个会话响应头保留');
  check(
    response.headers
      .getSetCookie()
      .every((c) => c.includes('Secure') && !c.includes('Domain=')),
    'HTTPS Cookie 安全属性与前端域名正确',
  );
  check(
    !response.headers.has('content-encoding') &&
      !response.headers.has('content-length'),
    '已解压响应不保留失效压缩和长度头',
  );
  check(
    (
      await proxyBackend(
        new Request(url, {
          method: 'POST',
          headers: { Origin: 'https://evil.test' },
          body: 'x',
        }),
        'http://backend.test',
      )
    ).status === 403,
    '拒绝跨源写入',
  );
  check(
    (
      await proxyBackend(
        new Request(url, {
          method: 'POST',
          headers: { 'Sec-Fetch-Site': 'cross-site' },
          body: 'x',
        }),
        'http://backend.test',
      )
    ).status === 403,
    '拒绝跨站写入',
  );
  check(
    (await proxyBackend(new Request(url), 'http://user:secret@backend.test'))
      .status === 503,
    '禁止在后端地址中嵌入凭据',
  );
  check(
    (await proxyBackend(new Request(url), 'file:///tmp/test')).status === 503,
    '仅允许 HTTP 后端',
  );
  check(
    (
      await proxyBackend(
        new Request('https://front.test/private'),
        'http://backend.test',
      )
    ).status === 400,
    '仅代理 API 路径',
  );
  check(calls.length === 1, '无效请求不会传给后端');
  globalThis.fetch = async () =>
    new Response('data: demo\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  const stream = await proxyBackend(new Request(url), 'http://backend.test');
  check(
    stream.headers.get('content-type').includes('text/event-stream') &&
      (await stream.text()) === 'data: demo\n\n',
    'AI 事件流内容可透传',
  );
  globalThis.fetch = async () => {
    throw Error('private transport detail');
  };
  const unavailable = await proxyBackend(
    new Request(url),
    'http://backend.test',
  );
  check(
    unavailable.status === 502 &&
      !JSON.stringify(await unavailable.json()).includes('private'),
    '后端不可用时返回安全的错误',
  );
  console.log(`PASS ${checks} frontend/backend proxy assertions`);
} finally {
  globalThis.fetch = original;
}
