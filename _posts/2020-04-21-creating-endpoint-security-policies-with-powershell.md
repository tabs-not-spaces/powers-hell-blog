---
id: 014
title: Creating Endpoint Security Policies with PowerShell
date: 2020-04-21T14:53:26+10:00
author: Ben
layout: post
guid: http://powers-hell.com/?p=272
permalink: /2020/04/21/creating-endpoint-security-policies-with-powershell/
views:
  - "3798"
image: https://i2.wp.com/i.imgur.com/idlGMwI.gif?w=1170&#038;ssl=1
categories:
  - Azure
  - Intune
  - PowerShell
tags:
  - Automation
  - Intune
  - PowerShell
---

Keeping up with the rapid momentum of everything in the modern management world is a full time job. It's exhausting, but it's also fun.

<!--more-->

It truly pays to read the "[What's new in Microsoft Intune](https://docs.microsoft.com/en-us/mem/intune/fundamentals/whats-new)" on a regular basis.

Case in point, late last month, Microsoft announced an updated URL for the Microsoft Endpoint Manager Admin Portal - <https://endpoint.microsoft.com>, previously <https://devicemanagement.microsoft.com>.

Along with this change to the new and improved management portal, about a week ago, I noticed some changes to the UI around device management and how device configuration policies are configured and managed.

[![Endpoint Portal](/assets/images/2020/04/image-4.png)](/assets/images/2020/04/image-4.png "Endpoint Portal")

Stepping through the new policy options shows that configuring policies is a significantly streamlined experience than in the previous [management portal](https://aka.ms/devicemanagement). More importantly, the policies that you configure in the new admin portal don't seem to appear in the previous portal..

This got me to thinking - if these policies aren't visible in the original portal, then there must be some new Graph API endpoints for me to play with.

Turns out I was right - all of these new policies exist as what Microsoft are calling "templates".

To work with them, all we need to do is create an "instance" of a template and add the settings to the new policy.

So let's dive in and learn how to create some security policies in the new endpoint portal.

Firstly, I created a reference policy, using **Disk Encryption** as the policy type to show what we will be creating.

[![Reference policy](/assets/images/2020/04/image-5.png)](/assets/images/2020/04/image-5.png "Reference policy")

The 5 settings displayed above are literally all we need for most scenarios to encrypt devices. This interface is a marked improvement from the original portal!

Alright, enough of graphical user interfaces. Let's pop open PowerShell and start building things.

Firstly we need to authenticate to Graph - This has been discussed ad-nauseum over the last few years, so I wont go into how to do this. I will say however, that as I've been working predominantly with PowerShell 7, I've had to move away from the ADAL libraries and over to the new MSAL libraries. There's a [module available](https://github.com/jasoth/MSAL.PS/issues) for us to auth, so let's grab that.

```PowerShell
Install-Module -Name MSAL.PS -scope CurrentUser -Force
```

Now let's use it to authenticate to Graph.

```PowerShell
#region Auth
$authParams = @{
    clientId = 'd1ddf0e4-d672-4dae-b554-9d5bdfd93547' #well known intune / graph application
    tenantId = 'powers-hell.com' #replace with your tenantId or FQDN
    Interactive = $true
    DeviceCode = $true
}
$auth = Get-MsalToken @authParams
#endregion Auth
```

[![MSAL Auth](https://i2.wp.com/i.imgur.com/ZeDtwH0.gif?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/ZeDtwH0.gif?w=1170&#038;ssl=1 "MSAL Auth")

Now that we've got our authentication token, let's first have a look at what policy "templates" we have available to us.

```PowerShell
#region Get deviceManagement/templates
$authHeader = @{Authorization = "Bearer $($auth.AccessToken)"}
$templates = Invoke-RestMethod -Method Get -Uri "https://graph.microsoft.com/beta/deviceManagement/templates" -Headers $authHeader
$templates.value
#endregion Get deviceManagement/templates
```

As you should see by now, the code is a fairly simple rest call - we are just setting up the auth header and calling the **deviceManagement/templates** endpoint from the beta version of graph.

If you run the above code you'll get back a lot of results. There's 27 templates in total - a lot more than that are available to us in the UI.

Here's all of them for reference.

| **displayName**                        | **description**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|----------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Microsoft Defender ATP baseline        | Microsoft Defender ATP baseline as recommended by Microsoft                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Account protection                     | Account protection policies help protect user credential by using technology such as Windows Hello for Business and Credential Guard\.                                                                                                                                                                                                                                                                                                                                                                                    |
| Attack surface reduction rules         | Attack surface reduction rules target behaviors that malware and malicious apps typically use to infect computers, including: Executable files and scripts used in Office apps or web mail that attempt to download or run files Obfuscated or otherwise suspicious scripts Behaviors that apps don't usually initiate during normal day\-to\-day work                                                                                                                                                                    |
| App and browser isolation              | Windows Defender Application Guard \(Application Guard\) is designed to help prevent old and newly emerging attacks to help keep employees productive\. Using our unique hardware isolation approach, our goal is to destroy the playbook that attackers use by making current attack methods obsolete\.                                                                                                                                                                                                                  |
| Windows 10 compliance policy           | Windows 10 compliance policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Microsoft Defender Antivirus           | Windows Defender Antivirus is the next\-generation protection component of Microsoft Defender Advanced Threat Protection \(Microsoft Defender ATP\)\. Next\-generation protection brings together machine learning, big\-data analysis, in\-depth threat resistance research, and cloud infrastructure to protect devices in your enterprise organization\.                                                                                                                                                               |
| Exploit protection                     | Exploit protection helps protect against malware that uses exploits to infect devices and spread\. Exploit protection consists of a number of mitigations that can be applied to either the operating system or individual apps\.                                                                                                                                                                                                                                                                                         |
| Microsoft Defender Firewall            | Windows Defender Firewall with Advanced Security is an important part of a layered security model\. By providing host\-based, two\-way network traffic filtering for a device, Windows Defender Firewall blocks unauthorized network traffic flowing into or out of the local device\.                                                                                                                                                                                                                                    |
| MDM Security Baseline for May 2019     | MDM Security Baseline as recommended by Microsoft                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Device control                         | Microsoft recommends a layered approach to securing removable media, and Microsoft Defender ATP provides multiple monitoring and control features to help prevent threats in unauthorized peripherals from compromising your devices\.                                                                                                                                                                                                                                                                                    |
| Windows 8 compliance policy            | Windows 8 compliance policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| BitLocker                              | BitLocker Drive Encryption is a data protection feature that integrates with the operating system and addresses the threats of data theft or exposure from lost, stolen, or inappropriately decommissioned computers\.                                                                                                                                                                                                                                                                                                    |
| FileVault                              | FileVault provides built\-in Full Disk Encryption for macOS devices\.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| macOS firewall                         | Enable and configure the built\-in firewall for macOS devices\.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Endpoint detection and response        | Microsoft Defender ATP endpoint detection and response capabilities provide advanced attack detections that are near real\-time and actionable\. Security analysts can prioritize alerts effectively, gain visibility into the full scope of a breach, and take response actions to remediate threats\.                                                                                                                                                                                                                   |
| Antivirus                              | Customers using Microsoft Defender Advanced Threat Protection for Mac can configure and deploy Antivirus settings macOS managed devices\.                                                                                                                                                                                                                                                                                                                                                                                 |
| Microsoft Defender ATP baseline        | Microsoft Defender ATP baseline as recommended by Microsoft                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Android work profile compliance policy | Android work profile compliance policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Web protection                         | Web protection in Microsoft Defender ATP uses network protection to secure your machines against web threats\. By integrating with Microsoft Edge and popular third\-party browsers like Chrome and Firefox, web protection stops web threats without a web proxy and can protect machines while they are away or on premises\. Web protection stops access to phishing sites, malware vectors, exploit sites, untrusted or low\-reputation sites, as well as sites that you have blocked in your custom indicator list\. |
| Android device owner compliance policy | Android device owner compliance policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Preview: Microsoft Edge baseline       | Microsoft recommended settings for Microsoft Edge                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Windows Phone compliance policy        | Windows Phone compliance policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Windows Security experience            | The Windows Security app is used by a number of Windows security features to provide notifications about the health and security of the machine\. These include notifications about firewalls, antivirus products, Windows Defender SmartScreen, and others\.                                                                                                                                                                                                                                                             |
| Application control                    | Application control can help mitigate security threats by restricting the applications that users are allowed to run and the code that runs in the System Core \(kernel\)\. Application control policies can also block unsigned scripts and MSIs, and restrict Windows PowerShell to run in Constrained Language Mode\.                                                                                                                                                                                                  |
| iOS compliance policy                  | iOS compliance policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Mac compliance policy                  | Mac compliance policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Android compliance policy              | Android compliance policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

For our example, we only need the BitLocker policy, so let's just capture that. Now we can either do that by filtering down the full list of tables from the previous command, or we can filter from the graph call as shown below:

```PowerShell
#region get BitLocker template from graph
$bitlocker = Invoke-RestMethod -Method Get -Uri "https://graph.microsoft.com/beta/deviceManagement/templates?`$filter=startswith(displayName,'BitLocker')" -Headers $authHeader
$bitlocker.value
#endregion get BitLocker template from graph
```

Running the command should get us the BitLocker template data below.

[![Bitlocker template data](/assets/images/2020/04/image-6.png)](/assets/images/2020/04/image-6.png "Bitlocker template data")

Once we have this, the next step is to create a new "instance" of the template. We will use the id from the **$bitlocker.value.id** variable above to form the next POST request.

```PowerShell
#region new template instance
$request = @{
    displayName = "Win10_BitLocker_Example"
    description = "Win10 BitLocker Example for Powers-Hell.com"
    templateId = $bitlocker.value.id
} | ConvertTo-Json
$instance = Invoke-RestMethod -Method Post -Uri "https://graph.microsoft.com/beta/deviceManagement/templates/$($bitlocker.value.id)/createInstance" -Headers $authHeader -ContentType 'Application/Json' -body $request
$instance
#endregion new template instance
```

If we have done everything correctly to this point, we should get an object returned to us with the details of the new instance of the BitLocker template.

[![New instance of bitlocker template](/assets/images/2020/04/image-7.png)](/assets/images/2020/04/image-7.png "New instance of bitlocker template")

Once we have the new instance details, now we just need to add the configuration properties to it.

Every template has a dedicated list of available settings and the required values that they will accept - and it's an exhaustive list. To view the settings, we call the **deviceManagement/settingsDefinitions** endpoint.

It's a little too in depth to cover in this article, but I strongly recommend anyone who is interested in implementing this into production spends some time understanding the schema definitions contained within this endpoint.

As we only configured 5 settings in our original reference policy, we will do the same thing here.

Using the $instance.id value from the previous command we will now "update" the instance with the settings (known at the "intents" - the intent to apply settings).

```PowerShell
#region update instance settings
$definitionBase = 'deviceConfiguration--windows10EndpointProtectionConfiguration_'
$request = @(
    @{
        "settings" = @(
            @{
                "@odata.type"  = "#microsoft.graph.deviceManagementBooleanSettingInstance"
                "definitionId" = "$($definitionBase)bitLockerEncryptDevice"
                "value"        = $true
            }
            @{
                "@odata.type"  = "#microsoft.graph.deviceManagementBooleanSettingInstance"
                "definitionId" = "$($definitionBase)bitLockerEnableStorageCardEncryptionOnMobile"
                "value"        = $true
            }
            @{
                "@odata.type"  = "#microsoft.graph.deviceManagementBooleanSettingInstance"
                "definitionId" = "$($definitionBase)bitLockerDisableWarningForOtherDiskEncryption"
                "value"        = $true
            }
            @{
                "@odata.type"  = "#microsoft.graph.deviceManagementBooleanSettingInstance"
                "definitionId" = "$($definitionBase)bitLockerAllowStandardUserEncryption"
                "value"        = $true
            }
            @{
                "@odata.type"  = "#microsoft.graph.deviceManagementStringSettingInstance"
                "definitionId" = "$($definitionBase)bitLockerRecoveryPasswordRotation"
                "value"        = "enabledForAzureAd"
            }
        )
    }
) | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://graph.microsoft.com/beta/deviceManagement/intents/$($instance.id)/updateSettings" -ContentType 'Application/JSON' -Headers $authHeader -Body $request
#endregion update instance settings
```

And that's it - If we head back to our admin portal we should see a new BitLocker policy named "Win10\_BitLocker\_Example" and inside, the configuration settings we have applied.

Hopefully this gives you ideas of how we can use PowerShell to control and deploy policies in this exhausting modern management world we find ourselves in!

Next week I'll spend some time to show you how we can build out automated reporting with these new security policies.

As always, code for this post is available on my [GitHub](https://github.com/tabs-not-spaces/CodeDump/tree/master/New-PolicyFromTemplate), and I'm always up for a chat on [Twitter](https://twitter.com/powers_hell).
