---
id: 023
title: 'Set your Azure VPN connections to "Connect Automatically" with PowerShell'
date: 2020-11-28T16:25:27+10:00
author: Ben
layout: post
guid: http://powers-hell.com/?p=472
permalink: /2020/11/28/set-your-azure-vpn-connections-to-connect-automatically-with-powershell/
obfx-header-scripts:
  - ""
obfx-footer-scripts:
  - ""
views:
  - "3541"
categories:
  - Azure
  - Intune
  - PowerShell
tags:
  - Intune
---
One of my clients recently came to me asking for assistance to set up a new VPN solution. The requirements were quite simple - They were building out an Azure Point-To-Site VPN solution and needed me to come up with a way to deliver the connection to the end user devices.

<!--more-->

My first suggestion was to simply use the built-in VPN client that comes with Windows 10. If we use this, we can utilize the native VPN policies within Intune which let us define everything we need - including setting the connection to automatically connect. The problem, as it turned out is the native VPN client has a limit of 25 route rules per connection - something that \*shouldn't\* normally be a problem, but was insurmountable in this scenario.

The next suggestion was to leverage the <a href="https://www.microsoft.com/en-us/p/azure-vpn-client/9np355qt2sqb" data-type="URL" data-id="https://www.microsoft.com/en-us/p/azure-vpn-client/9np355qt2sqb">Azure VPN Client</a> from the Microsoft store. This VPN client is designed to compliment the native VPN client and adds support for MFA as well as allowing connections from the native VPN interface.

The only problem? There is no way to force the "connect automatically" setting in the native VPN client, thus the client's major requirement was not met.

Now, the end user can technically go in once the connection is deployed and set it themselves, but there has to be a more reliable way of doing this on behalf of the user - if it can be done via Intune for the native client, surely there has to be a way to enforce the setting? The answer, as always, is a resounding "of course!".

Before we begin, the first thing we need to do is convert the config files I was given by my network team into a format that we can silently push out.

Once you've downloaded the Azure P2S config files, the next step is to manually import the config into the Azure VPN client (technically there is a way to do this using CLI parameters, however it's frustratingly broken at the moment - I'll talk about that another time!).

[![VPN Connection Import](/assets/images/2020/11/VPNConnectionImport-1.gif)](/assets/images/2020/11/VPNConnectionImport-1.gif "VPN Connection Import")

What this manual step does is creates the \*.PBK file that the VPN client uses to "dial the connection". Once we have that \*.PBK file generated, we can capture the contents, and then deploy it out to other devices via Intune (or Configuration Manager) using a very simple PowerShell script.

The *.PBK file is stored within the Azure VPN client folder structure in your local app data folder shown below - It's always the same path which makes all of this very easy to automate!

**%localappdata%\Packages\Microsoft.AzureVpn_8wekyb3d8bbwe\LocalState\rasphone.pbk**

Open the *.pbk file in your favourite editor (that's VSCode for everyone right?) and let's move onto the code.

<pre class="wp-block-code" title="Deploy and configure VPN"><code lang="powershell" class="language-powershell line-numbers">
#region Configuration
$VPNName = 'Powers Hell VPN Connection'
$VPNGUID = 'F3910F5AC434944F9335C187D7476DB4'
$currentUser = (Get-CimInstance -ClassName WIn32_Process -Filter 'Name="explorer.exe"' | Invoke-CimMethod -MethodName GetOwner)[0]
$objUser = New-Object System.Security.Principal.NTAccount($currentUser.user)
$strSID = $objUser.Translate([System.Security.Principal.SecurityIdentifier])
$requiredFolder = "C:\Users\$($currentUser.user)\AppData\Local\Packages\Microsoft.AzureVpn_8wekyb3d8bbwe\LocalState"
$rasManKeyPath = "HKLM:\SYSTEM\CurrentControlSet\Services\RasMan\Config"
#endregion
#region PBK Configuration
$PBKConfig - @"
#Place your PBK contents here...
"@
#endregion
#region Functions
function Write-Log {
    [cmdletbinding()]
    param (
        [string]$logMessage
    )
    Write-Host "[$(Get-Date -Format 'dd-MM-yyyy_HH:mm:ss')] $logMessage" -ForegroundColor Yellow
}
#endregion
#region Deploy VPN
if (!(Test-Path $RequiredFolder -ErrorAction SilentlyContinue)) {
  New-Item $RequiredFolder -ItemType Directory | Out-Null
  $LogLocation = "$RequiredFolder\NewAzureVPNConnectionLog_$(Get-Date -Format 'dd-MM-yyyy_HH_mm_ss').log"
  Start-Transcript -Path $LogLocation -Force -Append

  Write-Log "Required folder $RequiredFolder was created on the machine since it wasn't found."
  New-Item "$RequiredFolder\rasphone.pbk" -ItemType File | Out-Null

  Write-Log "File rasphone.pbk has been created in $RequiredFolder."
  Set-Content "$RequiredFolder\rasphone.pbk" $PBKConfig

  Write-Log "File rasphone.pbk has been populated with configuration details."
  Stop-Transcript | Out-Null
}
else {
  $LogLocation = "$RequiredFolder\NewAzureVPNConnectionLog_$(Get-Date -Format 'dd-MM-yyyy_HH_mm_ss').log"
  Start-Transcript -Path $LogLocation -Force -Append

  Write-Log "Folder $RequiredFolder already exists, that means that Azure VPN Client is already installed."
  if (!(Test-Path "$RequiredFolder\rasphone.pbk" -ErrorAction SilentlyContinue)) {

    Write-Log "File rasphone.pbk doesn't exist in $RequiredFolder."
    New-Item "$RequiredFolder\rasphone.pbk" -ItemType File | Out-Null

    Write-Log "File rasphone.pbk has been created in $RequiredFolder."
    Set-Content "$RequiredFolder\rasphone.pbk" $PBKConfig

    Write-Log "File rasphone.pbk has been populated with configuration details."
    Stop-Transcript | Out-Null
  }
  else {
    Write-Log "File rasphone.pbk already exists in $RequiredFolder."
    Rename-Item -Path "$RequiredFolder\rasphone.pbk" -NewName "$RequiredFolder\rasphone.pbk_$(Get-Date -Format 'ddMMyyyy-HHmmss')"

    Write-Log "File rasphone.pbk has been renamed to rasphone.pbk_$(Get-Date -Format 'ddMMyyyy-HHmmss'). This file contains old configuration if it will be required in the future (in case it is, just rename it back to rasphone.pbk)."
    New-Item "$RequiredFolder\rasphone.pbk" -ItemType File | Out-Null

    Write-Log "New rasphone.pbk file has been created in $RequiredFolder."
    Set-Content "$RequiredFolder\rasphone.pbk" $PBKConfig

    Write-Log "File rasphone.pbk has been populated with configuration details."
    Stop-Transcript | Out-Null
  }
}
#endregion</code></pre>

Not much to be said about the above code - all we are doing is pushing out the contents of the \*.PBK file to the correct location on the target machines. There is only one important thing to note - I've specifically replaced the name and guid from the \*.PBK file with variable names to allow me to set them in the configuration at the top of the script. You don't need to do that yourself, but it makes the solution a little more "reusable".

You can see where they normally appear in the screenshot below (lines 1 & 10).

[![PBK Snippet](/assets/images/2020/11/image.png)](/assets/images/2020/11/image.png "PBK Snippet")

Alright, we've deployed the VPN - but it still isn't automatically connecting. Let's go and figure that out.

The key to this solution is found in the registry (as always). The auto connection settings can be found in the local machine hive path shown below.

**HKLM:\SYSTEM\CurrentControlSet\Services\RasMan\Config**

[![VPN Registry](/assets/images/2020/11/image-1.png)](/assets/images/2020/11/image-1.png "VPN Registry")


As you can see above, for my corporate VPN connection, we are setting a few key values - namely:

  * **AutoTriggerDisabledProfilesList** - A list of VPNs specifically set to not automatically connect (done manually by the user).
  * **AutoTriggerProfileEntryName** - The Name of the VPN connection
  * **AutoTriggerProfileGUID** - The HEX GUID of the VPN connection
  * **AutoTriggerProfilePhonebookPath** - The path to the phonebook file
  * **UserSID** - The SID of the user who has set the automatic connection.

Once we understand what is required to set the connection, all we need to do is fill out the data and store it in the correct registry location!

<pre class="wp-block-code" title="Connect Automatically"><code lang="powershell" class="language-powershell line-numbers">
#region Functions
function Convert-HexToByte {
  [cmdletbinding()]
  param (
    [string]$HexString
  )
  $splitString = ($HexString -replace '(..)','$1,').Trim(',')
  [byte[]]$hexified = $splitString.Split(',') | ForEach-Object { "0x$_"}
  return $hexified
}
function Set-ComputerRegistryValues {
  param (
      [Parameter(Mandatory = $true)]
      [array]$RegistryInstance
  )
  try {
      foreach ($key in $RegistryInstance) {
          $keyPath = $key.Path
          if (!(Test-Path $keyPath)) {
              Write-Host "Registry path : $keyPath not found. Creating now." -ForegroundColor Green
              New-Item -Path $key.Path -Force | Out-Null
              Write-Host "Creating item property: $($key.Name)" -ForegroundColor Green
              New-ItemProperty -Path $keyPath -Name $key.Name -Value $key.Value -Type $key.Type -Force
          }
          else {
              Write-Host "Creating item property: $($key.Name)" -ForegroundColor Green
              New-ItemProperty -Path $keyPath -Name $key.Name -Value $key.Value -Type $key.Type -Force
          }
      }
  }
  catch {
      Throw $_.Exception.Message
  }
}
#endregion
#region Configure Always On
[string[]]$autoDisable = (Get-ItemPropertyValue $rasManKeyPath -Name AutoTriggerDisabledProfilesList) | ForEach-Object { if ($_ -ne $VPNName) { $_ }}
$regKeys = @(
  @{
    Path = $rasManKeyPath
    Name = 'AutoTriggerDisabledProfilesList'
    Value = [string[]]$autoDisable
    Type = 'MultiString'
  }
  @{
    Path = $rasManKeyPath
    Name = 'AutoTriggerProfilePhonebookPath'
    Value = "$RequiredFolder\rasphone.pbk"
    Type = 'String'
  }
  @{
    Path = $rasManKeyPath
    Name = 'AutoTriggerProfileEntryName'
    Value = $VPNName
    Type = 'String'
  }
@{
    Path = $rasManKeyPath
    Name = 'UserSID'
    Value = $sid
    Type = 'String'
  }
@{
    Path = $rasManKeyPath
    Name = 'AutoTriggerProfileGUID'
    Value = [Byte[]](Convert-HexToByte -HexString $VPNGUID)
    Type = 'Binary'
  }
)
Set-ComputerRegistryValues $regKeys
#endregion</code></pre>

Again, most of this code is quite simple - all we are doing is entering some data into the registry.

The only interesting thing of interest is how I'm converting the VPN GUID from the phonebook file into the Binary format required - which is done with the function **Convert-HexToByte** show above - that took me a little longer than I'm willing to admit!

The other thing to be aware of is that deploying the VPN config can be done either in the User or System context - no admin privileges are required, however due to the registry keys being stored in the HKLM hive, admin privileges will be required to set the "connect automatically" section of this solution.

That's it for now - if you've got any questions about this solution, please reach out to me on [twitter](https://twitter.com/powers_hell), and as always, the code for this post can be found on my [GitHub](https://github.com/tabs-not-spaces/CodeDump/tree/master/AzureVPNAutoConnect).

— Ben
