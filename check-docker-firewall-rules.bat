@echo off
REM Lists every Windows Firewall rule that mentions Docker/vpnkit/com.docker,
REM including its profile scope (Domain/Private/Public) and action
REM (Allow/Block). We're checking for a rule that's scoped to Private/Domain
REM only, since our WiFi is on the "Public" network profile right now (that's
REM what Apple Personal Hotspot connections get categorized as by default) -
REM if Docker's own auto-created rule doesn't cover Public, a genuinely
REM external device (like your phone) could get silently dropped even though
REM our manual port-8080 rule allows it, because the docker-proxy PROCESS
REM itself might not be reachable on this profile.
REM
REM Run as Administrator.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This script must be run as Administrator.
    pause
    exit /b 1
)

echo === All firewall rules with "docker" in the name ===
powershell -Command "Get-NetFirewallRule | Where-Object { $_.DisplayName -like '*docker*' -or $_.DisplayName -like '*vpnkit*' -or $_.DisplayName -like '*com.docker*' } | Select-Object DisplayName, Direction, Action, Enabled, Profile | Format-Table -AutoSize"

echo.
echo === Current network profile for Wi-Fi (confirming Public/Private) ===
powershell -Command "Get-NetConnectionProfile | Select-Object InterfaceAlias, NetworkCategory"

echo.
echo === Any explicit BLOCK rules that are enabled, for TCP, any profile ===
powershell -Command "Get-NetFirewallRule -Action Block -Enabled True | Where-Object { $_.Direction -eq 'Inbound' } | Get-NetFirewallPortFilter | Where-Object { $_.LocalPort -eq 8080 -or $_.LocalPort -eq 'Any' } | Format-Table -AutoSize"

pause
