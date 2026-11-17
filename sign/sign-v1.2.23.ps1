param(
    [string]$Keystore = 'C:\WorkDir\SigningKeys\StoNinoDevotional-upload.jks',
    [string]$SdkPath = "$env:LOCALAPPDATA\Android\Sdk"
)

$ErrorActionPreference = 'Stop'
$tools = Get-ChildItem (Join-Path $SdkPath 'build-tools') -Directory |
    Where-Object {
        (Test-Path (Join-Path $_.FullName 'zipalign.exe')) -and
        (Test-Path (Join-Path $_.FullName 'apksigner.bat'))
    } | Select-Object -First 1
if (-not $tools) { throw "Android SDK Build-Tools not found under $SdkPath." }

$zipalign = Join-Path $tools.FullName 'zipalign.exe'
$apksigner = Join-Path $tools.FullName 'apksigner.bat'
$unsigned = Join-Path $PSScriptRoot 'sto-nino-devotional-1.2.23-unsigned.apk'
$signed = Join-Path $PSScriptRoot 'sto-nino-devotional-1.2.23-signed.apk'
$expectedDigest = '02a60added8c0fa21127774ec08ee9c7a2c162156af10f43bc84d1211ade79cf'

if (-not (Test-Path -LiteralPath $Keystore -PathType Leaf)) { throw "Keystore not found at $Keystore." }
if (-not (Test-Path -LiteralPath $unsigned -PathType Leaf)) { throw 'Keep this script beside the extracted unsigned APK.' }
if (Test-Path -LiteralPath $signed) { throw "Output already exists at $signed." }

$temp = Join-Path ([IO.Path]::GetTempPath()) ('stonino-' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $temp | Out-Null
try {
    $aligned = Join-Path $temp 'aligned.apk'
    $candidate = Join-Path $temp 'signed.apk'
    & $zipalign -f 4 $unsigned $aligned
    if ($LASTEXITCODE -ne 0) { throw 'APK alignment failed.' }

    & $apksigner sign --ks $Keystore --ks-key-alias stonino-upload --out $candidate $aligned
    if ($LASTEXITCODE -ne 0) { throw 'APK signing failed.' }

    $verification = & $apksigner verify --verbose --print-certs $candidate
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
    $verification | Write-Output
    if (-not ($verification -match "Signer #1 certificate SHA-256 digest: $expectedDigest\s*$")) {
        throw 'The certificate does not match the v1.2.19 signer.'
    }
    Move-Item -LiteralPath $candidate -Destination $signed
    Write-Output "Verified signed release: $signed"
} finally {
    Remove-Item -LiteralPath $temp -Recurse -Force
}
