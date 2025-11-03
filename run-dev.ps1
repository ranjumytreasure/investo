# Run both client and server in separate windows
Write-Host "Starting server in new window..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\server'; npm run dev"

Start-Sleep -Seconds 2

Write-Host "Starting client in new window..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\client'; npm run dev"

Write-Host ""
Write-Host "Both services are starting!" -ForegroundColor Cyan
Write-Host "Server: http://localhost:4000" -ForegroundColor Yellow
Write-Host "Client: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Two new PowerShell windows will open - one for server, one for client." -ForegroundColor Gray
