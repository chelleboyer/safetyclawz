# SafetyClawz Test Runner with Debug Mode
# Windows PowerShell script for easy observability testing

Write-Host ""
Write-Host "🛡️  SafetyClawz Test Runner" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Enable debug mode
$env:SAFETYCLAWZ_DEBUG = "true"

Write-Host "✓ Debug mode enabled: " -NoNewline -ForegroundColor Green
Write-Host "SAFETYCLAWZ_DEBUG=$env:SAFETYCLAWZ_DEBUG" -ForegroundColor Cyan

Write-Host "✓ Running tests with color-coded output..." -ForegroundColor Green
Write-Host ""

# Change to safety-claws directory
Set-Location -Path "$PSScriptRoot"

# Run tests
npm test

# Cleanup
$env:SAFETYCLAWZ_DEBUG = $null

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✓ Tests complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Tip: Review output above for:" -ForegroundColor Yellow
Write-Host "  ⚡ EVALUATING - Policy checks starting" -ForegroundColor Cyan
Write-Host "  🛑 BLOCKED    - Dangerous commands blocked" -ForegroundColor Red
Write-Host "  ✅ ALLOWED    - Safe commands allowed" -ForegroundColor Green
Write-Host "  📝 AUDIT      - Tool executions logged" -ForegroundColor Blue
Write-Host ""
