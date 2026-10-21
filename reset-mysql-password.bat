@echo off
setlocal EnableDelayedExpansion
title MySQL Root Password Reset - Red Nexus
color 0B

:: Check for Administrative Privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ========================================================
    echo   Administrator privileges required.
    echo   Prompting for permission...
    echo ========================================================
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo ================================================================
echo             RED NEXUS - MYSQL ROOT PASSWORD RESET
echo ================================================================
echo.
echo This tool will safely reset your MySQL root password.
echo.

set /p USER_INPUT="Enter new password (or press Enter to use 'Root@1234'): "
if "%USER_INPUT%"=="" (
    set NEW_PWD=Root@1234
) else (
    set NEW_PWD=%USER_INPUT%
)

echo.
echo [*] Chosen Password: !NEW_PWD!
echo.

echo [*] Stopping MySQL80 service...
net stop MySQL80 >nul 2>&1

echo [*] Creating temporary initialization script...
set INIT_FILE=%TEMP%\mysql_pw_reset.sql
set INIT_FILE_SLASH=%INIT_FILE:\=/%

(
echo ALTER USER 'root'@'localhost' IDENTIFIED BY '!NEW_PWD!';
echo FLUSH PRIVILEGES;
) > "%INIT_FILE%"

echo [*] Launching MySQL to apply the new password...
start "" /b "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.0\my.ini" --init-file="%INIT_FILE_SLASH%"

echo [*] Waiting 6 seconds for MySQL to update credentials...
timeout /t 6 /nobreak >nul

echo [*] Terminating temporary MySQL background instance...
taskkill /F /IM mysqld.exe >nul 2>&1

if exist "%INIT_FILE%" del /f /q "%INIT_FILE%" >nul 2>&1

echo [*] Starting MySQL80 service...
net start MySQL80

echo [*] Updating d:\rednexus\.env with new password...
powershell -NoProfile -Command "(Get-Content 'd:\rednexus\.env') -replace '^DB_PASSWORD=.*', 'DB_PASSWORD=!NEW_PWD!' | Set-Content 'd:\rednexus\.env'"

echo.
echo ================================================================
echo  SUCCESS! Your MySQL root password is now set to: !NEW_PWD!
echo  Your .env file has been automatically updated.
echo ================================================================
echo.
echo You can now close this window and run 'npm start' in your project.
echo.
pause
