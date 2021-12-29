---
layout: post
title: Manage Intune Trusted Certificate Profile Expiration with PowerShell & Microsoft Graph
date: 2021-12-27 04:36 +0000
id: 030
author: Ben
views: 0
image: /assets/images/2021/12/get-certificateexpiry.gif
categories:
- PowerShell
- Azure
- Automation
- Azure Functions
- Intune
tags:
- PowerShell
- Azure
- Automation
- Azure Functions
- Intune
---

How do you remind yourself to renew your CA root certificates / subordinate certificates? Do you set a calendar reminder? Did the person who set those reminders up forget to share them with the team and now is on holidays?

Fear not, for I have holiday gift for you - using nothing but PowerShell, we can interrogate our **trusted certificate policies** and, as if by magic, send out alerts when the attached certificates are about to expire!

<!--more-->

Ready? Let's dive right in.

## Overview

At a high level, what we need to do here is very simple.

All trusted certificate policies store the certificates in a **base 64** encoded string. If we can get access to the policy, we can decrypt the string and interrogate the certificate metadata for its expiry time. Luckily for us, using Microsoft Graph makes this process almost painless.

## Authentication

Ah my favourite topic. Yes, as always, the first step to Intune automation is authentication. Go read my previous article on Graph authentication with PowerShell if you haven't already.

If you don't have an AAD application registered yet, [go ahead and create one.](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app).  
The minimum API permissions you will need are listed below..

| API Permission Name | Type |
|---|---|
| DeviceManagementManagedDevices.Read.All | Application |

Make sure you grant admin consent for the above permission.  
Next, generate a **client secret** and store it, along with the **application ID** for future use.

Alright, got your AAD application registered? Let's use that to authenticate.

```PowerShell
$tenantId = 'powers-hell.com'
$clientId = 'e8984d96-a7b8-4ee0-a2ef-e42ddca2f3a2'
$clientSecret = 'superSecretKey'

$reqestBody = @{
    resource      = 'https://graph.microsoft.com'
    client_id     = $clientId
    client_secret = $clientSecret
    grant_type    = "client_credentials"
    scope         = "openid"
}

$authParams = @{
    Method  = 'Post'
    Uri     = "https://login.microsoftonline.com/$tenantId/oauth2/token"
    Body    = $requestBody
}
$auth = Invoke-RestMethod @authParams
```

> NOTE: If you just want to play around with this example but don't want to build out an AAD app registration just to try stuff out, feel free to use the "well known" intune AAD application. Just know it can only be used with interactive authentication.  
>[Read more about Graph authentication here.](% post_url 2021-07-18-authenticating-to-microsoft-graph-with-powershell-(2021) %)

## Finding the trusted certificate profiles

Now that we have our authentication sorted out, let's query Graph for those trusted certificate policies.

```PowerShell
$authorizationHeader = @{
    Authorization = "Bearer $($auth.accessToken)"
}

$requestBody = @{
    Method      = 'Get'
    Uri         = 'https://graph.microsoft.com/beta/deviceManagement/deviceConfigurations'
    Headers     = $authorizationHeader
    ContentType = 'Application/Json'
}
$response = Invoke-RestMethod @requestBody
$foundCertificates = $response.value | Where-Object { $_.'@odata.type' -like "#microsoft.graph.*TrustedRootCertificate" }
$foundCertificates
```

What we are doing above is collecting all of the **device configuration** policies and removing all policies that do NOT adhere to our fuzzy filter of **microsoft.graph.*TrustedRootCertificate**.   
This should allow us to capture ALL possible certificate policies regardless of operating system.

[![Found Certificates](/assets/images/2021/12/foundCertificates.gif) ](/assets/images/2021/12/foundCertificates.gif "Found Certificates")

## Decrypting the certificate content

Now that we have our **trusted certificate** policies, let's decrypt the certifate content and start analyzing it.

Assuming we get a few results from the above example and we just wanted to look at the first one..

```PowerShell
$trustedRootCertificate = $foundCertificates[0]
$decryptedRootCertificate = [System.Text.Encoding]::ASCII.GetString([System.Convert]::FromBase64String($trustedRootCertificate.trustedRootCertificate))
```
[![Decrypted Certificates](/assets/images/2021/12/foundCertificatesDecrypted.gif) ](/assets/images/2021/12/foundCertificatesDecrypted.gif "Decrypted Certificates")

## Extracting the expiration metadata

Now that we have the decrypted **base 64** encoded certificate, we can convert the content back to a *real certificate*..

```PowerShell
$formattedCertContent = ($decryptedRootCertificate -replace "-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----", "").Trim()
$decryptedCertificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]([System.Convert]::FromBase64String($formattedCertContent))
```

As you should be able to see from the above code, we are simply removing the bounding strings from the bas64 string and converting the resultant encrypted string back into the .Net certificate class.

Once we have that, we should be able to step through the metadata and find the expiry date data we were originally after..

[![Found the expiry date!!](/assets/images/2021/12/foundExpiryDate.gif)](/assets/images/2021/12/foundExpiryDate.gif "Found the expiry date!!")

## Base64 vs DER

"But wait!" I hear you scream. "What if my certificates weren't exported as Base64 from my CA?!".

Firstly, congratulations on being difficult.  
Secondly, of course there's a way to handle that. Let's look at that now.

I've intentionally created a second certificate policy that uses a DER encrypted certificate, so let's decode that using the same code as above and see what we get back..

[![DER encoded certificate data..](/assets/images/2021/12/DerEncoded.gif)](/assets/images/2021/12/DerEncoded.gif "DER encoded certificate data..")

Gross. That isn't looking too great is it..

Well, the good news is that even though it doesn't look as nice as our base64 encoded example, it's just as easy to build a certificate from!

```PowerShell
[byte[]]$decryptedDerCert = [System.Convert]::FromBase64String($trustedRootCertificate.trustedRootCertificate)
$decryptedCertificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]($decryptedDerCert)
```

[![Decoded DER certificate](/assets/images/2021/12/DerDecoded.gif)](/assets/images/2021/12/DerDecoded.gif "Decoded DER certificate")

## Well, what now?

Do something with it!

Now that we know that we can expose the certificate metadata from the Intune configuration profile, it means we can use it to trigger certain actions..

Take the following code as an example..

```PowerShell
#region config
$config = @{
    tenantId     = "powers-hell.com"
    appId        = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    clientSecret = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    dayThreshold = 7
}
#endregion

#region functions
function Get-AuthHeader {
    [cmdletbinding()]
    param (
        [parameter(Mandatory = $true)]
        [string]$TenantId,
        [parameter(Mandatory = $true)]
        [string]$ApplicationId,
        [parameter(Mandatory = $true)]
        [string]$ClientSecret
    )
    $reqestBody = @{
        resource      = 'https://graph.microsoft.com'
        client_id     = $ApplicationId
        client_secret = $clientSecret
        grant_type    = "client_credentials"
        scope         = "openid"
    }

    $authParams = @{
        Method = 'Post'
        Uri = "https://login.microsoftonline.com/$TenantId/oauth2/token"
        Body = $requestBody
    }
    $auth = Invoke-RestMethod @authParams
    $authorizationHeader = @{
        Authorization = "Bearer $($auth.accessToken)"
    }
    return $authorizationHeader
}

function Get-TrustedCertificatesFromIntune {
    [cmdletbinding()]
    param (
        [parameter(Mandatory = $true)]
        [hashtable]$AuthHeader
    )

    try {
        #region Query Graph
        $baseUri = 'https://graph.microsoft.com/beta/deviceManagement/deviceConfigurations'
        $graphParams = @{
            Method      = 'Get'
            Uri         = $baseUri
            Headers     = $AuthHeader
            ContentType = 'Application/Json'
        }
        $result = Invoke-RestMethod @graphParams
        $resultValue = $result.value.Count -gt 0 ? $result.value : $null
        #endregion
        #region Format the results
        $foundCertificates = $resultValue | Where-Object { $_.'@odata.type' -like "#microsoft.graph.*TrustedRootCertificate" }
        if ($foundCertificates.Count -gt 0) {
            Write-Verbose "$($foundCertificates.Count) Trusted certificates found"
            return $foundCertificates
        }
        #endregion
    }
    catch {
        Write-Warning $_.Exception.Message
    }
}

function Get-CertificateDataFromTrustedCertificatePolicy {
    [cmdletbinding()]
    param (
        [parameter(Mandatory = $True, ValueFromPipeline)]
        [PSCustomObject]$TrustedRootCertificate
    )
    try {
        $decryptedTRC = [System.Text.Encoding]::ASCII.GetString([System.Convert]::FromBase64String($TrustedRootCertificate.trustedRootCertificate))
        if ($decryptedTRC -match "-----BEGIN CERTIFICATE-----") {
            #region base64 encoded certificate detected
            Write-Verbose "Base64 encoded certificate detected.."
            $formattedCertContent = ($decryptedTRC -replace "-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----", "").Trim()
            $decryptedCertificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]([System.Convert]::FromBase64String($formattedCertContent))
            return $decryptedCertificate
            #endregion
        }
        else {
            #region der encoded certificate detected
            Write-Verbose "Der encoded certificate detected.."
            [byte[]]$decryptedDerTRC = [System.Convert]::FromBase64String($TrustedRootCertificate.trustedRootCertificate)
            $decryptedCertificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]($decryptedDerTRC)
            return $decryptedCertificate
            #endregion
        }
    }
    catch {
        Write-Warning $_.Exception.Message
    }
}
#endregion

#region auth
$authHeader = Get-AuthHeader -TenantId $config.tenantId -ApplicationId $config.appId -ClientSecret $config.clientSecret
#endregion

#region grab certificate profiles
$certificateProfiles = Get-TrustedCertificatesFromIntune -AuthHeader $authHeader
#endregion

#region grab certicate metadata
$certificates = foreach ($cert in $certificateProfiles) {
    Get-CertificateDataFromTrustedCertificatePolicy -TrustedRootCertificate $cert
}
#endregion

#region grab certicate metadata and send alerts if certificate expires within set threshold
$Expiringcertificates = foreach ($cert in $certificateProfiles) {
    $certData = Get-CertificateDataFromTrustedCertificatePolicy -TrustedRootCertificate $cert
    $daysRemaining = [math]::Round((($certData.NotAfter) - ([DateTime]::Now)).TotalDays)
    if ($daysRemaining -lt $config.dayThreshold) {
        Write-Host "$($cert.displayName) expires in $daysRemaining days ⚠️⚠️⚠️"
        $certData
    }
}
#endregion
```
Populating the ```$config``` variable with your app credentials and setting the date threshold will analyze any **trusted certificate** policies and advise you if any are due to expire.

[![Uhoh... certificates are about to expire](/assets/images/2021/12/get-certificateexpiry.gif)](/assets/images/2021/12/get-certificateexpiry.gif "Uhoh... certificates are about to expire")

Now that you have a working solution to monitor for expiring certificates, why don't you try building it into an Azure Function that runs on a daily schedule? How about sending the results of the script out to a Teams webhook to notify your team in a more dynamic way?

Isn't automation cool?!

As always, all code shown in this article is available on [GitHub](https://github.com/tabs-not-spaces/CodeDump/tree/master/CertificateExpiration)

For all of you that are lucky enough to get time off, have a safe break & I'll see you all again for a hopefully MUCH better 2022.

— Ben