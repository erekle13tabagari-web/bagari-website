param([int]$Port = 0, [string]$Root = '')
if (-not $Port) { if ($env:PORT) { $Port = [int]$env:PORT } else { $Port = 8123 } }
if ($Root) { $root = $Root } else { $root = Split-Path -Parent $PSScriptRoot }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$Port/"

$pool = [runspacefactory]::CreateRunspacePool(1, 8)
$pool.Open()

$handler = {
  param($ctx, $root)
  $mime = @{
    '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8';
    '.js'='application/javascript; charset=utf-8'; '.svg'='image/svg+xml';
    '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg';
    '.webp'='image/webp'; '.avif'='image/avif'; '.gif'='image/gif';
    '.json'='application/json'; '.woff2'='font/woff2'; '.woff'='font/woff'; '.ico'='image/x-icon'
  }
  try {
    $ctx.Response.KeepAlive = $false
    $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq '/') { $path = '/index.html' }
    $file = Join-Path $root ($path.TrimStart('/'))
    if (Test-Path $file -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch {}
  finally { try { $ctx.Response.OutputStream.Close() } catch {} }
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $ps = [powershell]::Create()
  $ps.RunspacePool = $pool
  [void]$ps.AddScript($handler).AddArgument($ctx).AddArgument($root)
  [void]$ps.BeginInvoke()
}
