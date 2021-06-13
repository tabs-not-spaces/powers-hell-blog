---
id: 499
title: Publishing PowerShell scripts to Intune with Graph
date: 2021-01-19T13:22:12+10:00
author: Ben
excerpt: |
  I've recently been asked the question - "How can I make sure that the scripts that I publish to Intune are always set to run as 64bit instead of the default 32bit?"

  I thought was a great question with a few simple solutions - so let's look at the two methods I've used in the past to make sure you don't "fat finger" your way into frustration!
layout: post
guid: http://powers-hell.com/?p=499
permalink: /2021/01/19/publishing-powershell-scripts-to-intune-with-graph/
views:
  - "1484"
image: /assets/images/2021/01/scriptToGraph.gif
categories:
  - Azure
  - Graph
  - Intune
  - PowerShell
tags:
  - Graph
  - Intune
  - PowerShell
---
I've recently been asked the question - "How can I make sure that the scripts that I publish to Intune are always set to run as 64bit instead of the default 32bit?"

I thought was a great question with a few simple solutions - so let's look at the two methods I've used in the past to make sure you don't "fat finger" your way into frustration!

<!--more-->

## Enforce architecture from the script

When PowerShell script deployment was initially released within Intune there was no native way to define what architecture the script would run in. This means that the script would always run in the 32bit / x86 environment as the Intune Management Extension agent was launching the scripts and the agent itself was a 32bit agent - it had no way to bootstrap out of the 32bit environment!

The only solution during this period was to make your scripts bootstrap themselves into 64bit with a little bit of PowerShell magic.

```PowerShell
#region 64-bit elevation
if ($env:PROCESSOR_ARCHITEW6432 -eq "AMD64") {
    write-Host "pull on those bootstraps..."
    if ($myInvocation.Line) {
        &"$env:WINDIR\sysnative\windowspowershell\v1.0\powershell.exe" -NonInteractive -executionPolicy Bypass -NoProfile $myInvocation.Line
    }
    else {
        &"$env:WINDIR\sysnative\windowspowershell\v1.0\powershell.exe" -NonInteractive -executionPolicy Bypass -NoProfile -file "$($myInvocation.InvocationName)" $args
    }
    exit $lastexitcode
}
#endregion
```

Place that code at the top of any script you publish to Intune and you can rest easy knowing that your code will always run in the environment it should be in, regardless if you set it correctly from within Intune or not.

## Avoid the Endpoint UI and use Graph

Now that the option to set the architecture from within the script deployment, the above solution is conceivably "redundant" - we can set everything when we publish the script in the portal now!

The problem arises however, because the default architecture setting is set to 32bit instead of the generally expected 64bit, that you can sometimes forget to set the configuration correctly from the portal.

Luckily, we can move away from the Endpoint portal and use PowerShell and Graph to change the default settings to values and standardize our script publishing to avoid any of those absent-minded "user errors" that are so frustratingly common.

Like all other configuration settings / device management endpoints that are exposed via Graph, all that is required is to:

* Understand how the JSON payload data is formed
* Authenticate to Graph
* Build and publish the JSON payload to Graph

The one extra step for script deployment is that we need to encode the script content into a base64 encoded string so that we can post the file within the JSON payload.

Let's dive into the solution together.

### Authentication

I've covered this ad-nauseum, so I won't spend time explaining it - but here's the code snippet we will use for this example. What's cool about this is we can handle whether or not the end user uses PowerShell 5.1 or 7.

```PowerShell
#region authenticate to Graph
if ($PSVersionTable.PSEdition -ne "Core") {
    $auth = Get-MsalToken -ClientId "d1ddf0e4-d672-4dae-b554-9d5bdfd93547" -RedirectUri "urn:ietf:wg:oauth:2.0:oob" -Interactive
}
else {
    $auth = Get-MsalToken -ClientId "d1ddf0e4-d672-4dae-b554-9d5bdfd93547" -DeviceCode
}
$script:authToken = @{
    Authorization = $auth.CreateAuthorizationHeader()
}
#endregion
```

### Encode the script to a base64 string

Very simple - but super important. We just need to get the raw content of the script and throw it into the .Net "System.Convert" type.

```PowerShell
#region encode the script content to base64
$scriptContent = Get-Content "C:\Path\To\Script.ps1" -Raw
$encodedScriptContent = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("$scriptContent"))
#endregion
```

### Payload properties

The required properties for publishing scripts to Graph are quite simple - the endpoint **deviceManagementScripts** is <a href="https://docs.microsoft.com/en-us/graph/api/intune-shared-devicemanagementscript-create?view=graph-rest-beta" data-type="URL" data-id="https://docs.microsoft.com/en-us/graph/api/intune-shared-devicemanagementscript-create?view=graph-rest-beta">well documented</a>, but for simplicity, the only settings we need to understand are listed below:

| **Property Name**     | **Data Type** | **Description**                                  |
|-----------------------|---------------|--------------------------------------------------|
| displayName           | String        | Name of the device management script\.           |
| description           | String        | Description of the script                        |
| enforceSignatureCheck | Boolean       | Setting this to False disables signature check\. |
| fileName              | String        | Name of the file being uploaded\.                |
| runas32Bit            | Boolean       | Setting this to False sets to 64bit              |
| runAsAccount          | String        | Execution context \- System or User              |
| scriptContent         | Binary        | Script content \- encoded as base64              |

So, knowing what we need, let's build out the code to build the payload.

```PowerShell
#region build the request body
$postBody = [PSCustomObject]@{
    displayName           = "Powers-Hell Configuration Script"
    description           = "script that configures important things"
    enforceSignatureCheck = $false
    fileName              = "Script.ps1"
    runAs32Bit            = $false
    runAsAccount          = "System"
    scriptContent         = $encodedScriptContent
} | ConvertTo-Json -Depth 10
#endregion
```

Quite simple - creating a PSCustomObject, filling in the property values and then immediately converting to a JSON string.

### Post the request to Graph

Once we've got out authentication header, we've encoded the script contents and built out the JSON payload, all that's left to do is post the payload to the Graph endpoint.

```PowerShell
#region post the request
$postParams = @{
    Method      = "Post"
    Uri         = "https://graph.microsoft.com/Beta/deviceManagement/deviceManagementScripts"
    Headers     = $script:authToken
    Body        = $postBody
    ContentType = "Application/Json"
}
Invoke-RestMethod @postParams
#endregion
```

If we use the above basic blocks of code, we can very easily build a simple function to allow us to build out a request to publish scripts to our Intune tenant and by forcing the boolean value of **runAs32Bit** to $false, we can ensure the script will always run correctly - even if we haven't had enough coffee yet.

```PowerShell
#requires -module msal.ps
function Publish-ScriptToIntune {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [System.IO.FileInfo]$ScriptFilePath,

        [Parameter(Mandatory = $true)]
        [string]$DisplayName,

        [Parameter(Mandatory = $true)]
        [string]$Description,

        [Parameter(Mandatory = $false)]
        [ValidateSet("System", "User")]
        [string]$RunAsAccount = "System",

        [Parameter(Mandatory = $false)]
        [boolean]$EnforceSignatureCheck,

        [Parameter(Mandatory = $false)]
        [boolean]$RunAs32Bit

    )
    try {
        $script:tick = [char]0x221a
        $errorMsg = $null
        #region authenticate to Graph
        if ($PSVersionTable.PSEdition -ne "Core") {
            $auth = Get-MsalToken -ClientId "d1ddf0e4-d672-4dae-b554-9d5bdfd93547" -RedirectUri "urn:ietf:wg:oauth:2.0:oob" -Interactive
        }
        else {
            $auth = Get-MsalToken -ClientId "d1ddf0e4-d672-4dae-b554-9d5bdfd93547" -DeviceCode
        }
        if (!($auth)) {
            throw "Authentication failed."
        }
        $script:authToken = @{
            Authorization = $auth.CreateAuthorizationHeader()
        }
        #endregion
        #region encode the script content to base64
        $scriptContent = Get-Content "$ScriptFilePath" -Raw
        $encodedScriptContent = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("$scriptContent"))
        #endregion
        #region build the request body
        $postBody = [PSCustomObject]@{
            displayName           = $DisplayName
            description           = $Description
            enforceSignatureCheck = $EnforceSignatureCheck
            fileName              = $ScriptFilePath.Name
            runAs32Bit            = $RunAs32Bit
            runAsAccount          = $RunAsAccount
            scriptContent         = $encodedScriptContent
        } | ConvertTo-Json -Depth 10
        #endregion
        Write-Host "`nPosting script content to Intune: " -NoNewline -ForegroundColor Cyan
        #region post the request
        $postParams = @{
            Method      = "Post"
            Uri         = "https://graph.microsoft.com/Beta/deviceManagement/deviceManagementScripts"
            Headers     = $script:authToken
            Body        = $postBody
            ContentType = "Application/Json"
        }
        if ($PSCmdlet.MyInvocation.BoundParameters["Verbose"].IsPresent) {
            Write-Host "`n"
        }
        $res = Invoke-RestMethod @postParams
        #endregion
    }
    catch {
        $errorMsg = $_.Exception.Message
    }
    finally {
        if ($auth) {
            if ($errorMsg) {
                Write-Host "X`n" -ForegroundColor Red
                Write-Warning $errorMsg
            }
            else {
                if ($PSCmdlet.MyInvocation.BoundParameters["Verbose"].IsPresent) {
                    $res
                }
                Write-Host "$script:tick Script published to Intune with ID $($res.id)" -ForegroundColor Green
            }
        }
    }
}
```

As always, the code featured is available in my [GitHub](https://github.com/tabs-not-spaces/CodeDump/tree/master/Publish-ScriptToIntune) and I'm always up for a chat on [Twitter](https://twitter.com/powers_hell)!

— Ben
