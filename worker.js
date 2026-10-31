export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
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
