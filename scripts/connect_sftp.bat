@echo off
echo Conectando a VPS via SFTP...
echo Use comandos como 'put arquivo_local' para enviar ou 'get arquivo_remoto' para baixar.
sftp -P 2022 eduardo.47902b5e@axicld.duckdns.org
pause
