$ErrorActionPreference = 'Stop'

$chromePath = if ($env:CHROME_BIN) { $env:CHROME_BIN } else { 'C:\Program Files\Google\Chrome\Application\chrome.exe' }
$nodePath = (Get-Command node).Source
$scriptPath = Join-Path $PSScriptRoot 'not_found_check.mjs'
$online = $args -contains '--online'
$profile = Join-Path $PSScriptRoot ('.not-found-profile-' + [guid]::NewGuid().ToString('N'))
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$listener.Stop()

$chromeProcess = $null
$oldPort = $env:QODER_CDP_PORT
$env:QODER_CDP_PORT = [string]$port
$resolvedRoot = [System.IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\') + '\'
$resolvedProfile = [System.IO.Path]::GetFullPath($profile)
if (-not $resolvedProfile.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to create Chrome profile outside QA directory: $resolvedProfile"
}

try {
    $chromeArgs = @(
        '--headless=new',
        "--remote-debugging-port=$port",
        '--remote-allow-origins=*',
        "--user-data-dir=$profile",
        '--no-sandbox',
        '--disable-gpu',
        '--no-first-run',
        '--disable-dev-shm-usage',
        '--window-size=1400,1000',
        'about:blank'
    )
    $chromeProcess = Start-Process -FilePath $chromePath -ArgumentList $chromeArgs -PassThru -WindowStyle Hidden
    $ready = $false
    for ($i = 0; $i -lt 120; $i++) {
        try {
            $null = Invoke-RestMethod -Uri "http://127.0.0.1:$port/json/list" -TimeoutSec 1
            $ready = $true
            break
        } catch {
            Start-Sleep -Milliseconds 250
        }
    }
    if (-not $ready) { throw 'Chrome DevTools endpoint did not start.' }
    & $nodePath $scriptPath @args
    exit $LASTEXITCODE
} finally {
    if ($chromeProcess -and -not $chromeProcess.HasExited) {
        Stop-Process -Id $chromeProcess.Id -Force -ErrorAction SilentlyContinue
        [void]$chromeProcess.WaitForExit(5000)
    }
    if ((Test-Path -LiteralPath $resolvedProfile) -and $resolvedProfile.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $resolvedProfile -Recurse -Force -ErrorAction SilentlyContinue
    }
    if ($null -eq $oldPort) { Remove-Item Env:QODER_CDP_PORT -ErrorAction SilentlyContinue }
    else { $env:QODER_CDP_PORT = $oldPort }
}
