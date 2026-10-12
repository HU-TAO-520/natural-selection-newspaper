param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('local','online')]
  [string]$Phase
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$RunStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Run = Join-Path $PSScriptRoot ("runs\task20-{0}-{1}" -f $Phase, $RunStamp)
New-Item -ItemType Directory -Path $Run -Force | Out-Null
$SummaryPath = Join-Path $Run 'run_summary.json'
$Rows = [System.Collections.Generic.List[object]]::new()
$Python = (Get-Command python).Source
$Node = (Get-Command node).Source
$EnvNames = @('QODER_FACTS','QODER_REPORT','QODER_SRC_FACTS','QODER_SRC_CHECK_RC','QODER_PACKAGE_REPORT','QODER_RESULTS_DIR','QODER_REPORT_DIR','QODER_TASK18_REPORT','QODER_SKIP_ONLINE','QODER_CDP_PORT','QODER_RUN_DIR')
$SavedEnv = @{}
foreach ($name in $EnvNames) { $SavedEnv[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }

function Add-Result([string]$Id, [string]$Status, [string]$Case, $Expected, $Actual, [string]$Source) {
  $Rows.Add([pscustomobject]@{ id=$Id; status=$Status; target=$Phase; case=$Case; expected=$Expected; actual=$Actual; source=$Source })
}

function Invoke-Captured([string]$Id, [string]$Exe, [string[]]$CommandArgs) {
  $log = Join-Path $Run ($Id + '.log')
  try {
    $lines = & $Exe @CommandArgs 2>&1
    $rc = $LASTEXITCODE
    $lines | Out-File -LiteralPath $log -Encoding utf8
    foreach ($line in $lines) { Write-Host $line }
    Add-Result $Id $(if($rc -eq 0){'PASS'}else{'FAIL'}) 'command' 0 $rc $log
    return $rc
  } catch {
    $_ | Out-File -LiteralPath $log -Encoding utf8
    Add-Result $Id 'FAIL' 'exception' 'command completes' $_.Exception.Message $log
    return 2
  }
}

Push-Location $Root
try {
  if ($Phase -eq 'online') {
    # Online mode is intentionally read-only. It requests both uploaded identities and assets.
    $MainBase = if ($env:QODER_MAIN_BASE) { $env:QODER_MAIN_BASE.TrimEnd('/') } else { 'https://old-ns-news.pages.dev' }
    $PreviewBase = if ($env:QODER_PREVIEW_BASE) { $env:QODER_PREVIEW_BASE.TrimEnd('/') } else { 'https://easteregg.old-ns-news.pages.dev' }
    $Targets = @(
      @{name='main'; base=$MainBase; page=($MainBase + '/easteregg.html'); css=($MainBase + '/easteregg.css'); js=($MainBase + '/easteregg.js'); errorTitle='页面不存在｜自然选择号'; errorH1='页面不存在'; cssRef='/styles.css'},
      @{name='preview'; base=$PreviewBase; page=($PreviewBase + '/'); css=($PreviewBase + '/easteregg.css'); js=($PreviewBase + '/easteregg.js'); errorTitle='档案不存在｜自然选择号'; errorH1='档案不存在'; cssRef='/easteregg.css'}
    )
    $MainManifest = Get-Content (Join-Path $Root 'deploy\manifest.json') -Raw | ConvertFrom-Json
    $PreviewManifest = Get-Content (Join-Path $Root 'deploy\easteregg-manifest.json') -Raw | ConvertFrom-Json
    foreach ($target in $Targets) {
      try {
        $pageResponse = Invoke-WebRequest -Uri $target.page -UseBasicParsing -TimeoutSec 20
        $pageText = [string]$pageResponse.Content
        $titleMatch = [regex]::Match($pageText, '<title>(.*?)</title>', 'Singleline')
        $h1Match = [regex]::Match($pageText, '<h1\b[^>]*>(.*?)</h1>', 'Singleline')
        $expectedTitle = '自然选择号：最后的回波'
        $okIdentity = $pageResponse.StatusCode -eq 200 -and $titleMatch.Success -and $titleMatch.Groups[1].Value -eq $expectedTitle -and $h1Match.Success -and $h1Match.Groups[1].Value -eq '自然选择号：最后的回波'
        Add-Result ($target.name + '-O01') $(if($okIdentity){'PASS'}else{'FAIL'}) 'uploaded-root-identity' 200+expected-title-and-h1 @{status=$pageResponse.StatusCode; title=$titleMatch.Groups[1].Value; h1=$h1Match.Groups[1].Value} $target.page
        $manifest = if($target.name -eq 'main'){$MainManifest}else{$PreviewManifest}
        $assetRows = @(@{url=$target.css; path=if($target.name -eq 'main'){'easteregg.css'}else{'easteregg.css'}}, @{url=$target.js; path='easteregg.js'})
        foreach($asset in $assetRows) {
          $assetResponse = Invoke-WebRequest -Uri $asset.url -UseBasicParsing -TimeoutSec 20
          $hash = [System.Security.Cryptography.SHA256]::Create()
          try { $digest = ([Convert]::ToHexString($hash.ComputeHash([System.Text.Encoding]::UTF8.GetBytes([string]$assetResponse.Content)))).ToLowerInvariant() } finally { $hash.Dispose() }
          $entry = $manifest.pages | Where-Object { $_.path -eq $asset.path } | Select-Object -First 1
          $okAsset = $assetResponse.StatusCode -eq 200 -and $entry -and $digest -eq $entry.sha256
          Add-Result ($target.name + '-O02-' + $asset.path) $(if($okAsset){'PASS'}else{'FAIL'}) 'uploaded-asset-sha256' $entry.sha256 $digest $asset.url
        }
        $missing = $target.base + '/__task20_missing_' + $RunStamp
        try { $bad = Invoke-WebRequest -Uri $missing -UseBasicParsing -TimeoutSec 20 -SkipHttpErrorCheck; $status = [int]$bad.StatusCode; $body = [string]$bad.Content }
        catch { $status = [int]$_.Exception.Response.StatusCode; $body = [string]$_.ErrorDetails.Message }
        if ($status -ne 404) { Add-Result ($target.name + '-O04-status') 'FAIL' 'uploaded-unknown-path' 404 $status $missing }
        else { Add-Result ($target.name + '-O04-status') 'PASS' 'uploaded-unknown-path' 404 $status $missing }
        if ($body) {
          $errorIdentity = $body.Contains('<title>' + $target.errorTitle + '</title>') -and $body.Contains('<h1') -and $body.Contains($target.errorH1) -and $body.Contains('href="' + $target.cssRef + '"')
          Add-Result ($target.name + '-O04-identity') $(if($errorIdentity){'PASS'}else{'FAIL'}) 'uploaded-404-identity-and-css' $target.errorTitle $errorIdentity $missing
        } else { Add-Result ($target.name + '-O04-identity') 'FAIL' 'uploaded-404-body' 'identity body' 'not returned' $missing }
      } catch {
        Add-Result ($target.name + '-online-request') 'FAIL' 'read-only-http-request' 'uploaded target responds' $_.Exception.Message $target.page
      }
    }
  } else {
    $RunDir = $Run
    $rc = Invoke-Captured 'core' $Node @((Join-Path $Root 'qa\_qa_task20\core_tests.mjs'))
    $rc = Invoke-Captured 'core-bundle' $Node @((Join-Path $Root 'qa\_qa_task20\core_tests.mjs'), '--bundle')
    foreach ($p in @('story','binding','style','main-candidate','dual-target','static')) {
      $rc = Invoke-Captured $p $Python @((Join-Path $Root 'qa\_qa_task20\verify20.py'), '--phase', $p, '--report', (Join-Path $Run ($p + '_results.json')))
    }
    $rc = Invoke-Captured 'packages' $Python @((Join-Path $Root 'qa\_qa_task20\verify_packages20.py'), '--output', (Join-Path $Run 'package_results.json'))
    $env:QODER_RUN_DIR = $Run
    $rc = Invoke-Captured 'http-fixture' $Node @((Join-Path $Root 'qa\_qa_task20\http_fixture20.mjs'), '--smoke')

    $srcFacts = Join-Path $Run 'src_facts.json'
    $srcArgs = @((Join-Path $Root 'qa\_qa_task18\src_check.py'), '--content','content','--plan','plan','--manifest','deploy\manifest.json','--out',$srcFacts)
    $srcRc = Invoke-Captured 'task18-src' $Python $srcArgs
    $facts = Join-Path $Run 'facts.json'
    $env:QODER_FACTS = $facts
    $probeRc = Invoke-Captured 'task18-probe' $Node @((Join-Path $Root 'qa\_qa_task18\probe_task18.mjs'))
    $env:QODER_REPORT = Join-Path $Run 'task18_results.md'
    $env:QODER_SRC_FACTS = $srcFacts
    $env:QODER_SRC_CHECK_RC = [string]$srcRc
    $env:QODER_PACKAGE_REPORT = Join-Path $Run 'package_results.json'
    $env:QODER_RESULTS_DIR = Join-Path $Root 'Results'
    $task18Rc = Invoke-Captured 'task18-verify' $Node @((Join-Path $Root 'qa\_qa_task18\verify_task18.mjs'))

    $env:QODER_REPORT_DIR = $Run
    $env:QODER_TASK18_REPORT = Join-Path $Run 'task18_results.md'
    $env:QODER_SKIP_ONLINE = '1'
    $env:QODER_CDP_PORT = '9398'
    $task19Rc = Invoke-Captured 'task19-all' $Node @((Join-Path $Root 'qa\_qa_task19\cdp_regression19.mjs'))
    $resultsPath = Join-Path $Run 'results.json'
    $browserUnavailable = $false
    if (Test-Path -LiteralPath $resultsPath) {
      $task19Data = Get-Content $resultsPath -Raw | ConvertFrom-Json
      $browserUnavailable = @($task19Data.rows | Where-Object { $_.id -in @('RZ96','RZ99') -and $_.status -eq 'FAIL' }).Count -gt 0
    }
    if ($browserUnavailable) {
      Add-Result 'task19-segments' 'SKIPPED-BY-DESIGN' 'paper-segment-regression' '17 current-run segments' 'all-run driver failed before assertions; see results.json' $resultsPath
    } else {
      Add-Result 'task19-segments' 'FAIL' 'paper-segment-regression' '17 current-run segments' 'runner does not reuse historical segment files' $Run
    }
    $consistencyRc = Invoke-Captured 'task19-consistency' $Node @((Join-Path $Root 'qa\_qa_task19\consistency19.mjs'))
    $reportRc = Invoke-Captured 'task19-report' $Node @((Join-Path $Root 'qa\_qa_task19\make_report19.mjs'))
    if ($browserUnavailable) {
      Add-Result 'task20-browser' 'SKIPPED-BY-DESIGN' 'local-game-browser-and-mutations' 'browser20 automated suite and negative controls' 'Chrome/CDP unavailable; manual browser observations are recorded separately when provided' $Run
    } else {
      Add-Result 'task20-browser' 'FAIL' 'local-game-browser-and-mutations' 'browser20 automated suite and negative controls' 'not provided by this runner' $Run
    }

    # Final read-only boundary proof for all protected inputs listed at Task20 kickoff.
    $baseline = Get-Content (Join-Path $PSScriptRoot 'baseline_hashes.json') -Raw | ConvertFrom-Json
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $bad = @()
    foreach ($item in $baseline.protected_files) {
      $file = Join-Path $Root ($item.path -replace '/', '\')
      if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { $bad += ($item.path + ': missing'); continue }
      $actual = ([Convert]::ToHexString($sha.ComputeHash([System.IO.File]::ReadAllBytes($file)))).ToLowerInvariant()
      if ($actual -ne $item.sha256) { $bad += ($item.path + ': hash mismatch') }
    }
    $sha.Dispose()
    Add-Result 'protected-hashes' $(if($bad.Count -eq 0){'PASS'}else{'FAIL'}) 'protected-inputs' 'all kickoff protected_files' $bad.Count (Join-Path $PSScriptRoot 'baseline_hashes.json')
  }
} finally {
  Pop-Location
  foreach ($name in $EnvNames) {
    if ($null -eq $SavedEnv[$name]) { Remove-Item ("Env:" + $name) -ErrorAction SilentlyContinue }
    else { [Environment]::SetEnvironmentVariable($name, $SavedEnv[$name], 'Process') }
  }
}

$pass = @($Rows | Where-Object status -eq 'PASS').Count
$fail = @($Rows | Where-Object status -eq 'FAIL').Count
$skip = @($Rows | Where-Object status -eq 'SKIPPED-BY-DESIGN').Count
$overall = if($fail -eq 0 -and $skip -eq 0){'PASS'}else{'INCOMPLETE'}
$doc = [pscustomobject]@{ schema=1; phase=$Phase; runDirectory=$Run; status=$overall; summary=@{pass=$pass; fail=$fail; skipped=$skip}; checks=$Rows }
$doc | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $SummaryPath -Encoding utf8
Write-Output ("Task20 {0}: PASS={1} FAIL={2} SKIPPED={3} -> {4}" -f $Phase,$pass,$fail,$skip,$SummaryPath)
if ($overall -ne 'PASS') { exit 1 }
exit 0
