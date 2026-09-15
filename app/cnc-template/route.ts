export function GET(request: Request) {
  return Response.redirect(
    new URL("/cnc-template-tool/index.html", request.url),
    307,
  );
}
