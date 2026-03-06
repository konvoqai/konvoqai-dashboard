import { NextResponse } from 'next/server';

export async function GET() {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    'http://localhost:8080';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Widget Preview</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        width: 100%; height: 100%;
        background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <konvoq-chat
      id="konvoqWidgetPreview"
      api-url="${backendUrl}/api/v1/webhook"
      api-base-url="${backendUrl}"
      widget-key="preview"
      banner-text="Konvoq AI"
      banner-text-paragraph="Welcome to your live widget preview."
      auto-open="true"
    ></konvoq-chat>
    <script src="${backendUrl}/widget/konvoq-chat.js"></script>
    <script>
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'konvoq:preview-ready' }, '*');
      }
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
