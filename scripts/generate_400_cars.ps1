# ============================================================
# Gera 400 INSERTs na tabela "carros" com imagem real
# Imagem base64 lida de: scripts\imagen64.yaml
# Saida: scripts\seed_400_cars.sql
# ============================================================

$eventoId   = '2f2afa23-1a9f-4c14-b74b-d3ea747ff6a6'
$outputFile = Join-Path $PSScriptRoot 'seed_400_cars.sql'
$imagemFile = Join-Path $PSScriptRoot 'imagen64.yaml'

# Ler a imagem base64 do arquivo
Write-Host "Lendo imagem base64 de: $imagemFile"
$urlFoto = (Get-Content -Path $imagemFile -Raw -Encoding UTF8).Trim()
Write-Host "Tamanho da imagem: $([Math]::Round($urlFoto.Length / 1KB, 1)) KB"

# Modelos de carros
$modelos = @(
    'VW Golf GTI','Honda Civic Type R','Subaru Impreza WRX STI','Mitsubishi Lancer Evo',
    'Toyota Supra','Nissan Skyline GT-R','Ford Mustang Shelby GT500','Chevrolet Camaro ZL1',
    'BMW M3 Competition','Mercedes-AMG C63','Audi RS3','Porsche 911 GT3',
    'Lamborghini Huracan','Ferrari 488 GTB','McLaren 720S','Dodge Challenger Hellcat',
    'Mazda RX-7','Honda S2000','Toyota GT86','Fiat Punto Abarth',
    'VW Gol GTI','Chevrolet Opala SS','Ford Del Rey','Peugeot 206 GTI',
    'Renault Megane RS','SEAT Leon Cupra','Honda Integra Type R','Hyundai i30 N',
    'Kia Stinger GT','Alfa Romeo Giulia QV'
)

# Nomes de donos
$donos = @(
    'Pedro Machado','Lucas Ferreira','Rafael Oliveira','Gustavo Santos','Felipe Alves',
    'Thiago Costa','Bruno Lima','Mateus Souza','Diego Rocha','Vinicius Martins',
    'Carlos Eduardo','Andre Pereira','Leonardo Nunes','Gabriel Ribeiro','Henrique Carvalho',
    'Rodrigo Fernandes','Leandro Gomes','Fernando Silva','Marcelo Castro','Julio Mendes'
)

# Equipes
$equipes = @(
    'Street Kings','Low Life BR','JDM Garage','Turbo Nation','Stance Society',
    'Classic Crew','Drift Union','Import Mafia','Muscle Bros','Euro Cartel',
    $null, $null, $null
)

# Alturas possiveis (mm)
$alturas = @(0, 0, 0, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 150, 180, 200, 220)

# KMs possiveis
$kms = @(0, 0, 0, 1000, 5000, 10000, 25000, 50000, 80000, 120000, 200000)

# Anos
$anos = 1970..2025

function New-SqlGuid { [System.Guid]::NewGuid().ToString() }

function Quote-SQL($val) {
    if ($null -eq $val) { return 'NULL' }
    $escaped = $val -replace "'", "''"
    return "'$escaped'"
}

Write-Host "Gerando 400 INSERTs..."

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine('-- Seed: 400 carros para stress-test')
[void]$sb.AppendLine('-- Evento: ' + $eventoId)
[void]$sb.AppendLine('-- Gerado em: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
[void]$sb.AppendLine('')
[void]$sb.AppendLine('BEGIN;')
[void]$sb.AppendLine('')

$urlFotoEscapada = Quote-SQL $urlFoto

for ($i = 1; $i -le 400; $i++) {
    $id       = New-SqlGuid
    $numero   = '#{0:D3}' -f $i
    $modelo   = $modelos[($i - 1) % $modelos.Count]
    $ano      = $anos[($i * 7) % $anos.Count]
    $altura   = $alturas[($i * 3) % $alturas.Count]
    $dono     = $donos[($i - 1) % $donos.Count]
    $telefone = '+55119' + ('{0:D8}' -f (($i * 31337) % 100000000))
    $equipe   = $equipes[($i * 5) % $equipes.Count]
    $km       = $kms[($i * 2) % $kms.Count]
    $criado   = (Get-Date).AddMinutes(-$i).ToString('yyyy-MM-dd HH:mm:sszzz')

    $line = "INSERT INTO ""public"".""carros"" " +
            '("id", "evento_id", "numero_inscricao", "modelo", "ano", "altura_mm", "url_foto", "nome_dono", "telefone_dono", "equipe", "km_rodado", "criado_em") VALUES (' +
            (Quote-SQL $id)       + ', ' +
            (Quote-SQL $eventoId) + ', ' +
            (Quote-SQL $numero)   + ', ' +
            (Quote-SQL $modelo)   + ', ' +
            $ano                  + ', ' +
            $altura               + ', ' +
            $urlFotoEscapada      + ', ' +
            (Quote-SQL $dono)     + ', ' +
            (Quote-SQL $telefone) + ', ' +
            (Quote-SQL $equipe)   + ', ' +
            $km                   + ', ' +
            (Quote-SQL $criado)   + ');'

    [void]$sb.AppendLine($line)

    if ($i % 50 -eq 0) { Write-Host "   $i / 400 processados..." }
}

[void]$sb.AppendLine('')
[void]$sb.AppendLine('COMMIT;')

Write-Host "Salvando arquivo SQL..."
$sb.ToString() | Set-Content -Path $outputFile -Encoding UTF8

$sizeMB = [Math]::Round((Get-Item $outputFile).Length / 1MB, 1)
Write-Host ""
Write-Host "Arquivo gerado com sucesso!"
Write-Host "Arquivo  : $outputFile"
Write-Host "Registros: 400 INSERTs"
Write-Host "Tamanho  : $sizeMB MB"
