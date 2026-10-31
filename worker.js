export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Forward all API calls seamlessly to the live Render backend
    if (url.pathname.startsWith('/api')) {
      const targetUrl = new URL(url.pathname + url.search, 'https://agentic-ai-uncharted.onrender.com');
      const modifiedRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow'
      });
      return fetch(modifiedRequest);
    }
    
    // 2. Serve static asset from the compiled frontend
    let response = await env.ASSETS.fetch(request);
    
    // 3. SPA Fallback: for client-side navigation paths (no file extension), return index.html
    if (response.status === 404 && !url.pathname.slice(url.pathname.lastIndexOf('/')).includes('.')) {
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      response = await env.ASSETS.fetch(indexRequest);
    }
    
    return response;
  }
};
