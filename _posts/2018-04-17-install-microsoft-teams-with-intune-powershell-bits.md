---
id: 002
title: 'Install Microsoft Teams with Intune, PowerShell &#038; Bits!'
date: 2018-04-17T02:44:12+10:00
excerpt: I know most people out there cringe at the thought of spending time packaging applications for deployment, but unfortunately I seem to be a sucker for punishment and really do revel in the challenges faced with application packaging!
author: Ben
layout: post
guid: http://powers-hell.com/?p=88
permalink: /2018/04/17/install-microsoft-teams-with-intune-powershell-bits/
views:
  - "8787"
categories:
  - PowerShell
---
Hi All,

I know most people out there cringe at the thought of spending time packaging applications for deployment, but unfortunately I seem to be a sucker for punishment and really do revel in the challenges faced with application packaging!

Here's a nice and easy one that will help anyone tasked with getting the latest version of the Teams client onto devices - whether using SCCM or Intune, you will find a use for the code below.

The version release cycle of Microsoft Teams is rapid - so much so that if you were tasked with maintaining the latest installation media for your business deployment solution, you'll very quickly find that it would take up a lot of your time just keeping your local repositories up to date. Of course, the client itself has a very robust update engine, so it \*technically\* doesn't matter what version you initially install, for sanity's sake and for a little bit more control, it's best to try and start with the latest version.

The trick here is to not worry about maintaining a local version of the installation media and simply force the device to pull down the latest version from the official repo!

Onto the solution!

After a bit of digging and monitoring with fiddler on the <a href="https://teams.microsoft.com/downloads/" target="_blank" rel="noopener">Teams download page</a>, I identified the way the URLs were being formed to request the correct media. Below is a breakdown.

| **Type** | **Value** |
|   ---    |    ---    |
| Base URL | https://teams.microsoft.com/downloads/DesktopURL?|
| Environment | &env=production|
| Platform | &plat={windows|osx}|
| OSArchitecture | &arch={x86|x64}|

Quite straightforward! So if we want to pull down the latest Windows 64-bit client, we simply create the URL shown below:

https://teams.microsoft.com/downloads/DesktopURL?&env=production&plat=windows&arch=x64

So now lets throw that URL into a powershell web-request&#8230;

```PowerShell
Invoke-WebRequest -Uri "https://teams.microsoft.com/downloads/DesktopURL?&env=production&plat=windows&arch=x64" -UseBasicParsing
```

And the result of that command below..

[![invoke-webrequest](https://i1.wp.com/i.imgur.com/rgVnHO9.png?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/rgVnHO9.png?w=1170&#038;ssl=1 "invoke-webrequest")

Success! if we have a look at the content of the result of the web-request we can see the URL of the latest 64-bit Teams client!

Now that we know the process to retrieve the media, we can turn the whole process into a function that can be deployed out to devices to pull down the install media.

Below is the function I have created to programatically form the correct URL based on our requirements - aside from creating the URL and capturing the file URL, all that is left to be done is pull down the content using Bits & a little bit of error handling!

```PowerShell
function Get-MicrosoftTeamsClient {
    [CmdletBinding()]
    param(
        [parameter()]
        [ValidateSet(, "production")]
        [string]$env = "production",

        [parameter()]
        [ValidateSet(, "windows", "osx")]
        [string]$platform = "windows",

        [parameter()]
        [ValidateSet(, "x64", "x86")]
        [string]$osArch = "x64",

        [parameter(Mandatory = $true)]
        [string]$destinationPath
    )
    switch ($platform) {
        "windows" {
            $uri = "https://teams.microsoft.com/downloads/DesktopURL?env=$($env)&plat=$($platform)&arch=$($osArch)"
            break
        }
        "osx" {
            $uri = "https://teams.microsoft.com/downloads/DesktopURL?env=$($env)&plat=$($platform)"
            break
        }
    }

    $contentURI = Invoke-WebRequest -Uri $uri -UseBasicParsing
    $contentName = ($contentURI.content -split "/")[-1]
    $result = @{}
    $result.FilePath = "$destinationPath\$contentName"
    if (!(Test-Path $destinationPath)) {
        New-Item -Path $destinationPath -ItemType Directory -Force | out-null
    }
    Write-Host "Downloading $contentName" -ForegroundColor Green
    if (!(test-path "$($destinationPath)\$($contentName)")) {
        $bitsJob = Start-BitsTransfer -Source $($contentURI.content) -Destination "$($destinationPath)\$($contentName)" -Asynchronous
        start-sleep -Seconds 1
        Write-Host "Total filesize: $($bitsJob.BytesTotal)" -ForegroundColor Yellow
        While ($bitsJob | Where-Object {$bitsJob.JobState -eq "Transferring"}) {
            Start-Sleep -Seconds 2
        }
        Write-Host "Total transferred: $($bitsJob.BytesTransferred)" -ForegroundColor Green
        if ($bitsJob.BytesTotal -eq $bitsJob.BytesTransferred) {
            Get-BitsTransfer -JobId $bitsJob.JobId | Complete-BitsTransfer
            $result.result = "Downloaded"
            return $result
        }
        else {
            Write-Host "Error during download - file size mismatch" -ForegroundColor Red
            $result.result = "Failed"
            return $result
        }
    }
    else {
        Write-Host "$contentName already found at location: $destinationPath" -ForegroundColor Yellow
        $result.result = "Found"
        return $result
    }
}
```

Now that you have a function to easily retrieve the latest installation media, all that is required is to handle the installation which of course will vary between operating systems.
Once you have a working installation script, it's then a piece of cake to deploy via sidecar in Intune (or SCCM - any deployment method will suffice!)

I've provided a fully functioning example to download and install the latest 64-bit Client for windows in my <a href="https://github.com/tabs-not-spaces/CodeDump/tree/master/Install-MicrosoftTeams" rel="noopener" target="_blank">GitHub repository</a> for your preusal / review.

Hopefully this has been helpful to you and always, if you have any improvements / complaints or just wish to discuss the solution provided above, leave a comment below or reach me on twitter <a href="https://twitter.com/powers_hell" rel="noopener" target="_blank">@powers_hell</a>

Enjoy,
Ben
