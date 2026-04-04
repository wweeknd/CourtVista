Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param([string]$InputPath, [string]$OutputPath, [int]$MaxWidth = 200, [int]$Quality = 60)
    
    $img = [System.Drawing.Image]::FromFile($InputPath)
    $ratio = $img.Height / $img.Width
    $newW = $MaxWidth
    $newH = [int]($ratio * $newW)
    
    $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($img, 0, 0, $newW, $newH)
    $g.Dispose()
    
    $codecInfo = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
    $bmp.Save($OutputPath, $codecInfo, $ep)
    
    $bmp.Dispose()
    $img.Dispose()
    
    $size = (Get-Item $OutputPath).Length
    Write-Output "Saved $OutputPath ($size bytes)"
}

$base = "c:\SIP PROJECT\CourtVista"

Resize-Image -InputPath "$base\matt_murdock_photo.png" -OutputPath "$base\matt_small.jpg"
Resize-Image -InputPath "$base\saul_goodman_photo.png" -OutputPath "$base\saul_small.jpg"

Write-Output "DONE"
