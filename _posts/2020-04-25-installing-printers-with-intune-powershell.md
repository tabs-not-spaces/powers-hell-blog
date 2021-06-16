---
id: 015
title: 'Installing printers with Intune & PowerShell'
date: 2020-04-25T22:30:42+10:00
author: Ben
layout: post
guid: http://powers-hell.com/?p=295
permalink: /2020/04/25/installing-printers-with-intune-powershell/
views:
  - "12410"
categories:
  - Intune
  - PowerShell
tags:
  - Intune
  - PowerShell
---
On the surface, installing printers on end user devices seems like a fairly simple process that's been solved for decades - a nice combination of Group Policies and PowerShell has made this a non-issue.

But what if our devices aren't domain joined?

<!--more-->

When I first had to tackle this problem, I figured it would be a simple as running "Add-Printer" as the end user and moving on.

The problem arises however, when the printer requires drivers to be installed - the dreaded administration UAC prompt appears and ruins any chance of getting out of work early!

By default, Windows doesn't trust printer drivers - It's understood there are inherent security risks involved in blindly allowing drivers to be installed on your computer and as such, requires admin approval if a device wants to install one.

This issue was previously resolved by clearly defining via the **Point and Print Restrictions** group policy exactly what servers could be trusted by the devices, which would allow us to suppress any elevation prompts that would invariably appear.

[![GPO](/assets/images/2020/04/image-8.png)](/assets/images/2020/04/image-8.png "GPO")

"OK, cool - but can't I just do that with an Administrative Template via Intune?" I hear you ask&#8230;

[![Admin Templates In Intune](https://i2.wp.com/i.imgur.com/awDQbvI.gif?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/awDQbvI.gif?w=1170&#038;ssl=1 "Admin Templates In Intune")

Here's the rub - there's actually two policies you need to define and one of them currently doesn't appear in the administrative templates available to us in Intune.

No worries though - with PowerShell, we can solve this issue!

Let's move onto the solution - This will be split up into two segments - Configuring the **Point and Print Policies** and **installing the printers**.

## Point and Print Policies

As mentioned above, there are actually two policies that need to be configured to allow implicit trust for printer driver installation, the **Point and Print Restrictions** **policy** and the **Package Point and Print - Approved Servers** policy.

[![Local GPO Editor](/assets/images/2020/04/image-9.png)](/assets/images/2020/04/image-9.png "Local GPO Editor")

We define our restrictions for Point and Print in the **PnP Restrictions policy**, and then we define our allowed servers for those restrictions to be applied to in the **Package PnP Approved Servers policy.**

Luckily, both of these policies are quite easy to configure with PowerShell.

First let's set up how we want to configure the restrictions policy.

```PowerShell
#region Print servers
$printServers = @(
    "print1.powers-hell.com"
    "print2.powers-hell.com"
)
#endregion
#region PnP retrictions
$hklmKeys = @(
    [PSCustomObject]@{
        Name  = "Restricted"
        Type  = "DWORD"
        Value = "1"
        Path  = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PointAndPrint"
    }
    [PSCustomObject]@{
        Name  = "TrustedServers"
        Type  = "DWORD"
        Value = "1"
        Path  = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PointAndPrint"
    }
    [PSCustomObject]@{
        Name  = "InForest"
        Type  = "DWord"
        Value = "0"
        Path  = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PointAndPrint"
    }
    [PSCustomObject]@{
        Name  = "NoWarningNoElevationOnInstall"
        Type  = "DWord"
        Value = "1"
        Path  = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PointAndPrint"
    }
    [PSCustomObject]@{
        Name  = "UpdatePromptSettings"
        Type  = "DWord"
        Value = "2"
        Path  = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PointAndPrint"
    }
    [PSCustomObject]@{
        Name  = "ServerList"
        Type  = "String"
        Value = $printServers -join ";"
        Path  = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PointAndPrint"
    }
)
#endregion
```

This is a simple array of configuration settings - all we are doing is replicating the same settings as shown in the first screenshot of this post.

Now let's add the configuration of **Package PnP - Approved Servers policy** to our script..

```PowerShell
#region Package PnP Approved Servers
$hklmKeys += [PSCustomObject]@{
    Name  = "PackagePointAndPrintServerList"
    Type  = "DWORD"
    Value = "1"
    Path  = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PackagePointAndPrint"
}
foreach ($p in $printServers) {
    $hklmKeys += [PSCustomObject]@{
        Name  = $p
        Type  = "String"
        Value = $p
        Path  = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PackagePointAndPrint\ListofServers"
    }
}
#endregion
```

Now with a little help from a very simple function I've created, we can import all of the settings to the registry..

```PowerShell
#region Functions
function Set-ComputerRegistryValues {
    param (
        [Parameter(Mandatory = $true)]
        [array]$RegistryInstance
    )
    try {
        foreach ($key in $RegistryInstance) {
            $keyPath = "$($key.Path)"
            if (!(Test-Path $keyPath)) {
                Write-Host "Registry path : $keyPath not found. Creating now." -ForegroundColor Green
                New-Item -Path $keyPath -Force | Out-Null
                Write-Host "Creating item property: $($key.Name)" -ForegroundColor Green
                New-ItemProperty -Path $keyPath -Name $key.Name -Value $key.Value -PropertyType $key.Type -Force
            }
            else {
                Write-Host "Creating item property: $($key.Name)" -ForegroundColor Green
                New-ItemProperty -Path $keyPath -Name $key.Name -Value $key.Value -PropertyType $key.Type -Force
            }
        }
    }
    catch {
        Throw $_.Exception.Message
    }
}
#endregion
Set-ComputerRegistryValues -RegistryInstance $hklmKeys
```

Now if we open up RegEdit on our device, we should see the configuration in the **HKLM:\Software\Policies\Microsoft\Windows NT\Printers** path.

[![ListOfServers Registry](/assets/images/2020/04/image-10.png)](/assets/images/2020/04/image-10.png "ListOfServers Registry")

All we need to do now is deploy the script to our users via Intune, making sure to deploy it as the System to avoid any permissions issues to the registry.

## Installing printers with PowerShell

Now that the difficult part is out of the way, let's move on to installing the printers.

Hopefully you've already got all of the print queue names documented (and the names of the printers AND the queues are the same&#8230;) - if not, do it now..

Got your printers? ok, great - let's set them up in an array.

```PowerShell
#region Printers to install
$printers = @(
    [PSCustomObject]@{
        Printer = "MainPrinter"
        Server = "print1.powers-hell.com"
    }
    [PSCustomObject]@{
        Printer = "FrontDeskPrinter"
        Server = "print1.powers-hell.com"
    }
    [PSCustomObject]@{
        Printer = "BackupPrinter"
        Server = "print2.powers-hell.com"
    }
)
#endregion
```

Finally, as in the last section, with the help of a simple function I've created for this scenario, we will force the printers to install on the devices. Unlike last time, we don't need admin access, so we will run this as the user.

```PowerShell
#region functions
Function Set-LocalPrinters {
    <#
    .SYNOPSIS
        Installs network printer to local machine.
    .PARAMETER Server
        FQDN or IP Address of print server
    .PARAMETER printerName
        Name of printer to be installed
    #>
    param (
        [string]$server,

        [string]$printerName
    )
    $printerPath = $null
    $PrinterPath = "\\$($server)\$($printerName)"
    $netConn = Test-NetConnection -ComputerName $Server | select-object PingSucceeded, NameResolutionSucceeded
    if (($netconn.PingSucceeded) -and ($netConn.NameResolutionSucceeded)) {
        write-host "Installing $printerName.." -ForegroundColor Green
        if (Get-Printer -Name "$printerPath" -ErrorAction SilentlyContinue) {
            Write-Host "Printer $printerPath already installed" -ForegroundColor Green
        }
        else {
            Write-Host "Installing $printerPath" -ForegroundColor Green
            & cscript /noLogo C:\windows\System32\Printing_Admin_Scripts\en-US\prnmngr.vbs -ac -p $printerPath
            if (Get-Printer -Name "$printerPath" -ErrorAction SilentlyContinue) {
                Write-Host "$printerPath successfully installed.."
            }
            else {
                Write-Warning "$printerPath not successfully installed"
            }
        }
    }
    else {
        Write-Host "Print server not pingable. $printerPath will not be installed" -ForegroundColor Red
    }
}
#endregion
#region Install printers
foreach ($p in $printers) {
    Set-LocalPrinters -server $p.Server -printerName $p.Printer
}
#endregion
```

The function above isn't doing anything special - it's primarily just making sure that we can access the network path and that the printer isn't already installed. The only cool thing to mention is line 26.

```PowerShell
& cscript /noLogo C:\windows\System32\Printing_Admin_Scripts\en-US\prnmngr.vbs -ac -p $printerPath
```

Windows has come bundled with a bunch of printer administration scripts since Windows 7 and it's amazing. You can read more about how it works [here](https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/prnmngr). These sorts of tools are super handy to know about, as it saves us having to "re-invent the wheel" so to speak.

So that's it! two scripts - once run as system to configure the device, and one run as user to map the printers.

Full examples of the code referenced in this article is, as always, available on my [GitHub](https://github.com/tabs-not-spaces/CodeDump/tree/master/Install-Printers), and I can be reached on [twitter](https://twitter.com/Powers_Hell) if you have any questions. I love the distraction!
