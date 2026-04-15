import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  const html = `
    <html>
      <body>
        <script>
          window.opener?.postMessage(
            { type: 'LINKEDIN_AUTH_CODE', code: '${code}' },
            window.location.origin
          );
          window.close();
        </script>
        <p>Connecting... you can close this window.</p>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}