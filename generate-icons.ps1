# PowerShell script to generate placeholder icons for the Chrome extension
# This creates simple colored square icons in the required sizes

Write-Host "Generating extension icons..." -ForegroundColor Cyan

# Load required assembly for image manipulation
Add-Type -AssemblyName System.Drawing

# Define icon sizes
$sizes = @(16, 32, 48, 128)

# Define color (purple/blue theme)
$color = [System.Drawing.Color]::FromArgb(102, 126, 234)

# Ensure icons directory exists
$iconsDir = Join-Path $PSScriptRoot "icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
    Write-Host "Created icons directory" -ForegroundColor Green
}

# Generate each icon size
foreach ($size in $sizes) {
    try {
        # Create bitmap
        $bitmap = New-Object System.Drawing.Bitmap($size, $size)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        
        # Set high quality rendering
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        
        # Fill background
        $brush = New-Object System.Drawing.SolidBrush($color)
        $graphics.FillRectangle($brush, 0, 0, $size, $size)
        
        # Add "AI" text (only for larger icons)
        if ($size -ge 32) {
            $fontFamily = [System.Drawing.FontFamily]::GenericSansSerif
            $fontSize = $size / 2.5
            $font = New-Object System.Drawing.Font($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold)
            $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
            
            $text = "AI"
            $textSize = $graphics.MeasureString($text, $font)
            $x = ($size - $textSize.Width) / 2
            $y = ($size - $textSize.Height) / 2
            
            $graphics.DrawString($text, $font, $textBrush, $x, $y)
            
            $font.Dispose()
            $textBrush.Dispose()
        }
        
        # Save the icon
        $filename = Join-Path $iconsDir "icon$size.png"
        $bitmap.Save($filename, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host "Created: icon$size.png" -ForegroundColor Green
        
        # Clean up
        $brush.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
    catch {
        Write-Host "Error creating icon$size.png: $_" -ForegroundColor Red
    }
}

Write-Host "`nAll icons generated successfully!" -ForegroundColor Green
Write-Host "You can now load the extension in Chrome." -ForegroundColor Cyan
