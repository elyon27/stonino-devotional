param(
    [Parameter(Mandatory = $true)]
    [string]$Keystore,

    [Parameter(Mandatory = $true)]
    [string]$KeyAlias
)

$ErrorActionPreference = 'Stop'
$unsigned = Join-Path $PSScriptRoot 'sto-nino-devotional-1.2.48-unsigned.aab'
$signed = Join-Path $PSScriptRoot 'sto-nino-devotional-1.2.48-signed.aab'
if (-not (Test-Path -LiteralPath $unsigned -PathType Leaf)) {
    throw "Place the unsigned AAB beside this script: $unsigned"
}
if (Test-Path -LiteralPath $signed) {
    throw "Output already exists: $signed"
}
$keystorePath = (Resolve-Path -LiteralPath $Keystore).ProviderPath

$jarsigner = $null
if ($env:JAVA_HOME) {
    $jdkSigner = Join-Path $env:JAVA_HOME 'bin\jarsigner.exe'
    if (Test-Path -LiteralPath $jdkSigner -PathType Leaf) {
        $jarsigner = $jdkSigner
    }
}
if (-not $jarsigner) {
    $tool = Get-Command jarsigner.exe -ErrorAction SilentlyContinue
    if (-not $tool) {
        throw 'Set JAVA_HOME to a JDK that includes jarsigner.'
    }
    $jarsigner = $tool.Source
}

$candidate = Join-Path $PSScriptRoot ('signing-' + [guid]::NewGuid().ToString('N') + '.aab')
$passwordVariable = 'STONINO_AAB_' + [guid]::NewGuid().ToString('N')
$securePassword = Read-Host 'Enter keystore password' -AsSecureString
$passwordPointer = [IntPtr]::Zero
try {
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    [Environment]::SetEnvironmentVariable($passwordVariable,
        [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer), 'Process')
    & $jarsigner -signedjar $candidate -keystore $keystorePath -storepass:env $passwordVariable $unsigned $KeyAlias
    if ($LASTEXITCODE -ne 0) { throw 'AAB signing failed.' }

    $verifyArgs = @('-J-Duser.language=en', '-J-Duser.country=US', '-verify', '-certs',
        '-keystore', $keystorePath, '-storepass:env', $passwordVariable, $candidate, $KeyAlias)
    $verification = & $jarsigner @verifyArgs
    $verifyExit = $LASTEXITCODE
    $verification | Out-Host
    if ($verifyExit -ne 0 -or -not ($verification -match '^jar verified\.$') -or
        ($verification -match 'unsigned entries|not signed by the specified alias')) {
        throw 'AAB signature verification failed.'
    }

    Move-Item -LiteralPath $candidate -Destination $signed
    Write-Output "Verified signed AAB: $signed"
} finally {
    [Environment]::SetEnvironmentVariable($passwordVariable, $null, 'Process')
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    $securePassword.Dispose()
    if (Test-Path -LiteralPath $candidate) {
        Remove-Item -LiteralPath $candidate
    }
}
