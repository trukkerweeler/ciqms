# --- CONFIG ---
$server = "YOURSERVERNAME"   # e.g. server01 or server01.domain.local
$remoteIncoming = "C:\NodeApps\ciqms\incoming"
$remoteScript   = "C:\NodeApps\ciqms\scripts\deploy.ps1"
$localProject   = "C:\Projects\ciqms"   # your local app folder

# --- CREATE VERSIONED ZIP ---
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$zipName = "ciqms-$timestamp.zip"
$localZip = "$env:TEMP\$zipName"
$remoteZip = "$remoteIncoming\$zipName"

Write-Host "Zipping project..."
if (Test-Path $localZip) { Remove-Item $localZip -Force }
Compress-Archive -Path "$localProject\*" -DestinationPath $localZip

# --- COPY ZIP TO SERVER ---
Write-Host "Copying ZIP to server..."
Copy-Item $localZip -Destination "\\$server\$($remoteIncoming.Replace(':','$'))" -Force

# --- RUN REMOTE DEPLOYMENT ---
Write-Host "Running remote deployment script..."
Invoke-Command -ComputerName $server -ScriptBlock {
    param($remoteZip, $remoteScript)
    & $remoteScript -ZipPath $remoteZip
} -ArgumentList $remoteZip, $remoteScript

Write-Host "Deployment complete."