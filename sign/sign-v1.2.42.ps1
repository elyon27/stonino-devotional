param(
    [string]$Keystore = 'C:\SigningKeys\sto-nino-devotional\StoNinoDevotional-upload.jks',
    [string]$SdkPath = "$env:LOCALAPPDATA\Android\Sdk"
)

$ErrorActionPreference = 'Stop'
$unsigned = Join-Path $PSScriptRoot 'sto-nino-devotional-1.2.42-unsigned.apk'
$signed = Join-Path $PSScriptRoot 'sto-nino-devotional-1.2.42-signed.apk'
$expectedDigest = '02a60added8c0fa21127774ec08ee9c7a2c162156af10f43bc84d1211ade79cf'

if (-not (Test-Path -LiteralPath $unsigned -PathType Leaf)) { throw "Place the unsigned APK here: $unsigned" }
if (-not (Test-Path -LiteralPath $Keystore -PathType Leaf)) { throw "Keystore not found: $Keystore. Pass the correct path with -Keystore." }
if (Test-Path -LiteralPath $signed) { throw "Output already exists: $signed" }

$buildTools = Join-Path $SdkPath 'build-tools'
if (-not (Test-Path -LiteralPath $buildTools -PathType Container)) { throw "Android SDK Build-Tools folder not found: $buildTools" }
$tools = Get-ChildItem -LiteralPath $buildTools -Directory |
    Where-Object {
        (Test-Path -LiteralPath (Join-Path $_.FullName 'zipalign.exe') -PathType Leaf) -and
        (Test-Path -LiteralPath (Join-Path $_.FullName 'apksigner.bat') -PathType Leaf)
    } | Select-Object -First 1
if (-not $tools) { throw "Android SDK Build-Tools with zipalign and apksigner not found under $buildTools." }

$zipalign = Join-Path $tools.FullName 'zipalign.exe'
$apksigner = Join-Path $tools.FullName 'apksigner.bat'
$temp = Join-Path ([IO.Path]::GetTempPath()) ('stonino-' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $temp | Out-Null
try {
    $aligned = Join-Path $temp 'aligned.apk'
    $candidate = Join-Path $temp 'signed.apk'
    & $zipalign -f 4 $unsigned $aligned
    if ($LASTEXITCODE -ne 0) { throw 'APK alignment failed.' }

    & $apksigner sign --ks $Keystore --ks-key-alias stonino-upload --out $candidate $aligned
    if ($LASTEXITCODE -ne 0) { throw 'APK signing failed.' }

    $verification = & $apksigner verify --print-certs $candidate
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
    if (-not ($verification -match "Signer #1 certificate SHA-256 digest: $expectedDigest\s*$")) {
        throw 'The signing certificate does not match the existing direct-download release.'
    }

    Move-Item -LiteralPath $candidate -Destination $signed
    Write-Output "Verified signed APK: $signed"
} finally {
    Remove-Item -LiteralPath $temp -Recurse -Force
}
