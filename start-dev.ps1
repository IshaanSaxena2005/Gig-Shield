<#
PowerShell helper script to start Gig-Shield backend + frontend simultaneously.

Usage:
  ./start-dev.ps1

Prerequisites:
- Node.js + npm must be installed and in PATH
- MySQL Server must be running and database 'gig_shield' created

This script will:
1) Install dependencies (if not already installed)
2) Start the backend server (Express)
3) Start the frontend dev server (Vite)

Both servers will run in separate PowerShell jobs so you can stop them using Ctrl+C.
#>

function Ensure-NodeInstalled {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js is not installed or not in PATH. Please install it from https://nodejs.org/"
        exit 1
    }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Error "npm is not installed or not in PATH. Please ensure Node.js installation includes npm."
        exit 1
    }
}

function Start-Project {
    param(
        [string]$Path,
        [string]$InstallCmd = 'npm install',
        [string]$StartCmd = 'npm run dev'
    )

    Write-Host "\n==> Preparing $Path..." -ForegroundColor Cyan
    Push-Location $Path

    Write-Host "Installing dependencies in $Path..." -ForegroundColor Yellow
    iex $InstallCmd

    Write-Host "Starting dev server in $Path..." -ForegroundColor Green
    Start-Job -Name "$(Split-Path $Path -Leaf)" -ScriptBlock {
        param($cmd)
        Invoke-Expression $cmd
    } -ArgumentList $StartCmd | Out-Null

    Pop-Location
}

Ensure-NodeInstalled

# Start backend and frontend in parallel
Start-Project -Path "$(Join-Path $PSScriptRoot 'backend')"
Start-Project -Path "$(Join-Path $PSScriptRoot 'frontend')"

Write-Host "\nBoth backend and frontend have been started in background jobs." -ForegroundColor Green
Write-Host "Use 'Get-Job' to view jobs and 'Receive-Job -Name <job> -Keep' to view output." -ForegroundColor Gray
Write-Host "When finished, stop jobs by running: Stop-Job -Name backend,frontend" -ForegroundColor Gray
