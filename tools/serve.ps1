# Tiny static file server for testing Gatelight on this PC.
# Usage: powershell -ExecutionPolicy Bypass -File tools\serve.ps1 [-Port 8765]
# /samples/... is mapped to C:\Windows\Web so the test bench can use the Windows photos.
param([int]$Port = 8765)
$root = Split-Path -Parent $PSScriptRoot
$types = @{ ".html"="text/html; charset=utf-8"; ".js"="text/javascript"; ".json"="application/json";
  ".webmanifest"="application/manifest+json"; ".png"="image/png"; ".jpg"="image/jpeg"; ".svg"="image/svg+xml"; ".css"="text/css" }
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Host "Serving $root on http://localhost:$Port/"
while ($l.IsListening) {
  $c = $l.GetContext()
  $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath)
  if ($p -eq "/") { $p = "/index.html" }
  if ($p.StartsWith("/samples/")) { $f = Join-Path "C:\Windows\Web" $p.Substring(9) } else { $f = Join-Path $root $p.TrimStart("/") }
  try {
    if ((Test-Path $f -PathType Leaf) -and ($p -notmatch "\.\.")) {
      $b = [System.IO.File]::ReadAllBytes($f)
      $ext = [System.IO.Path]::GetExtension($f).ToLower()
      $c.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { "application/octet-stream" })
      $c.Response.Headers.Add("Cache-Control", "no-store")
      $c.Response.OutputStream.Write($b, 0, $b.Length)
    } else { $c.Response.StatusCode = 404 }
  } catch { $c.Response.StatusCode = 500 }
  $c.Response.Close()
}
