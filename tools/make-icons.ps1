# Draws the Gatelight app icons (a glowing amber aperture dot on darkroom black).
# Usage: powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "icons"
New-Item -ItemType Directory -Force $out | Out-Null

function Draw-Icon([int]$size, [string]$path, [double]$pad) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"
  $g.Clear([System.Drawing.Color]::FromArgb(255, 15, 13, 12))
  $c = $size / 2.0
  $inner = $size * (1 - 2 * $pad)
  # halation glow
  for ($i = 14; $i -ge 1; $i--) {
    $r = $inner * (0.20 + 0.025 * $i)
    $a = [int](10 + (14 - $i) * 3)
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($a, 230, 120, 70))
    $g.FillEllipse($brush, [float]($c - $r), [float]($c - $r), [float](2 * $r), [float](2 * $r))
    $brush.Dispose()
  }
  # film gate ring
  $ringR = $inner * 0.36
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 239, 230, 219)), ([float]($inner * 0.045))
  $g.DrawEllipse($pen, [float]($c - $ringR), [float]($c - $ringR), [float](2 * $ringR), [float](2 * $ringR))
  # amber core
  $coreR = $inner * 0.2
  $amber = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 230, 168, 90))
  $g.FillEllipse($amber, [float]($c - $coreR), [float]($c - $coreR), [float](2 * $coreR), [float](2 * $coreR))
  $hot = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(200, 255, 236, 200))
  $hr = $coreR * 0.45
  $g.FillEllipse($hot, [float]($c - $hr - $coreR * 0.2), [float]($c - $hr - $coreR * 0.2), [float](2 * $hr), [float](2 * $hr))
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
Draw-Icon 192 (Join-Path $out "icon-192.png") 0.06
Draw-Icon 512 (Join-Path $out "icon-512.png") 0.06
Draw-Icon 512 (Join-Path $out "maskable-512.png") 0.18
Get-ChildItem $out | Select-Object Name, Length
