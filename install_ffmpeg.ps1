$ErrorActionPreference = "Stop"
$workDir = "d:\SyncFrame(Lab based project)\src-tauri\bin"
$zipPath = "$workDir\ffmpeg.zip"
$url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"

Write-Host "Downloading FFmpeg from $url..."
Invoke-WebRequest -Uri $url -OutFile $zipPath

Write-Host "Extracting..."
Expand-Archive -Path $zipPath -DestinationPath $workDir -Force

Write-Host "Moving binaries..."
$extractedDir = Get-ChildItem -Path $workDir -Directory | Select-Object -First 1
Move-Item -Path "$($extractedDir.FullName)\bin\ffmpeg.exe" -Destination $workDir -Force
Move-Item -Path "$($extractedDir.FullName)\bin\ffprobe.exe" -Destination $workDir -Force

Write-Host "Cleaning up..."
Remove-Item -Path $zipPath -Force
Remove-Item -Path $extractedDir.FullName -Recurse -Force

Write-Host "FFmpeg installed successfully to $workDir"
Get-Command "$workDir\ffmpeg.exe"
