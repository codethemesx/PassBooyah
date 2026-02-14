# scripts/deploy.ps1
$server = "axicld.duckdns.org"
$port = "2022"
$user = "eduardo.47902b5e"
$localZip = "deploy.zip"

Write-Host "Compactando arquivos..."
# Removed drizzle.config.ts as it is not in the root
$files = @("src", "public", "prisma", "scripts", "package.json", "tsconfig.json", "next.config.ts", ".env.local", "postcss.config.mjs")

# Check if file exists before adding to list to avoid errors
$existingFiles = @()
foreach ($file in $files) {
    if (Test-Path $file) {
        $existingFiles += $file
    }
    else {
        Write-Host "Aviso: $file não encontrado, ignorando."
    }
}

if (Test-Path $localZip) { Remove-Item $localZip -Force }

Compress-Archive -Path $existingFiles -DestinationPath $localZip -Force
Write-Host "Arquivo $localZip criado com sucesso."
