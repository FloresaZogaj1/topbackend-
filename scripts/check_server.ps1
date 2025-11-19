# scripts/check_server.ps1
Write-Output "== netstat :4000 =="
netstat -ano | findstr ":4000" || Write-Output "no-listener"

Write-Output "\n== node processes =="
tasklist /FI "IMAGENAME eq node.exe" /FO LIST

Write-Output "\n== healthz check (127.0.0.1) =="
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4000/healthz' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
  Write-Output "HTTP: $($r.StatusCode)"
  Write-Output $r.Content
} catch {
  Write-Output "health-check-failed: $($_.Exception.Message)"
}

Write-Output "\n== healthz check (localhost) =="
try {
  $r = Invoke-WebRequest -Uri 'http://localhost:4000/healthz' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
  Write-Output "HTTP: $($r.StatusCode)"
  Write-Output $r.Content
} catch {
  Write-Output "health-check-failed: $($_.Exception.Message)"
}
