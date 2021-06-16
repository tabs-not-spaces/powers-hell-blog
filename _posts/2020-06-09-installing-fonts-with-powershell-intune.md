---
id: 018
title: 'Installing fonts with PowerShell & Intune'
date: 2020-06-09T01:22:21+10:00
author: Ben
layout: post
guid: http://powers-hell.com/?p=271
permalink: /2020/06/09/installing-fonts-with-powershell-intune/
views:
  - "6958"
image: /assets/images/2020/06/createwin32.gif
categories:
  - Intune
  - PowerShell
tags:
  - PowerShell
---
So this seems like a fairly simple and innocuous task - the marketing department comes to you and ask for a handful of new fonts to be deployed to all devices..

Previously you may have solved this request using Group Policy - but if you are managing your devices with Intune, where do you even start?

With PowerShell & Win32 app deployments of course!

<!--more-->

## Create

First let's scaffold out our new application project we are going to make - in the example code below we are just going to put everything in the root of our system drive.

```PowerShell
New-Item "$env:SystemDrive\FontsToDeploy\Fonts" -ItemType Directory -Force
New-Item "$env:SystemDrive\FontsToDeploy\Fonts\install.ps1" -ItemType File -Force
```

Now, let's grab the fonts that the marketing department has asked us to install and place them inside the **Fonts** folder.

Open up **install.ps1** (the file created in the example code above) in your favourite editor (that's VS-Code, right?) and we will begin the fun stuff.

We will begin by inserting a very simple function into our install script that will do all of the heavy lifting of this installation.

```PowerShell
#region functions
function Install-Fonts {
    param (
        [Parameter(Mandatory = $true)]
        [string]$FontFile
    )
    try {
        $font = $fontFile | split-path -Leaf
        If (!(Test-Path "c:\windows\fonts\$($font)")) {
            switch (($font -split "\.")[-1]) {
                "TTF" {
                    $fn = "$(($font -split "\.")[0]) (TrueType)"
                    break
                }
                "OTF" {
                    $fn = "$(($font -split "\.")[0]) (OpenType)"
                    break
                }
            }
            Copy-Item -Path $fontFile -Destination "C:\Windows\Fonts\$font" -Force
            New-ItemProperty -Name $fn -Path "HKLM:\Software\Microsoft\Windows NT\CurrentVersion\Fonts" -PropertyType string -Value $font
        }
    }
    catch {
        write-warning $_.exception.message
    }
}
#endregion
```

As you can see, not much is required - the function is just checking if the font file is a \*.TTF or \*.OTF file, copying the file to the font folder and setting a registry entry in HKLM to expose the new font on the system to all users of the device.

Now that we have our function added, all we need to do is step through our fonts folder and send each font through the function to be installed on the system.

```PowerShell
foreach ($f in $(Get-ChildItem $PSScriptRoot\fonts)) {
    Install-Fonts -FontFile $f.fullName
}
```

We should probably also add some error handling to the solution - this will be provided in the final solution in GitHub.

## Package

Once our install.ps1 file is created, we need to convert the project to a single file that we can upload to Intune.

I've spoken about this at length elsewhere, but surprisingly haven't mentioned it here, so I'll touch on the process, but I will keep it brief..

* Download a copy of the **[Win32 Content Prep Tool](https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool)**. Store it somewhere central (I tend to keep tools like this in a folder in the root of my system drive, or in the root of the project I am working on.)
* Open PowerShell and set your path to the root of the Application Project we made earlier.
* Call the Win32 Content Prep Tool from PowerShell.

```PowerShell
& C:\PathToTools\IntuneWinAppUtil.exe -c C:\Fonts -s Install.ps1 -o C:\Fonts
```

[![Create Win32 App Package](/assets/images/2020/06/createwin32.gif)](/assets/images/2020/06/createwin32.gif "Create Win32 App Package")

## Deploy

Now that we have our *.intunewin package, we can move over to endpoint.microsoft.com and add a new "Windows App (Win32)" application.

I won't detail the steps here as it's been heavily [documented by Microsoft](https://docs.microsoft.com/en-us/mem/intune/apps/apps-win32-app-management) and [the](https://www.asquaredozen.com/2019/08/21/troubleshooting-win32-app-installs-in-intune/) [greater](https://www.inthecloud247.com/deploy-win32-apps-with-microsoft-intune/) [community](https://www.anoopcnair.com/intune-win32-app-deployment/) [already](https://www.youtube.com/watch?v=x-RMjhzGXxA&t=50s), just make sure that you:

* Deploy the solution using the **system context**
* Set the detection method to look for one or more of the resultant font files that will end up in C:\windows\fonts

Hopefully this shows how much can be done with PowerShell & Intune - obviously font installation is a relatively simple task, but using this concept, you can use win32 apps to deliver scripts and related payloads to your devices quickly and securely.

As always, code for this post is available on [GitHub](https://github.com/tabs-not-spaces/CodeDump/tree/master/Install-Fonts) and I am always available for a chat on [Twitter](https://twitter.com/powers_hell).

— Ben
