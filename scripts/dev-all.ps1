try {
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
  [Console]::InputEncoding  = New-Object System.Text.UTF8Encoding $false
} catch { }

param(
  [switch]$Studio
)

$ErrorActionPreference = "Stop"

function Kill-Port($port) {
  try {
    $pids = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique
    if ($pids) {
      Write-Host "포트 $port 점유 프로세스 종료: $($pids -join ', ')"
      foreach ($pid in $pids) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
      }
    } else {
      Write-Host "포트 $port 비어 있음"
    }
  } catch {
    Write-Host "포트 $port 정리 중 경고: $($_.Exception.Message)"
  }
}

Write-Host "`n포트 정리 (3000/5173)"
Kill-Port 3000
Kill-Port 5173

Write-Host "`nPostgres 컨테이너 기동"
docker compose up -d db | Out-Null

Write-Host "DB 상태 확인 중..."
$cid = (docker compose ps -q db).Trim()
if (-not $cid) { throw "DB 컨테이너 ID를 찾을 수 없습니다. (compose 서비스명: db)" }

$maxWait = 60
$elapsed = 0
$status = ""
while ($elapsed -lt $maxWait) {
  try {
    $status = (docker inspect -f "{{.State.Health.Status}}" $cid 2>$null)
  } catch {
    $status = ""
  }
  if ($status -eq "healthy") { break }
  Start-Sleep -Seconds 1
  $elapsed++
}
if ($status -ne "healthy") {
  throw "DB 컨테이너가 healthy 상태가 아닙니다. (현재: $status, 경과: ${elapsed}s)"
}
Write-Host "DB healthy"

Write-Host "`nPrisma 스키마 동기화 (db push)"
pnpm run db:push

if ($Studio) {
  Write-Host "`nPrisma Studio 실행 (새 창)"
  $root = (Resolve-Path "$PSScriptRoot\..").Path

  $hasPwsh = $false
  try { Get-Command pwsh -ErrorAction Stop | Out-Null; $hasPwsh = $true } catch { }
  if ($hasPwsh) { $psExe = "pwsh" } else { $psExe = "powershell" }

  $port = 5555
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { $port = 5556 }

  Start-Process $psExe `
    -WorkingDirectory $root `
    -ArgumentList "-NoExit","-Command","pnpm prisma studio --port $port"
}

Write-Host "`n서버/웹 동시 실행 (turbo dev --parallel)"
pnpm run dev
