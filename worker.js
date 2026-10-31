export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Forward API requests to the production Render backend
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = new URL(url.pathname + url.search, 'https://agentic-ai-uncharted.onrender.com');
      const headers = new Headers(request.headers);
      headers.set('Host', 'agentic-ai-uncharted.onrender.com');
      const proxyRequest = new Request(backendUrl.toString(), {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow'
      });
      return fetch(proxyRequest);
    }

    // Serve static asset from the compiled frontend
    let response = await env.ASSETS.fetch(request);

    // SPA Fallback: for client-side navigation paths (no file extension), return index.html
    if (response.status === 404 && !url.pathname.slice(url.pathname.lastIndexOf('/')).includes('.')) {
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      response = await env.ASSETS.fetch(indexRequest);
    }

    return response;
  }
};
