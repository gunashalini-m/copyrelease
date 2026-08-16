<#
.SYNOPSIS
  Save Outlook Inbox/Axis attachments whose names contain DS to OneDrive for Business (web).

.DESCRIPTION
  Uses Microsoft Graph with delegated (browser) sign-in. No OneDrive desktop app required.
  Date range is interpreted as India Standard Time (IST, UTC+05:30).
  End date includes mail through 23:50 IST that day.

.EXAMPLE
  .\Save-AxisDsAttachments.ps1 -StartDate '2026-08-01' -EndDate '2026-08-03'

.EXAMPLE
  .\Save-AxisDsAttachments.ps1 -StartDate '2026-08-01' -EndDate '2026-08-03' -MaxEmails 5
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [datetime] $StartDate,

    [Parameter(Mandatory = $true)]
    [datetime] $EndDate,

    [string] $MailFolderPath = 'Inbox/Axis',

    [string] $OneDriveFolder = '/Documents/Axis-DS-Attachments',

    [string] $NameMatch = '_DS_',

    [int] $MaxEmails = 0,

    [string] $AccountId = 'MDR_Cni@apollohospitals.com'
)

$ErrorActionPreference = 'Stop'

function Get-IstToUtc {
    param(
        [datetime] $Date,
        [int] $Hour,
        [int] $Minute
    )
    $ist = [TimeZoneInfo]::FindSystemTimeZoneById('India Standard Time')
    $local = Get-Date -Year $Date.Year -Month $Date.Month -Day $Date.Day -Hour $Hour -Minute $Minute -Second 0
    $unspecified = [datetime]::SpecifyKind($local, [DateTimeKind]::Unspecified)
    return [TimeZoneInfo]::ConvertTimeToUtc($unspecified, $ist)
}

function Get-GraphCollection {
    param([string] $Uri)
    $items = @()
    $next = $Uri
    while ($next) {
        $page = Invoke-MgGraphRequest -Method GET -Uri $next
        if ($page.value) {
            $items += $page.value
        }
        $next = $page.'@odata.nextLink'
    }
    return $items
}

function Get-MailFolderIdByPath {
    param([string] $Path)
    $parts = $Path.Split('/') | Where-Object { $_ }
    $folders = Get-GraphCollection -Uri 'https://graph.microsoft.com/v1.0/me/mailFolders?$top=100'
    $current = $folders | Where-Object { $_.displayName -eq $parts[0] } | Select-Object -First 1
    if (-not $current) {
        throw "Could not find mail folder '$($parts[0])'."
    }
    for ($i = 1; $i -lt $parts.Count; $i++) {
        $children = Get-GraphCollection -Uri ("https://graph.microsoft.com/v1.0/me/mailFolders/{0}/childFolders?`$top=100" -f $current.id)
        $current = $children | Where-Object { $_.displayName -eq $parts[$i] } | Select-Object -First 1
        if (-not $current) {
            throw "Could not find mail folder '$($parts[$i])' under '$($parts[$i-1])'."
        }
    }
    return $current.id
}

function Ensure-OneDriveFolder {
    param([string] $FolderPath)
    $clean = $FolderPath.Trim().TrimEnd('/')
    if (-not $clean.StartsWith('/')) {
        $clean = '/' + $clean
    }
    $escaped = ($clean.TrimStart('/') -split '/' | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
    $uri = "https://graph.microsoft.com/v1.0/me/drive/root:/${escaped}"
    try {
        Invoke-MgGraphRequest -Method GET -Uri $uri | Out-Null
        Write-Host "OneDrive folder exists: $clean"
        return $clean
    }
    catch {
        Write-Host "Creating OneDrive folder: $clean"
        $parent = ($clean.TrimStart('/') -split '/')[0]
        $name = ($clean.TrimStart('/') -split '/')[-1]
        $parentEsc = [uri]::EscapeDataString($parent)
        $body = @{
            name   = $name
            folder = @{}
            '@microsoft.graph.conflictBehavior' = 'fail'
        } | ConvertTo-Json
        try {
            Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/me/drive/root:/${parentEsc}:/children" -Body $body -ContentType 'application/json' | Out-Null
        }
        catch {
            Write-Warning "Could not create folder automatically. Create '$clean' in the OneDrive website, then re-run. $_"
            throw
        }
        return $clean
    }
}

function Get-AttachmentBytes {
    param(
        [string] $MessageId,
        [object] $Attachment
    )
    if ($Attachment.contentBytes) {
        return [Convert]::FromBase64String($Attachment.contentBytes)
    }
    $tmp = Join-Path $env:TEMP ("axis-ds-" + [guid]::NewGuid().ToString() + '.bin')
    try {
        $uri = "https://graph.microsoft.com/v1.0/me/messages/$MessageId/attachments/$($Attachment.id)/`$value"
        Invoke-MgGraphRequest -Method GET -Uri $uri -OutputFilePath $tmp
        return [System.IO.File]::ReadAllBytes($tmp)
    }
    finally {
        Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue
    }
}

function Save-ToOneDrive {
    param(
        [string] $FolderPath,
        [string] $FileName,
        [byte[]] $Bytes
    )
    $folder = $FolderPath.TrimEnd('/')
    $path = ($folder.TrimStart('/') + '/' + $FileName)
    $escaped = ($path -split '/' | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
    $tmp = Join-Path $env:TEMP ("axis-ds-up-" + [guid]::NewGuid().ToString() + '.bin')
    [System.IO.File]::WriteAllBytes($tmp, $Bytes)
    try {
        if ($Bytes.Length -le 4MB) {
            Invoke-MgGraphRequest -Method PUT `
                -Uri "https://graph.microsoft.com/v1.0/me/drive/root:/${escaped}:/content" `
                -Body $Bytes `
                -ContentType 'application/octet-stream' | Out-Null
            return
        }

        $session = Invoke-MgGraphRequest -Method POST `
            -Uri "https://graph.microsoft.com/v1.0/me/drive/root:/${escaped}:/createUploadSession" `
            -Body (@{ item = @{ '@microsoft.graph.conflictBehavior' = 'replace' } } | ConvertTo-Json) `
            -ContentType 'application/json'

        $chunkSize = 327680 * 10
        $offset = 0
        $total = $Bytes.Length
        $stream = [System.IO.File]::OpenRead($tmp)
        try {
            while ($offset -lt $total) {
                $end = [Math]::Min($offset + $chunkSize, $total) - 1
                $len = $end - $offset + 1
                $chunk = New-Object byte[] $len
                [void]$stream.Read($chunk, 0, $len)
                $headers = @{
                    'Content-Length' = $len.ToString()
                    'Content-Range'  = "bytes $offset-$end/$total"
                }
                Invoke-WebRequest -Method PUT -Uri $session.uploadUrl -Headers $headers -Body $chunk -ContentType 'application/octet-stream' | Out-Null
                $offset = $end + 1
            }
        }
        finally {
            $stream.Dispose()
        }
    }
    finally {
        Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue
    }
}

Write-Host "Sign in as $AccountId (not a personal Microsoft account)."
Write-Host 'A device code will appear. Open https://microsoft.com/devicelogin and enter it.'
Disconnect-MgGraph -ErrorAction SilentlyContinue | Out-Null
$connectParams = @{
    Scopes       = @('Mail.Read', 'Files.ReadWrite', 'User.Read')
    UseDeviceCode = $true
}
$hasAccountId = [bool] (Get-Command Connect-MgGraph).Parameters['AccountId']
if ($hasAccountId) {
    $connectParams.AccountId = $AccountId
}
Connect-MgGraph @connectParams | Out-Null
$ctx = Get-MgContext
if (-not $ctx -or -not $ctx.Account) {
    throw "Not signed in. Use https://microsoft.com/devicelogin and sign in as $AccountId."
}
Write-Host "Signed in as $($ctx.Account)"
if ($ctx.Account -and $ctx.Account -notlike "*$AccountId*" -and $AccountId) {
    Write-Warning "Signed in as $($ctx.Account), expected $AccountId. Disconnect-MgGraph and sign in again with the Apollo account."
}

$startUtc = Get-IstToUtc -Date $StartDate -Hour 0 -Minute 0
$endUtc = Get-IstToUtc -Date $EndDate -Hour 23 -Minute 50
Write-Host ("IST range: {0:yyyy-MM-dd} 00:00 through {1:yyyy-MM-dd} 23:50" -f $StartDate, $EndDate)
Write-Host ("UTC filter: {0:o} to {1:o}" -f $startUtc, $endUtc)

$folderId = Get-MailFolderIdByPath -Path $MailFolderPath
Write-Host "Mail folder '$MailFolderPath' id: $folderId"

$odFolder = Ensure-OneDriveFolder -FolderPath $OneDriveFolder

$filter = "hasAttachments eq true and receivedDateTime ge {0:yyyy-MM-ddTHH:mm:ssZ} and receivedDateTime le {1:yyyy-MM-ddTHH:mm:ssZ}" -f $startUtc, $endUtc
$msgUri = "https://graph.microsoft.com/v1.0/me/mailFolders/$folderId/messages?`$filter=$([uri]::EscapeDataString($filter))&`$select=id,subject,receivedDateTime,hasAttachments&`$orderby=receivedDateTime asc&`$top=50"
$messages = @(Get-GraphCollection -Uri $msgUri)
if ($MaxEmails -gt 0 -and $messages.Count -gt $MaxEmails) {
    $messages = $messages | Select-Object -First $MaxEmails
}
Write-Host "Emails with attachments in range: $($messages.Count)"

$saved = 0
$skipped = 0
foreach ($msg in $messages) {
    $atts = Get-GraphCollection -Uri "https://graph.microsoft.com/v1.0/me/messages/$($msg.id)/attachments"
    foreach ($att in $atts) {
        $name = [string] $att.name
        if ($att.isInline) {
            $skipped++
            continue
        }
        $isMatch = $name -and (
            $name.IndexOf($NameMatch, [StringComparison]::OrdinalIgnoreCase) -ge 0 -or
            $name.Contains('DS')
        )
        if (-not $isMatch) {
            Write-Host "  Skip (name): $name"
            $skipped++
            continue
        }

        Write-Host "  Downloading: $name  (mail: $($msg.subject))"
        $bytes = Get-AttachmentBytes -MessageId $msg.id -Attachment $att
        if (-not $bytes -or $bytes.Length -eq 0) {
            Write-Warning "Empty download for $name"
            continue
        }
        Save-ToOneDrive -FolderPath $odFolder -FileName $name -Bytes $bytes
        Write-Host "  Saved to OneDrive: $odFolder/$name ($($bytes.Length) bytes)"
        $saved++
    }
}

Write-Host ""
Write-Host "Done. Saved $saved file(s). Skipped $skipped attachment(s)."
Write-Host "Open OneDrive on the web and refresh $OneDriveFolder"
Disconnect-MgGraph | Out-Null
