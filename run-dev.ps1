Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "    Authentic Lanka Exports ERP Launcher" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[1/2] Starting Backend Server..." -ForegroundColor Yellow
Start-Process wt -ArgumentList "-w 0 nt -d `"$scriptDir\backend`" powershell -NoExit -Command `"npm run dev`"" -ErrorAction SilentlyContinue `
    -ErrorVariable wtErr

if ($wtErr) {
    Start-Process cmd -ArgumentList "/k cd `"$scriptDir\backend`" && npm run dev"
}

Start-Sleep -Seconds 3

Write-Host "[2/2] Starting Frontend Server..." -ForegroundColor Yellow
Start-Process wt -ArgumentList "-w 0 nt -d `"$scriptDir\frontend`" powershell -NoExit -Command `"npm run dev`"" -ErrorAction SilentlyContinue `
    -ErrorVariable wtErr2

if ($wtErr2) {
    Start-Process cmd -ArgumentList "/k cd `"$scriptDir\frontend`" && npm run dev"
}

Write-Host "`nServers launched!" -ForegroundColor Green
Write-Host "Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173 (or 5174)" -ForegroundColor White
