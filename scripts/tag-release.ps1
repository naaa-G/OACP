# Tag an OACP release after verify. Does not push — review output before running git push.
param(
    [string]$Version = "v0.1.0-alpha"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "==> Running pnpm verify..."
pnpm verify
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "==> Ready to tag $Version"
Write-Host ""
Write-Host "Run these commands after reviewing CHANGELOG and .github/RELEASE_$Version.md:"
Write-Host ""
Write-Host "  git tag -a $Version -m `"OACP $Version public launch`""
Write-Host "  git push origin $Version"
Write-Host ""

$NotesFile = ".github/RELEASE_$Version.md"
if (Test-Path $NotesFile) {
    Write-Host "  gh release create $Version ``"
    Write-Host "    --title `"OACP $Version — multi-agent collaboration you can see live`" ``"
    Write-Host "    --notes-file $NotesFile"
} else {
    Write-Host "  (No $NotesFile — create release notes in GitHub UI)"
}
Write-Host ""
