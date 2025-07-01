# Chanspaw Platform Server Starter
# PowerShell script to start both backend and frontend

Write-Host "🚀 Starting Chanspaw Platform..." -ForegroundColor Green
Write-Host ""

# Function to start a process
function Start-ServerProcess {
    param(
        [string]$Name,
        [string]$Command,
        [string]$Arguments,
        [string]$WorkingDirectory
    )
    
    Write-Host "📦 Starting $Name..." -ForegroundColor Yellow
    
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = $Command
    $processInfo.Arguments = $Arguments
    $processInfo.WorkingDirectory = $WorkingDirectory
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    $process.Start() | Out-Null
    
    return $process
}

# Start backend server
Write-Host "🔧 Starting Backend Server..." -ForegroundColor Cyan
$backendProcess = Start-ServerProcess -Name "Backend" -Command "node" -Arguments "server.js" -WorkingDirectory ".\backend"

# Wait for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start frontend server
Write-Host "📱 Starting Frontend Server..." -ForegroundColor Cyan
$frontendProcess = Start-ServerProcess -Name "Frontend" -Command "npm" -Arguments "run dev" -WorkingDirectory "."

Write-Host ""
Write-Host "✅ Both servers are starting!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:5174/" -ForegroundColor White
Write-Host "🔧 Backend: http://localhost:3001/" -ForegroundColor White
Write-Host ""
Write-Host "💡 Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Handle cleanup on exit
$null = Register-EngineEvent PowerShell.Exiting -Action {
    Write-Host "🛑 Shutting down servers..." -ForegroundColor Red
    if ($backendProcess -and !$backendProcess.HasExited) {
        $backendProcess.Kill()
    }
    if ($frontendProcess -and !$frontendProcess.HasExited) {
        $frontendProcess.Kill()
    }
}

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if processes are still running
        if ($backendProcess.HasExited) {
            Write-Host "❌ Backend server stopped unexpectedly" -ForegroundColor Red
        }
        if ($frontendProcess.HasExited) {
            Write-Host "❌ Frontend server stopped unexpectedly" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "🛑 Shutting down servers..." -ForegroundColor Red
    if ($backendProcess -and !$backendProcess.HasExited) {
        $backendProcess.Kill()
    }
    if ($frontendProcess -and !$frontendProcess.HasExited) {
        $frontendProcess.Kill()
    }
} 