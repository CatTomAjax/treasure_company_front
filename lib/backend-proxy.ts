/** Server-side transport for the separately published frontend repository. */
const transportHeaders = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'upgrade',
]);
export async function proxyBackend(
  request: Request,
  backend = process.env.API_BASE_URL || 'http://127.0.0.1:3003',
) {
  let target: URL;
  try {
    target = new URL(backend);
    if (
      !['http:', 'https:'].includes(target.protocol) ||
      target.username ||
      target.password ||
      target.pathname !== '/' ||
      target.search ||
      target.hash
    )
      throw Error();
  } catch {
    return Response.json(
      { error: '后端地址配置无效，请检查 API_BASE_URL' },
      { status: 503 },
    );
  }
  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith('/api/'))
    return Response.json({ error: '代理路径无效' }, { status: 400 });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (
      (origin && origin !== incoming.origin) ||
      request.headers.get('sec-fetch-site') === 'cross-site'
    )
      return Response.json({ error: '请求来源无效' }, { status: 403 });
  }
  const headers = new Headers(request.headers);
  for (const key of transportHeaders) headers.delete(key);
  // The browser calls its own frontend origin. Validate it above, then express
  // this trusted server hop as a same-origin request to the business backend.
  if (headers.has('origin')) headers.set('origin', target.origin);
  headers.set('sec-fetch-site', 'same-origin');
  headers.set('x-forwarded-host', incoming.host);
  headers.set('x-forwarded-proto', incoming.protocol.slice(0, -1));
  try {
    const response = await fetch(
      new URL(incoming.pathname + incoming.search, target.origin),
      {
        method: request.method,
        headers,
        redirect: 'manual',
        cache: 'no-store',
        signal: request.signal,
        ...(!['GET', 'HEAD'].includes(request.method) && request.body
          ? { body: request.body, duplex: 'half' }
          : {}),
      } as RequestInit & { duplex?: 'half' },
    );
    const outgoing = new Headers(response.headers);
    for (const key of [...transportHeaders, 'content-encoding', 'set-cookie'])
      outgoing.delete(key);
    outgoing.set('cache-control', 'no-store');
    for (let cookie of response.headers.getSetCookie()) {
      cookie = cookie.replace(/;\s*Domain=[^;]+/gi, '');
      if (incoming.protocol === 'https:' && !/;\s*Secure(?:;|$)/i.test(cookie))
        cookie += '; Secure';
      outgoing.append('set-cookie', cookie);
    }
    const location = outgoing.get('location');
    if (location) {
      const redirect = new URL(location, target.origin);
      if (redirect.origin === target.origin)
        outgoing.set(
          'location',
          incoming.origin + redirect.pathname + redirect.search + redirect.hash,
        );
    }
    return new Response(
      request.method === 'HEAD' || [204, 304].includes(response.status)
        ? null
        : response.body,
      {
        status: response.status,
        statusText: response.statusText,
        headers: outgoing,
      },
    );
  } catch {
    return Response.json(
      { error: '暂时无法连接业务后端，请检查后端服务与 API_BASE_URL' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
