# The Great Filter Services Health Check (PowerShell)

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "The Great Filter Services Health Check" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker is running
Write-Host "1. Checking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is NOT running - Please start Docker Desktop" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "✗ Not in server directory. Please cd to server/" -ForegroundColor Red
    exit 1
}

# Check services status
Write-Host "2. Checking Docker Compose services..." -ForegroundColor Yellow
docker-compose ps
Write-Host ""

# Check specific ports
Write-Host "3. Checking ports..." -ForegroundColor Yellow

$ports = @{
    "6379" = "Redis"
    "5434" = "PostgreSQL"
    "8002" = "Orchestrator"
    "8000" = "Backend"
}

foreach ($port in $ports.Keys) {
    $service = $ports[$port]
    $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -InformationLevel Quiet
    
    Write-Host "   Port $port ($service): " -NoNewline
    if ($connection) {
        Write-Host "✓ Open" -ForegroundColor Green
    } else {
        Write-Host "✗ Closed" -ForegroundColor Red
        if ($port -eq "8002") {
            Write-Host "      ^ ORCHESTRATOR NOT RUNNING - This causes 502 errors!" -ForegroundColor Red
        }
    }
}
Write-Host ""

# Check orchestrator health
Write-Host "4. Checking Orchestrator health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8002/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Orchestrator is healthy" -ForegroundColor Green
        $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    }
} catch {
    Write-Host "✗ Orchestrator health check failed" -ForegroundColor Red
    Write-Host "   This is why you're getting 502 errors!" -ForegroundColor Red
    $orchestratorHealthy = $false
}
Write-Host ""

# Check backend health
Write-Host "5. Checking Backend health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/execution-stats/" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Backend is responding" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠ Backend returned HTTP $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    $backendHealthy = $false
}
Write-Host ""

# Summary
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

if ($orchestratorHealthy -and $backendHealthy) {
    Write-Host "✓ All services are running correctly!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now:"
    Write-Host "  - Start frontend: cd ..\client; npm run dev"
    Write-Host "  - Access app: http://localhost:8080"
    Write-Host ""
} else {
    Write-Host "✗ Some services are not working" -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix:"
    Write-Host "  1. Stop services: docker-compose down"
    Write-Host "  2. Start services: docker-compose up --build"
    Write-Host "  3. Wait 5-10 minutes for build"
    Write-Host "  4. Run this script again"
    Write-Host ""
}

