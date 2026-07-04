@echo off
REM Twenty deploy - builds, fixes Windows paths, uploads via API

echo === Deploy ===

echo [1/3] Building...
call yarn build
if errorlevel 1 (echo FAILED & exit /b 1)

echo [2/3] Fixing manifest...
python scripts\fix-manifest.py
if errorlevel 1 (echo FAILED & exit /b 1)

cd .twenty\output
del /q *.tgz 2>nul
call npm pack
if errorlevel 1 (echo FAILED & exit /b 1)
cd ..\..

echo [3/3] Uploading and installing...

REM Read .env
for /f "tokens=1,* delims==" %%a in ('findstr "TWENTY_API_URL" .env') do set API_URL=%%b
for /f "tokens=1,* delims==" %%a in ('findstr "TWENTY_API_KEY" .env') do set API_KEY=%%b
for /f %%i in ('dir /b .twenty\output\*.tgz') do set TARBALL=.twenty\output\%%i

REM Upload tarball
curl -s -X POST "%API_URL%/metadata" -H "Authorization: Bearer %API_KEY%" -F "operations={\"query\":\"mutation UploadAppTarball($file: Upload!, $universalIdentifier: String) { uploadAppTarball(file: $file, universalIdentifier: $universalIdentifier) { id name } }\",\"variables\":{\"file\":null,\"universalIdentifier\":\"6eaaf6ac-81f8-5c40-8f27-0d0c70b17500\"}}" -F "map={\"0\":[\"variables.file\"]}" -F "0=@%TARBALL%;type=application/gzip"
echo.

REM Install
call yarn twenty app:install -r opc .
if errorlevel 1 (echo FAILED & exit /b 1)

echo === Done ===
