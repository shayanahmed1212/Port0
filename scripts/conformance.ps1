# Port0 CLI conformance check against the master spec.
# Save as scripts\conformance.ps1 inside the Port0 repo, then run from anywhere:
#   powershell -ExecutionPolicy Bypass -File D:\Hackathon\Port0\scripts\conformance.ps1
#
# Not covered here (covered by unit tests instead): fail-closed exit code 3
# (needs a secret that slips past the redactor) and the stretch "share" command.

$ErrorActionPreference = "Continue"
$root   = Split-Path $PSScriptRoot -Parent
$cli    = Join-Path $root "dist\cli\index.js"
$golden = Join-Path $root "tests\fixtures\golden-packet.json"
$demo   = Join-Path $env:TEMP "port0-conformance-demo"
$nogit  = Join-Path $env:TEMP "port0-conformance-nogit"
$script:pass = 0
$script:fail = 0

function Check([string]$name, [bool]$ok) {
  if ($ok) { Write-Host "PASS  $name" -ForegroundColor Green; $script:pass++ }
  else     { Write-Host "FAIL  $name" -ForegroundColor Red;   $script:fail++ }
}
function Section([string]$t) { Write-Host ""; Write-Host "== $t ==" -ForegroundColor Cyan }

# ---------------------------------------------------------------- build
Section "Build"
Push-Location $root
pnpm build | Out-Null
Check "pnpm build succeeds" ($LASTEXITCODE -eq 0)
Pop-Location
if (-not (Test-Path $cli)) { Write-Host "CLI not found at $cli" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- demo repo
Section "Setup demo repo"
Remove-Item $demo -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory $demo | Out-Null
Set-Location $demo
git init -q
git config user.email "demo@example.com"
git config user.name "demo"
Set-Content app.js "console.log(1)" -Encoding ascii
git add .
git commit -q -m "init"
Set-Content app.js "console.log(2)" -Encoding ascii
$key = "AKIA" + "IOSFODNN7EXAMPLE"          # built at runtime, never a literal
Add-Content app.js "const k = '$key';"
Set-Content staged.js "export const a = 1" -Encoding ascii
git add staged.js
Set-Content .env "DB_PASSWORD=hunter2" -Encoding ascii
Set-Content test.log "FAIL login test: expected true got false" -Encoding ascii
Write-Host "demo repo ready at $demo"

# ---------------------------------------------------------------- export
Section "export: output, redaction, schema"
$d1 = ((git diff) + (git diff --cached)) -join "`n"
$s1 = (git status --porcelain | Where-Object { $_ -notmatch "port0-packet" }) -join "`n"

node $cli export --format both --intent "Fix login" --test-log test.log
Check "export exits 0" ($LASTEXITCODE -eq 0)
Check "port0-packet.json written" (Test-Path "port0-packet.json")
Check "port0-packet.md written (--format both)" (Test-Path "port0-packet.md")

$json = ""; $md = ""
if (Test-Path "port0-packet.json") { $json = Get-Content "port0-packet.json" -Raw }
if (Test-Path "port0-packet.md")   { $md   = Get-Content "port0-packet.md" -Raw }

Check "AWS key is not in json or md"      (-not $json.Contains($key) -and -not $md.Contains($key))
Check ".env content (hunter2) is not in json or md" (-not $json.Contains("hunter2") -and -not $md.Contains("hunter2"))
Check "redaction marker present in json"  ($json -match "REDACTED:aws-access-key")
Check "test log captured"                 ($json -match "expected true got false")
Check "no CRLF line endings in json"      (-not ($json -match "`r"))
Check "no absolute Windows path in json"  (-not ($json -match '[A-Za-z]:\\\\'))
Check "own output files not captured"     (-not ($json -match "port0-packet"))

$p = $null
try { $p = $json | ConvertFrom-Json } catch { }
Check "packet is valid JSON" ($null -ne $p)
if ($p) {
  Check "schemaVersion is the string 1"        ($p.schemaVersion -eq "1")
  Check "port0Version is semver"               ($p.port0Version -match '^\d+\.\d+\.\d+$')
  Check "contentHash is 64 lowercase hex"      ($p.contentHash -match '^[0-9a-f]{64}$')
  Check "intent stored"                        ($p.intent -eq "Fix login")
  Check "repo.name is folder name only"        ($p.repo.name -eq "port0-conformance-demo")
  Check "repo.headCommit is 40 lowercase hex"  ($p.repo.headCommit -match '^[0-9a-f]{40}$')
  Check "repo.detached is false"               ($p.repo.detached -eq $false)
  Check "repo.recentCommits is an array"       ($p.repo.recentCommits -is [array])
  Check "budget.maxBytes defaults to 204800"   ($p.budget.maxBytes -eq 204800)
  Check "budget.usedBytes is a number"         ($p.budget.usedBytes -is [int] -or $p.budget.usedBytes -is [long])
  Check "budget.truncatedSections is an array" ($p.budget.truncatedSections -is [array])
  Check "diffs.staged has text and truncated"  ($null -ne $p.diffs.staged.text -and $null -ne $p.diffs.staged.truncated)
  Check "diffs.unstaged has text and truncated" ($null -ne $p.diffs.unstaged.text -and $null -ne $p.diffs.unstaged.truncated)
  Check "testLog is an object with source"     ($null -ne $p.testLog -and $p.testLog.source -eq "file")
  $names = @($p.PSObject.Properties.Name)
  Check "top-level keys sorted alphabetically" (($names -join ",") -eq (($names | Sort-Object) -join ","))
  Check "status lists app.js"                  ($null -ne ($p.status | Where-Object { $_.path -eq "app.js" }))
  Check "status lists staged.js"               ($null -ne ($p.status | Where-Object { $_.path -eq "staged.js" }))
  $envEntry = $p.status | Where-Object { $_.path -eq ".env" }
  Check ".env listed by name with contentOmitted=denylist" ($null -ne $envEntry -and $envEntry.contentOmitted -eq "denylist")
  Check ".env is in redaction.deniedPaths"     ($p.redaction.deniedPaths -contains ".env")
  Check "redaction counts aws-access-key >= 1" ($p.redaction.counts.'aws-access-key' -ge 1)
}

Check "git working tree unchanged by export (read-only)" (
  ((((git diff) + (git diff --cached)) -join "`n") -eq $d1) -and
  (((git status --porcelain | Where-Object { $_ -notmatch "port0-packet" }) -join "`n") -eq $s1)
)

# ---------------------------------------------------------------- determinism
Section "determinism"
$h1 = (Get-FileHash "port0-packet.json").Hash
node $cli export --format both --intent "Fix login" --test-log test.log
$h2 = (Get-FileHash "port0-packet.json").Hash
Check "two runs give byte-identical json" ($h1 -eq $h2)

# ---------------------------------------------------------------- verify
Section "verify"
node $cli verify port0-packet.json | Out-Null
Check "verify clean packet exits 0" ($LASTEXITCODE -eq 0)
$tampered = Join-Path $env:TEMP "port0-tampered.json"
(Get-Content "port0-packet.json" -Raw).Replace("Fix login", "Fix logix") | Set-Content $tampered -NoNewline
node $cli verify $tampered 2>$null | Out-Null
Check "verify tampered packet exits 5" ($LASTEXITCODE -eq 5)

# ---------------------------------------------------------------- render / stdout
Section "render and --stdout"
$r = node $cli render port0-packet.json | Out-String
Check "render exits 0" ($LASTEXITCODE -eq 0)
Check "render output contains the intent" ($r -match "Fix login")
Check "render output has no raw secret" (-not $r.Contains($key))
$o = node $cli export --format md --stdout --intent "Fix login" | Out-String
Check "--stdout prints the Markdown prompt" ($o -match "Fix login")
Check "--stdout output has no raw secret" (-not $o.Contains($key))

# ---------------------------------------------------------------- budget
Section "size budget"
1..4000 | ForEach-Object { "line $_ padding padding padding padding padding" } | Set-Content big.txt -Encoding ascii
git add big.txt
node $cli export --max-bytes 20000
Check "export exits 0 with a 20000 byte cap" ($LASTEXITCODE -eq 0)
$size = (Get-Item "port0-packet.json").Length
Check "packet is within the cap ($size bytes)" ($size -le 20000)
Check "truncation marker present" ((Get-Content "port0-packet.json" -Raw) -match "TRUNCATED")
git reset -q big.txt
Remove-Item big.txt

# ---------------------------------------------------------------- exit codes and flags
Section "exit codes and flags"
node $cli --version | Out-Null
Check "--version exits 0" ($LASTEXITCODE -eq 0)
node $cli --help | Out-Null
Check "--help exits 0" ($LASTEXITCODE -eq 0)
node $cli export --max-bytes 5 2>$null | Out-Null
Check "--max-bytes below minimum exits 1" ($LASTEXITCODE -eq 1)
node $cli export --out "..\escape.json" 2>$null | Out-Null
Check "--out outside the root exits 1" ($LASTEXITCODE -eq 1)
Remove-Item (Join-Path $env:TEMP "escape.json") -ErrorAction SilentlyContinue
node $cli export --not-a-flag 2>$null | Out-Null
Check "unknown flag exits 1" ($LASTEXITCODE -eq 1)
New-Item -ItemType Directory $nogit -Force | Out-Null
Set-Location $nogit
node $cli export 2>$null | Out-Null
Check "not a git repo exits 2" ($LASTEXITCODE -eq 2)
Set-Location $demo

# ---------------------------------------------------------------- hostile config
Section "hostile git config must not execute"
$evil = Join-Path $demo "evil.cmd"
Set-Content $evil "@echo pwned> `"%~dp0marker.txt`"" -Encoding ascii
git config diff.external ($evil.Replace("\", "/"))
git diff | Out-Null
$trap = Test-Path "marker.txt"
Remove-Item marker.txt -ErrorAction SilentlyContinue
if (-not $trap) {
  Write-Host "SKIP  trap did not fire on a plain git diff, so this test is not meaningful on this machine" -ForegroundColor Yellow
} else {
  node $cli export | Out-Null
  Check "external diff driver is never executed" (-not (Test-Path "marker.txt"))
}

# ---------------------------------------------------------------- golden fixture
Section "golden fixture"
Check "tests\fixtures\golden-packet.json exists" (Test-Path $golden)
if (Test-Path $golden) {
  node $cli verify $golden | Out-Null
  Check "verify passes on the golden packet" ($LASTEXITCODE -eq 0)
}

# ---------------------------------------------------------------- summary
Set-Location $root
Write-Host ""
$color = "Red"; if ($script:fail -eq 0) { $color = "Green" }
Write-Host "RESULT: $($script:pass) passed, $($script:fail) failed" -ForegroundColor $color
if ($script:fail -gt 0) { exit 1 }