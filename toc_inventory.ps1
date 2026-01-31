<#
TOC + Supabase Inventory Script (Windows PowerShell)
- Captures: folder tree, Supabase usage in code (supabase.from / rpc / auth), package.json, and (optionally) Supabase schema + generated TS types.
- Safe: does NOT modify your app code or Supabase database. Only writes files into .\toc_inventory\

How to run (PowerShell):
  cd C:\Users\14062\top-of-the-capital-v2
  powershell -ExecutionPolicy Bypass -File .\toc_inventory.ps1

Optional (for Supabase schema/types):
  - Install Supabase CLI: https://supabase.com/docs/guides/cli
  - Make sure you’re logged in: supabase login
  - Link the project once: supabase link
#>

param(
  [string]$ProjectRoot = (Get-Location).Path,
  [int]$MaxTreeLines = 250,
  [int]$MaxSearchHits = 200
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section($msg) {
  Write-Host ""
  Write-Host "=== $msg ===" -ForegroundColor Cyan
}

function Safe-WriteFile([string]$Path, [string]$Content) {
  $dir = Split-Path -Parent $Path
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  Set-Content -Path $Path -Value $Content -Encoding UTF8
}

Write-Section "TOC Inventory"
Write-Host "ProjectRoot: $ProjectRoot"

if (!(Test-Path $ProjectRoot)) {
  throw "Project root not found: $ProjectRoot"
}

Set-Location $ProjectRoot

$outDir = Join-Path $ProjectRoot "toc_inventory"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$metaPath = Join-Path $outDir "meta.txt"
Safe-WriteFile $metaPath ("RunTimeUTC: {0}`nMachine: {1}`nUser: {2}`nProjectRoot: {3}`n" -f `
  (Get-Date).ToUniversalTime().ToString("s"), $env:COMPUTERNAME, $env:USERNAME, $ProjectRoot)

# 1) Basic repo facts
Write-Section "Capture package.json (if present)"
$pkg = Join-Path $ProjectRoot "package.json"
if (Test-Path $pkg) {
  Copy-Item $pkg (Join-Path $outDir "package.json") -Force
  Write-Host "Saved: toc_inventory\package.json"
} else {
  Write-Host "No package.json found at repo root."
}

# 2) Folder tree (limited lines so it’s pasteable)
Write-Section "Capture folder tree"
$treePath = Join-Path $outDir "folder-tree.txt"
try {
  $treeRaw = cmd /c "tree /A /F" 2>&1
  $treeLines = $treeRaw | Select-Object -First $MaxTreeLines
  Safe-WriteFile $treePath ($treeLines -join "`n")
  Write-Host "Saved: toc_inventory\folder-tree.txt (first $MaxTreeLines lines)"
} catch {
  Write-Host "tree command failed: $($_.Exception.Message)"
}

# 3) Scan codebase for Supabase usage
Write-Section "Scan code for Supabase usage (from/rpc/auth)"
$searchPath = Join-Path $outDir "supabase-usage.txt"

$patterns = @(
  "supabase\.from\(",
  "\.from\(""",
  "\.from\('",
  "supabase\.rpc\(",
  "\.rpc\(",
  "supabase\.auth\.",
  "createClient\(",
  "SUPABASE_URL",
  "SUPABASE_ANON",
  "SUPABASE_KEY",
  "anonKey",
  "service_role"
)

$files = Get-ChildItem -Path $ProjectRoot -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\.git\\" -and
    $_.FullName -notmatch "\\toc_inventory\\" -and
    ($_.Extension -in @(".ts",".tsx",".js",".jsx",".json",".md"))
  }

$hits = New-Object System.Collections.Generic.List[string]
foreach ($f in $files) {
  try {
    $content = Get-Content -Path $f.FullName -Raw -ErrorAction SilentlyContinue
    if ([string]::IsNullOrWhiteSpace($content)) { continue }

    foreach ($pat in $patterns) {
      if ($content -match $pat) {
        # Extract matching lines (lightweight)
        $lineHits = Select-String -Path $f.FullName -Pattern $pat -AllMatches -ErrorAction SilentlyContinue |
          Select-Object -First 50 |
          ForEach-Object { "{0}:{1} {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim() }

        foreach ($lh in $lineHits) { $hits.Add($lh) }
      }
    }
  } catch {
    # ignore per-file errors
  }
}

$uniqueHits = $hits | Select-Object -Unique | Select-Object -First $MaxSearchHits
Safe-WriteFile $searchPath (($uniqueHits) -join "`n")
Write-Host "Saved: toc_inventory\supabase-usage.txt (up to $MaxSearchHits hits)"

# 4) Optional: Supabase CLI dump + types
Write-Section "Optional: Supabase CLI schema + types (read-only)"
$supabaseExe = Get-Command supabase -ErrorAction SilentlyContinue
if ($null -eq $supabaseExe) {
  Write-Host "Supabase CLI not found. Skipping schema dump + types."
  Write-Host "If you want it: install + run 'supabase login' then 'supabase link' and re-run this script."
} else {
  Write-Host "Supabase CLI found at: $($supabaseExe.Source)"

  # Check if project is linked (look for supabase/config.toml)
  $cfg = Join-Path $ProjectRoot "supabase\config.toml"
  if (!(Test-Path $cfg)) {
    Write-Host "No supabase\config.toml found. Your repo may not be linked here."
    Write-Host "Run: supabase link   (interactive)   then re-run this script."
  } else {
    Write-Host "Found: supabase\config.toml (attempting dump + types)..."

    $schemaOut = Join-Path $outDir "supabase_schema_public.sql"
    $typesOut  = Join-Path $outDir "supabase.types.ts"

    try {
      # Dump public schema only (read-only)
      # NOTE: Requires project linked + authenticated
      supabase db dump --schema public | Out-File -FilePath $schemaOut -Encoding utf8
      Write-Host "Saved: toc_inventory\supabase_schema_public.sql"
    } catch {
      Write-Host "Schema dump failed (this is usually auth/linking). Error:"
      Write-Host $_.Exception.Message
    }

    try {
      # Generate TS types (read-only)
      supabase gen types typescript --linked | Out-File -FilePath $typesOut -Encoding utf8
      Write-Host "Saved: toc_inventory\supabase.types.ts"
    } catch {
      Write-Host "Types generation failed (this is usually auth/linking). Error:"
      Write-Host $_.Exception.Message
    }
  }
}

Write-Section "Done"
Write-Host "Open this folder and paste contents as needed:"
Write-Host "  $outDir"
Write-Host ""
Write-Host "Suggested next step:"
Write-Host "  1) Paste toc_inventory\supabase-usage.txt"
Write-Host "  2) Paste the first ~200 lines of toc_inventory\folder-tree.txt"
Write-Host "  3) If generated, also paste supabase_schema_public.sql lines mentioning ladder_view + the ladder_view section of supabase.types.ts"
