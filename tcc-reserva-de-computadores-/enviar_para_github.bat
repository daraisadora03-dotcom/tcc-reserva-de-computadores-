@echo off
title SGE - Enviar para o GitHub
echo ==========================================
echo   SCRIPT DE AUTOMACAO - REPOSITORIO TCC
echo ==========================================
echo.

set /p msg="Digite a mensagem do seu commit: "

:: Verifica se a pasta .git existe, se nao, inicializa
if not exist .git (
    echo [INFO] Inicializando o Git...
    git init
    set /p url="Cole a URL do seu repositorio GitHub: "
    git remote add origin %url%
)

:: Verifica se o remote 'origin' existe (caso a pasta .git ja existisse mas sem o link)
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Link do GitHub nao encontrado.
    set /p url="Cole a URL do seu repositorio GitHub: "
    git remote add origin %url%
)

echo [INFO] Sincronizando com o GitHub (Pull)...
:: Tenta baixar alteracoes do GitHub antes de enviar
git pull origin main --rebase >nul 2>&1

echo [INFO] Corrigindo pastas aninhadas e limpando cache...
for /d %%D in (*) do (
    if /i "%%D" neq ".git" (
        if exist "%%D\.git" (
            attrib -h -r -s "%%D\.git" /s /d >nul 2>&1
            rd /s /q "%%D\.git" >nul 2>&1
        )
    )
)
git rm -r --cached . --quiet >nul 2>&1

echo [INFO] Adicionando arquivos...
git add .
if %errorlevel% neq 0 (
    echo [ERRO] Falha persistente ao adicionar arquivos.
    pause
    exit /b
)

echo [INFO] Criando commit...
git commit -m "%msg%"

echo [INFO] Enviando alteracoes (Push)...
git branch -M main
git push -u origin main --force

if %errorlevel% equ 0 (
    echo.
    echo [SUCESSO] Arquivos enviados com exito!
) else (
    echo.
    echo [ERRO] Algo deu errado. Verifique se a URL do GitHub esta correta e se voce tem internet.
)
pause >nul  