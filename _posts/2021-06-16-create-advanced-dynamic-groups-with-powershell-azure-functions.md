---
id: 025
layout: post
title: Create advanced dynamic groups with PowerShell & Azure Functions
date: 2021-06-16 16:56 +1000
author: Ben
views: 0
image: /assets/images/2021/06/pwsh_005.gif
categories:
    - PowerShell
    - Azure
    - Intune
    - Azure Functions
tags:
    - PowerShell
    - Azure
    - Intune
    - Azure Functions
---

I've never been entirely happy with dynamic groups in Intune. The primary reason for this boils down to two primary issues:

- The time it takes to analyze the dynamic group rules is nowhere near fast enough.
- The available properties available for dynamic group rules are limited to the data available in AAD - not Intune.

<!--more-->

While the first issue has been remediated with the introduction of [filters](https://docs.microsoft.com/en-us/mem/intune/fundamentals/filters), the fact that I can't create a rule on ANY property I want still bugs me.

I recently sat down with my good friend [Steven Hosking](https://twitter.com/OnPremCloudGuy) and discussed ways to create dynamic groups using Power Automate, proving that with a little bit of effort (and deep-diving into Graph), you can build dynamic groups using custom logic. Check out the video below.

<div class="video-container">
    <iframe src="https://www.youtube.com/embed/OLIA5_YW0Pg" title="S02E36 - Building Custom Dynamic Groups with Power Automate - (I.T)" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media;" allowfullscreen></iframe>
</div>

Now that we know how *relatively simple* it is to build out custom dynamic groups with Power Automate, Let's look into how we can achieve the same result with nothing but PowerShell & Azure Functions.

## Overview

Like the video above, we can make sure that compliant devices are members of a specific security group. If they are no longer compliant, we want to make sure they are removed.

The solution we will build has two core elements:

- An AAD application configured with **application-scoped** API permissions.
- An Azure function app to handle the group membership logic.

## AAD application

- [Create an AAD application](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app) with the following API permissions:

| API Permission Name | Type |
|---|---|
| Device.Read.All | Application |
| DeviceManagementManagedDevices.Read.All | Application |
| Group.Read.All | Application |
| GroupMember.ReadWrite.All | Application |

- Grant admin consent for the above permissions.
- Generate a **client secret** and store it, along with the **application ID** for future use.

## Function application

Create a **consumption** function app (either in the [Azure portal](https://docs.microsoft.com/en-us/azure/azure-functions/functions-create-function-app-portal), or [VSCode](https://docs.microsoft.com/en-us/azure/azure-functions/create-first-function-vs-code-powershell)).

[![Basic function app creation](/assets/images/2021/06/functionapp.png)](/assets/images/2021/06/functionapp.png "Basic function app creation")

From here on out, I'll be sharing screens from VSCode, but you can achieve the same results directly from the portal as well.

[![Function app creation in VSCode](/assets/images/2021/06/pwsh_001.gif)](/assets/images/2021/06/pwsh_001.gif "Function app creation in VSCode")

>**Tip:** Because this function app doesn't rely on any external modules, we can speed up its **cold-start** performance by setting `managedDependency enabled` value to **false** in the host.json file.
>[![disable managed dependency for faster cold start times](/assets/images/2021/06/pwsh_002.png)](/assets/images/2021/06/pwsh_002.png "disable managed dependency for faster cold start times")

Once you have your function app created, we will need to set up the following application variables:

| Variable Name | Variable Value |
|---|---|
| TENANT_ID | **Your tenant ID \ AAD domain name**|
| APPLICATION_ID | **Your AAD application ID**|
| CLIENT_SECRET | **Your AAD application client secret**|
| GROUP_ID | **The object id of the security group you want to manage**|

For those who want to build this locally, you can put the above variables in your **local.settings.json** file within your function app project.

[![local.settings.json](/assets/images/2021/06/pwsh_004.png)](/assets/images/2021/06/pwsh_004.png "local.settings.json")

Now comes the fun part. Writing the function app logic. The script can be broken down into three main parts:

- Authentication
- Getting compliance data with Graph
- Adding / Deleting group memberships with Graph

Let's look at each section now.

### Authentication

Nothing super fancy here - I've discussed the ways to authenticate to Graph many times before. We will leverage the app variables we set up earlier to authenticate to our AAD application and store the token for the next few steps of the solution.

```PowerShell
function Get-AuthHeader {
    param (
        [Parameter(mandatory = $true)]
        [string]$TenantId,
        [Parameter(mandatory = $true)]
        [string]$ClientId,
        [Parameter(mandatory = $true)]
        [string]$ClientSecret,
        [Parameter(mandatory = $true)]
        [string]$ResourceUrl
    )
    $body = @{
        resource      = $ResourceUrl
        client_id     = $ClientId
        client_secret = $ClientSecret
        grant_type    = "client_credentials"
        scope         = "openid"
    }
    try {
        $response = Invoke-RestMethod -Method post -Uri "https://login.microsoftonline.com/$TenantId/oauth2/token" -Body $body -ErrorAction Stop
        $headers = @{ "Authorization" = "Bearer $($response.access_token)" }
        return $headers
    }
    catch {
        Write-Error $_.Exception
    }
}
$params = @{
    TenantId     = $env:TENANT_ID
    ClientId     = $env:CLIENT_ID
    ClientSecret = $env:CLIENT_SECRET
    ResourceUrl  = "https://graph.microsoft.com"
}
$authHeader = Get-AuthHeader @params
```

### Compliance validation

Now that we have authenticated into Graph let's grab all the devices and check their compliance state.

```PowerShell
$graphUri = 'https://graph.microsoft.com/Beta/deviceManagement/managedDevices'
$params = @{
    Method      = 'Get'
    Headers     = $authHeader
    Uri         = $graphUri
    ContentType = 'Application/Json'
}
$query = Invoke-RestMethod @params
```

The results of the query are now stored in the `$query` variable. If we dive into the returned object data, selecting only the properties we want to see, we should start seeing some usable data.

```PowerShell
$query.Value | Select-Object deviceName, complianceState
```

[![results of our first Graph query](/assets/images/2021/06/pwsh_003.gif)](/assets/images/2021/06/pwsh_003.gif "results of our first Graph query")

Now we know how to capture the compliance state of our devices, we can move onto managing their group memberships!

### Managing group memberships

Because security groups in Azure are an *AAD thing* we need to trade the Intune device object we got in the previous code snippet for the AAD device object. Luckily, the Intune object above contains the **azureADDeviceId** property, so it's easy to get what we need. Let's see how we would get the AAD object of just one of the devices in the returned objects.

```PowerShell
$firstDevice = $query.Value[0]
$graphUri = "https://graph.microsoft.com/beta/devices?`$filter=deviceId eq '$($firstDevice.azureADDeviceId)'"
$params = @{
    Method      = 'Get'
    Headers     = $authHeader
    Uri         = $graphUri
    ContentType = 'Application/Json'
}
$AADDevice = Invoke-RestMethod @params
$AADDevice.Value
```

Now let's get the current group members of the security group we want to manage.

```PowerShell
$graphUri = "https://graph.microsoft.com/beta/groups/$env:GROUP_ID/members"
$params = @{
    Method      = 'Get'
    Headers     = $authHeader
    Uri         = $graphUri
    ContentType = 'Application/Json'
}
$groupMembers = Invoke-RestMethod @params
```

Let's check if the device is already a member - if it's not and the **complianceState** value is true, let's add it.

```PowerShell
if ($firstDevice.complianceState -eq "Compliant") {
    if ($groupMembers.value -notcontains $AADDevice.value[0].deviceId) {
        #region Device is compliant and not in the group
        $graphUri = "https://graph.microsoft.com/v1.0/groups/$env:GROUP_ID/members/`$ref"
        $params = @{
            Method      = 'Post'
            Headers     = $authHeader
            Uri         = $graphUri
            ContentType = 'Application/Json'
            body        = @{"@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$($AADDevice.value[0].id)" } | ConvertTo-Json
        }
        Invoke-RestMethod @params
        #endregion
    }
}
```

Conversely, if the device is NOT compliant and exists in the group, let's handle that as well.

```PowerShell
if ($firstDevice.complianceState -ne "Compliant") {
    if ($groupMembers.value -contains $AADDevice.value[0].deviceId) {
        #region device not compliant and exists in group
        $graphUri = "https://graph.microsoft.com/v1.0/groups/$env:GROUP_ID/members/$($AADDevice.value[0].id)/`$ref"
        $params = @{
            Method      = 'DELETE'
            Headers     = $authHeader
            Uri         = $graphUri
            ContentType = 'Application/Json'
        }
        Invoke-RestMethod @params
        #endregion
    }
}
```

So now we have the basic logic for our function app, with a bit of refactoring (to remove duplicate code) some code to help us build a result output, we should end up with a solution that will add all of my compliant devices to a security group!

```PowerShell
using namespace System.Net

# Input bindings are passed in via param block.
param($Request, $TriggerMetadata)
$result = [System.Collections.ArrayList]::new()
$expectedComplianceValue = "compliant"
#region functions
function Get-AuthHeader {
    param (
        [Parameter(mandatory = $true)]
        [string]$TenantId,
        [Parameter(mandatory = $true)]
        [string]$ClientId,
        [Parameter(mandatory = $true)]
        [string]$ClientSecret,
        [Parameter(mandatory = $true)]
        [string]$ResourceUrl
    )
    $body = @{
        resource      = $ResourceUrl
        client_id     = $ClientId
        client_secret = $ClientSecret
        grant_type    = "client_credentials"
        scope         = "openid"
    }
    try {
        $response = Invoke-RestMethod -Method post -Uri "https://login.microsoftonline.com/$TenantId/oauth2/token" -Body $body -ErrorAction Stop
        $headers = @{ "Authorization" = "Bearer $($response.access_token)" }
        return $headers
    }
    catch {
        Write-Error $_.Exception
    }
}
function Invoke-GraphCall {
    [cmdletbinding()]
    param (
        [parameter(Mandatory = $false)]
        [ValidateSet('Get', 'Post', 'Delete')]
        [string]$Method = 'Get',

        [parameter(Mandatory = $false)]
        [hashtable]$Headers = $script:authHeader,

        [parameter(Mandatory = $true)]
        [string]$Uri,

        [parameter(Mandatory = $false)]
        [string]$ContentType = 'Application/Json',

        [parameter(Mandatory = $false)]
        [hashtable]$Body
    )
    try {
        $params = @{
            Method      = $Method
            Headers     = $Headers
            Uri         = $Uri
            ContentType = $ContentType
        }
        if ($Body) {
            $params.Body = $Body | ConvertTo-Json -Depth 20
        }
        $query = Invoke-RestMethod @params
        return $query
    }
    catch {
        Write-Warning $_.Exception.Message
    }
}
function Format-Result {
    [cmdletbinding()]
    param (
        [parameter(Mandatory = $true)]
        [string]$DeviceID,

        [parameter(Mandatory = $true)]
        [bool]$IsCompliant,

        [parameter(Mandatory = $true)]
        [bool]$IsMember,

        [parameter(Mandatory = $true)]
        [ValidateSet('Added', 'Removed', 'NoActionTaken')]
        [string]$Action
    )
    $result = [PSCustomObject]@{
        DeviceID    = $DeviceID
        IsCompliant = $IsCompliant
        IsMember    = $IsMember
        Action      = $Action
    }
    return $result
}
#endregion
#region authentication
$params = @{
    TenantId     = $env:TENANT_ID
    ClientId     = $env:CLIENT_ID
    ClientSecret = $env:CLIENT_SECRET
    ResourceUrl  = "https://graph.microsoft.com"
}
$script:authHeader = Get-AuthHeader @params
#endregion
#region get devices & group members
$graphUri = 'https://graph.microsoft.com/Beta/deviceManagement/managedDevices'
$query = Invoke-GraphCall -Uri $graphUri

$graphUri = "https://graph.microsoft.com/beta/groups/$env:GROUP_ID/members"
$groupMembers = Invoke-GraphCall -Uri $graphUri
#endregion
#region check each device.
foreach ($device in $query.value) {
    #region get aad object from intune object
    $graphUri = "https://graph.microsoft.com/beta/devices?`$filter=deviceId eq '$($device.azureADDeviceId)'"
    $AADDevice = (Invoke-GraphCall -Uri $graphUri).value
    #endregion
    if ($device.complianceState -eq $expectedComplianceValue) {
        if ($groupMembers.value.deviceId -notcontains $AADDevice.deviceId) {
            #region Device is compliant and not in the group
            $graphUri = "https://graph.microsoft.com/v1.0/groups/$env:GROUP_ID/members/`$ref"
            $body = @{"@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$($AADDevice.id)" }
            Invoke-GraphCall -Uri $graphUri -Method Post -Body $body
            $result.Add($(Format-Result -DeviceID $device.id -IsCompliant $true -IsMember $true -Action Added)) | Out-Null
            #endregion
        }
        else {
            #region device is compliant and already a member
            $result.Add($(Format-Result -DeviceID $device.id -IsCompliant $true -IsMember $true -Action NoActionTaken)) | Out-Null
            #endregion
        }
    }
    else {
        if ($groupMembers.value.deviceId -contains $AADDevice.deviceId) {
            #region device not compliant and exists in group
            $graphUri = "https://graph.microsoft.com/v1.0/groups/$env:GROUP_ID/members/$($AADDevice.id)/`$ref"
            Invoke-GraphCall -Uri $graphUri -Method Delete
            $result.Add($(Format-Result -DeviceID $device.id -IsCompliant $false -IsMember $false -Action Removed)) | Out-Null
            #endregion
        }
        else {
            #region device not compliant and is not a member
            $result.Add($(Format-Result -DeviceID $device.id -IsCompliant $false -IsMember $false -Action NoActionTaken))
            #endregion
        }
    }
}
#endregion
# Associate values to output bindings by calling 'Push-OutputBinding'.
Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::OK
        Body       = $result | ConvertTo-Json -Depth 20
    })
```

If we now spin up a local instance of our function app (or run it from Azure for those testing in production🤠) we can trigger the function app from the URI and see the results...

[![It lives!](/assets/images/2021/06/pwsh_005.gif)](/assets/images/2021/06/pwsh_005.gif "It lives!")

Awesome! Now, there is more that needs to be done before this could be safely used in production - specifically putting in some logic to handle large amounts of devices via batched Graph calls and I'd be switching out the HTTP Trigger binding for a CRON job to automate the task, but I hope this will give you ideas for ways to build your dynamic group automation.

Don't let the above example think you are limited to just properties via Graph either, keeping the HTTP trigger on the function app, I could imagine scenarios where proactive remediation scripts run on client devices to check for the presence of an application and force the function app to trigger..

As always, [the full code from this article is available on Github](https://github.com/tabs-not-spaces/CodeDump/tree/master/Dynamic-Group-Automation)

— Ben
