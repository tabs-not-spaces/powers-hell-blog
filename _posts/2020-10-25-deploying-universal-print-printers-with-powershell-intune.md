---
id: 022
title: 'Deploying Universal Print Printers With PowerShell & Intune'
date: 2020-10-25T15:21:15+10:00
excerpt: Over the last few weeks I've been playing with **Universal Print** - the cloud print solution developed by Microsoft and I honestly can't praise it enough.
author: Ben
layout: post
guid: http://powers-hell.com/?p=450
permalink: /2020/10/25/deploying-universal-print-printers-with-powershell-intune/
obfx-header-scripts:
  - ""
obfx-footer-scripts:
  - ""
views:
  - "3484"
spay_email:
  - ""
image: /assets/images/2020/10/universalprint.gif
categories:
  - Azure
  - Graph
  - Intune
  - PowerShell
  - Universal Print
tags:
  - Intune
  - PowerShell
  - Universal Print
---
Over the last few weeks I've been playing with **[Universal Print](https://docs.microsoft.com/en-us/universal-print/fundamentals/universal-print-whatis)** - the cloud print solution developed by Microsoft and I honestly can't praise it enough.

<!--more-->

Configuring the "infrastructure" for the solution took me less than 5 minutes.. Seriously - Grab a license (free during the public preview), install and configure a connector on a device with line-of-sight to your printer and finally set the printer shares in the Azure portal.

It was so easy I honestly don't think I need to talk more about it - [the steps are really well documented over on the Microsoft Docs page](https://docs.microsoft.com/en-us/universal-print/fundamentals/universal-print-getting-started), so start there if you haven't already set things up.

The one area that needs a little bit of polish is the way that printers get deployed to our end user devices. [The current solution](https://docs.microsoft.com/en-us/universal-print/fundamentals/universal-print-intune-tool) offered by Microsoft has two key requirements:

  * Deploy the **Universal Print printer provisioning tool** via Intune (as a win32 package)
  * Deploy a CSV file with a list of printers, along with a batch script to deploy the CSV file to a key location.

Once the two packages are deployed, printers will then install on the client devices **upon the next reboot or logon event**.

There's two things I don't currently love about this solution and wanted to try and improve:

  * Is there a way we can make the printers install on the client devices without having to wait for a reboot or a logon event?
  * Can we do this with PowerShell?

The answer to both of these statements was a resounding "of course we can!" What I was surprised to find was how simple it actually was.

This guide assumes you've already configured everything else - licensing, setting up the Universal Print connector etc. If you haven't done that, go and sort that out.

Alright, let's jump in - we are going to deploy this solution as a "proactive remediation" script via Intune, although there is nothing stopping you deploying as a standard PowerShell script, or as a packaged win32 application.

## Detection

<pre title="Detection Script" class="wp-block-code"><code lang="powershell" class="language-powershell line-numbers">#region printer list
$availablePrinters = @(
    "Printer A"
    "Printer B"
    "Printer C"
    "Printer D"
)
$notFound = 0
#endregion
#region check the printers exist
try {
    foreach ($p in $availablePrinters) {
        if (!(Get-Printer -Name $p -ErrorAction SilentlyContinue)) {
            $notFound ++
        }
    }
}
catch {
    $errorMsg = $_.Exception.Message
}
finally {
    if ($errorMsg) {
        Write-Warning $errorMsg
        exit 1
    }
    else {
        if ($notFound) {
            Write-Warning "$notFound printers not found locally.."
            exit 1
        }
        else {
            Write-Host "All printers detected.."
            exit 0
        }
    }
}
#endregion</code></pre>

The code above is pretty simple, simply list the names of the printers you want to make sure exist on the device - if any of them are missing, they will be flagged and the script will exit with a **non-zero** exit code, which will alert Intune that the remediation script is required to run.

## Remediation

<pre title="Remediation Script" class="wp-block-code"><code lang="powershell" class="language-powershell line-numbers">#region printer list
$availablePrinters = @(
    [pscustomobject]@{
        SharedID   = '2f8aa4d8-8c21-4d37-9506-3da446bcf9ea'
        SharedName = 'Printer A'
        IsDefault  = 'Yes'
    }
    [pscustomobject]@{
        SharedID   = 'c288bc70-8e14-4c5b-9f82-428ecf3ab63a'
        SharedName = 'Printer B'
        IsDefault  = $null
    }
    [pscustomobject]@{
        SharedID   = '478a29db-7bdd-46a7-a75e-e0d61167988c'
        SharedName = 'Printer C'
        IsDefault  = $null
    }
    [pscustomobject]@{
        SharedID   = '896262c5-59ca-4b92-becf-074feb25fccc'
        SharedName = 'Printer D'
        IsDefault  = $null
    }
)
#endregion
try {
    $configurationPath = "$env:appdata\UniversalPrintPrinterProvisioning\Configuration"
    if (!(Test-Path $configurationPath -ErrorAction SilentlyContinue)) {
        New-Item $configurationPath -ItemType Directory -Force | Out-Null
    }
    $printCfg = ($availablePrinters | ConvertTo-Csv -NoTypeInformation | ForEach-Object { $_ -replace '"', "" } ) -join [System.Environment]::NewLine
    $printCfg | Out-File "$configurationPath\printers.csv" -Encoding ascii -NoNewline
    Start-Process "${env:ProgramFiles(x86)}\UniversalPrintPrinterProvisioning\Exe\UPPrinterInstaller.exe" -Wait -WindowStyle Hidden
}
catch {
    $errorMsg = $_.Exception.Message
}
finally {
    if ($errorMsg) {
        Write-Warning $errorMsg
        exit 1
    }
    else {
        Write-Host "Universal Printer Installer configured and launched. Printers should appear shortly.."
        exit 0
    }
}</code></pre>

The remediation script is also quite simple, the **$availablePrinters** array contains the details of each Universal Print printer that we need to map the printer to the device.

Head to **Universal Print > Printer Shares** (In the Azure portal), select each printer share and make note of the **Share ID** and the **Name** of the share. For each printer, you will create a **psCustomObject** containing the **ShareID, SharedName** and whether or not you want this printer to be flagged as a _default_ printer or not.<figure class="wp-block-image size-full">

[![Printer A](/assets/images/2020/10/image-1.png)](/assets/images/2020/10/image-1.png "Printer A")

The rest of the script is also fairly straight forward. What we are doing is building out the "printers.csv" file that the **Universal Print Printer Provisioning Service** uses to validate which printers to install.

The real *magic* of the script (which isn't really that magic) is on line 32. The print provisioning service that gets installed by the Universal Print installation media sits in the background and listens for a **user logon** event. Once this event is found, the service triggers another executable - **UPPrinterInstaller.exe** which looks for the *.csv file we have created, authenticates to Graph, validates the print share details and then kicks off a **Web Services for Devices (WSD)** process to map the available printers.

Now, I'll be the first to admit that the solution here is a little "kludgy" - I initially intended to reverse engineer the **UPPrinterInstaller.exe** to identify exactly *how* that WSD process works, however this works well enough - for now at least.

## Notes

* the Proactive Remediation detection and remediation scripts need to be run in the **user context** as opposed to system - make sure you set that in the solution.
* The default printer value will **NOT** work the way it is intended if you have the **Let Windows manage my default printer** setting enabled (found within the **Printers & scanners** section of settings). Which makes sense - but just be aware of that.

I will continue to dig into this solution to try and make it a little more elegant - with the hopes that any advancements I make with the provisioning process might just make it into the official solution once it leaves Public Preview.

As always, the code referenced in this guide is available in [GitHub](https://github.com/tabs-not-spaces/CodeDump/tree/master/Universal-Print-Printer-Install) and I can be reached on [Twitter](https://twitter.com/powers_hell).

— Ben
