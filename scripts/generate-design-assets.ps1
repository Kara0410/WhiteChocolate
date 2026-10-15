param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$imagesDirectory = Join-Path $workspace 'assets\images'
$violet = [System.Drawing.ColorTranslator]::FromHtml('#824DFF')
$white = [System.Drawing.Color]::White
$transparent = [System.Drawing.Color]::Transparent

function New-ParkingMarkPath {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new(
    [System.Drawing.Drawing2D.FillMode]::Alternate
  )

  $path.StartFigure()
  $path.AddLine(310, 750, 310, 250)
  $path.AddBezier(310, 250, 310, 220, 334, 196, 364, 196)
  $path.AddLine(364, 196, 550, 196)
  $path.AddBezier(550, 196, 680, 196, 760, 276, 760, 392)
  $path.AddBezier(760, 392, 760, 508, 680, 588, 550, 588)
  $path.AddLine(550, 588, 430, 588)
  $path.AddLine(430, 588, 430, 750)
  $path.AddBezier(430, 750, 430, 783, 403, 810, 370, 810)
  $path.AddBezier(370, 810, 337, 810, 310, 783, 310, 750)
  $path.CloseFigure()

  $path.StartFigure()
  $path.AddLine(430, 316, 540, 316)
  $path.AddBezier(540, 316, 600, 316, 640, 344, 640, 392)
  $path.AddBezier(640, 392, 640, 440, 600, 468, 540, 468)
  $path.AddLine(540, 468, 430, 468)
  $path.CloseFigure()

  return $path
}

function Write-ParkingAsset {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][int]$Size,
    [Parameter(Mandatory = $true)][System.Drawing.Color]$Background,
    [Parameter(Mandatory = $true)][System.Drawing.Color]$Foreground,
    [double]$Scale = 1.0
  )

  $bitmap = [System.Drawing.Bitmap]::new(
    $Size,
    $Size,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $pathGeometry = New-ParkingMarkPath
  $brush = [System.Drawing.SolidBrush]::new($Foreground)

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear($Background)

    $baseScale = $Size / 1024.0
    $combinedScale = $baseScale * $Scale
    $offset = ($Size - (1024.0 * $combinedScale)) / 2.0
    $graphics.TranslateTransform([single]$offset, [single]$offset)
    $graphics.ScaleTransform([single]$combinedScale, [single]$combinedScale)
    $graphics.FillPath($brush, $pathGeometry)
    $graphics.ResetTransform()

    $target = [System.IO.Path]::GetFullPath($Path)
    if (-not $target.StartsWith($workspace, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Asset target escaped the workspace: $target"
    }
    $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $brush.Dispose()
    $pathGeometry.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

Write-ParkingAsset -Path (Join-Path $imagesDirectory 'icon.png') -Size 1024 -Background $violet -Foreground $white
Write-ParkingAsset -Path (Join-Path $imagesDirectory 'favicon.png') -Size 48 -Background $violet -Foreground $white
Write-ParkingAsset -Path (Join-Path $imagesDirectory 'splash-icon.png') -Size 256 -Background $transparent -Foreground $white -Scale 0.84
Write-ParkingAsset -Path (Join-Path $imagesDirectory 'android-icon-foreground.png') -Size 512 -Background $transparent -Foreground $white -Scale 0.66
Write-ParkingAsset -Path (Join-Path $imagesDirectory 'android-icon-monochrome.png') -Size 432 -Background $transparent -Foreground $white -Scale 0.66
