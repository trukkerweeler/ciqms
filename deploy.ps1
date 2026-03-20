# --- CONFIG ---
$server = "FS1.CI.local"
$remoteIncoming = "D:\Common\Applications\CIQMS\incoming"
$remoteScript = "C:\NodeApps\ciqms\scripts\deploy.ps1"

# Your repo root
$repoRoot = "C:\Users\TimK\Documents\CIQMS1"

# --- DEPLOYABLE APP CONTENT ---
# Only include the actual Node.js app files/folders
$include = @(
    "server.js",
    "routes",
    "middleware",
    "public",
    "utils",
    "sql",
    "xml",
    "package.json",
    "package-lock.json",
    "config.js",
    "qms.config.json"
)

# Build full paths
$paths = $include | ForEach-Object { Join-Path $repoRoot $_ }

# --- CREATE VERSIONED ZIP ---
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$zipName = "ciqms-$timestamp.zip"
$localZip = "$env:TEMP\$zipName"
$remoteZip = "$remoteIncoming\$zipName"

Write-Host "Zipping deployable app..."
if (Test-Path $localZip) { Remove-Item $localZip -Force }

try {
    Compress-Archive -Path $paths -DestinationPath $localZip -ErrorAction Stop
    if (-not (Test-Path $localZip)) {
        throw "Failed to create zip file"
    }
    Write-Host "ZIP created successfully: $localZip"
}
catch {
    Write-Error "Error creating zip: $_"
    exit 1
}

# --- COPY ZIP TO SERVER ---
Write-Host "Copying ZIP to server..."
$uncIncoming = "\\$server\$($remoteIncoming.Replace(':','$'))"
try {
    Copy-Item $localZip -Destination $uncIncoming -Force -ErrorAction Stop
    Write-Host "ZIP copied to server successfully"
}
catch {
    Write-Error "Error copying ZIP to server: $_"
    exit 1
}

# --- RUN REMOTE DEPLOYMENT ---
Write-Host "Running remote deployment script..."
try {
    $result = Invoke-Command -ComputerName $server -ErrorAction Continue -ScriptBlock {
        param($remoteZip, $remoteScript)
        & $remoteScript -ZipPath $remoteZip
    } -ArgumentList $remoteZip, $remoteScript

    if ($LASTEXITCODE -ne 0) {
        throw "Remote script failed with exit code $LASTEXITCODE"
    }

    Write-Host "Remote deployment completed successfully"
    if ($result) {
        Write-Host "Remote output:`n$result"
    }
}
catch {
    Write-Error "Error running remote deployment: $_"
    exit 1
}

Write-Host "Deployment complete."