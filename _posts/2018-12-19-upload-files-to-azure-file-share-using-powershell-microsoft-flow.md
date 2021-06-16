---
id: 009
title: 'Upload files to Azure File Share using PowerShell & Microsoft Flow'
date: 2018-12-19T01:09:42+10:00
excerpt: 'I’m a big fan of using Start-Transcript in my application install wrappers as it provides a very neat and tidy way to capture the output'
author: Ben
layout: post
guid: http://powers-hell.com/?p=143
permalink: /2018/12/19/upload-files-to-azure-file-share-using-powershell-microsoft-flow/
views:
  - "5002"
image: /assets/images/2018/12/kltIrPS.png
categories:
  - Flow
  - Intune
  - PowerShell
tags:
  - Flow
  - Intune
  - PowerShell
---
I'm a big fan of using Start-Transcript in my application install wrappers as it provides a very neat and tidy way to capture the output of everything that happens during the installation process and as such, all of the applications I package end up storing log files locally and I passionately and repeatedly urge my support staff to view these log files to identify issues during deployment. However, not everyone has the "read the log files then troubleshoot" mentality, so I find myself having the same conversation over and over&#8230;

> "The application failed to install. What's wrong?"
> "I'm not sure, what do the log files say?"
> "I haven't checked them yet&#8230;"
> "&#8230;"

<!--more-->

What if we could cut out the expectation that all your support staff has the same unhealthy obsession with log files, and automatically send those log files back to a central location so that we "log nerds" can dive in and troubleshoot things ourselves?!
As it turns out, as always, there is quite a simple way to do this using nothing but PowerShell & Flow.

**A quick word of warning before we dig in:** This is not in by any means the most effective way to consolidate log files. The smartest thing you could do is to start creating your log files in a standardized way so that you can have set up custom Log Analytics within Azure - [there's plenty of reading material around doing this](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/data-sources-custom-logs), and if you are looking to start doing some serious deep diving into your custom logs, I highly recommend spending some time looking into this.

In saying that, sometimes you just need everything in one place to get a better understanding of what's going on. That's where this solution comes into play.

There are two key pieces to this solution:

  1. A serverless HTTP endpoint (web service) to prepare the incoming log files (binaries) and send them to an Azure File Share
  2. A PowerShell function to ingest the log files as soon as they are created

Let's break each of them down.

### Building a web service to handle binaries with Flow

Firstly, a huge thanks has to go out to [John Liu](https://twitter.com/johnnliu) for his great [blog post](http://johnliu.net/blog/2017/7/building-non-json-webservices-with-Flow) that helped me build out the web service. I recommended reading his Microsoft Flow posts as they really shed a lot of light on the advanced features/capabilities that are hidden under the hood.

Let's start with a blank Flow - in **My Flows** select **New**, **Create from blank** and then **Create from blank** again.

We are now going to add a HTTP Request trigger - search for **request** and add the trigger that appears.
We will not be working with the JSON schema in this trigger (as you will see later) but for now, simply put in a placeholder schema shown in the image below and click **New Step** to continue.

[![http request](https://i2.wp.com/i.imgur.com/kLaAVF8.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/kLaAVF8.png?w=1170&#038;ssl=1 "http request")

Search for and add "Compose" - this is where the magic happens! This compose step is what will handle the binary payload - we will be sending the binary files as a **Multipart / Form-Data** format which doesn't adhere to a JSON schema.
Select the Input field and then select Expression. In the Expression field, we are going to type the following:

`base64ToBinary(triggerMultipartBody(0)['$content'])`

The expression may seem complicated, but it's really just grabbing the binary from the request body (sent as a base64 encoded string) and decoding it to a binary object.

I also wanted a way to handle the _metadata_ of the log file - things like the client name or the hostname of the device that sent the file, primarily so I can store the log file in a specific location for easier retrieval.

Create a new step and search for and add **Parse JSON**.
Next, we need to define the JSON data it is going to receive - the easiest way to do that is to create sample JSON payload in PowerShell and paste it in as shown below.

```PowerShell
$payload = [PSCustomObject]@{
    hostName    = "placeholder"
    clientName  = "placeholder"
    appName     = "placeholder"
    logFileName = "placeholder"
}
$payload | ConvertTo-Json | clip
```

The code shown above will copy the JSON object into your clipboard, so back on your Flow, select **Use sample payload** and paste in the JSON object to create the schema required.

Next, select **content** and as done earlier, select **Expression**. In the expression formula field, type the following

`triggerFormDataValue('metadata')`

Basically, we are looking for some form data with the name value &#8216;metadata'. I'll pick this back up in the PowerShell section.

Finally, we are now going to bundle all of the metadata and the binary file and send it off to our storage account.

Select **New Step** and search for / add **Azure Create File**. Once added, you will be asked to create a connection to your storage account.
Give the connection a name, paste in the storage account name and access key, then hit **Create**

Select the folder path in your storage account. (you've got a storage account and file container set up already, yeah????)

[![folder path](https://i0.wp.com/i.imgur.com/bTLYIvG.png?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/bTLYIvG.png?w=1170&#038;ssl=1 "folder path")

Give the file a name - This is where I'm using the metadata to create dynamic folder structures to store the logs where I want them.

[![filename](https://i1.wp.com/i.imgur.com/j5e2u2M.png?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/j5e2u2M.png?w=1170&#038;ssl=1 "filename")

Then just point the file content to the output of the **Compose** and we are done.

[![File content](https://i0.wp.com/i.imgur.com/kltIrPS.png?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/kltIrPS.png?w=1170&#038;ssl=1 "File content")

Make sure you hit save, then go back up to the first step (HTTP request) and copy the **HTTP Post URL**.

Now let's get into the PowerShell fun!

### PowerShell function to send binaries to Flow

Alright - the script has completed successfully (or failed miserably..) and we now want to send the log file up to our storage account. The first thing we need to do is prepare the log file.

```PowerShell
if (Test-Path $inputObject) {
  $fileBytes = [System.IO.File]::ReadAllBytes($inputObject)
  $fileEnc = [System.Text.Encoding]::GetEncoding('UTF-8').GetString($fileBytes)
}
```

Simple enough, stream the file into a variable and encode using some dotNet libraries.

Now, let's build out the request Body - this took me way too long but only because I had no idea how to handle **Multipart / Form-Data** requests. Let my pain help you!

First, let's define a boundary - this will be the literal boundary between all the **parts**. The boundary needs to be a unique value that is not used anywhere else in your request, so in this case, let's use a GUID.

`$boundary = [System.Guid]::NewGuid().ToString()`

Next, we will build out the request body - in retrospect, it's quite simple, it's just:

* Boundary
* Content-Disposition: - basic data on the name of the object you are sending through
* Content-Type: what sort of data are you sending through
* The Content in question
* Boundary

For every additional _part_ that you want to add, you simply add another block of Content-Disposition, Content-Type, Content, Boundary.

Here's my working example - I'm forming two parts - the binary log file & a JSON object containing the metadata I want to send through for naming purposes.

```PowerShell
$lf = "`r`n"
$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"$(split-path $inputObject -leaf)`"; filename=`"$(split-path $inputObject -leaf)`"",
    "Content-Type: application/octet-stream$lf",
    $fileEnc,
    "--$boundary",
    "Content-Disposition: form-data; name=`"MetaData`"",
    "Content-Type: application/json$lf",
    $jsonMetaData,
    "--$boundary--$lf"
) -join $lf
```

A few key things here:

The content type of the encoded log file is Application/Octet-Stream - don't question it. That's how we send the binaries.
In the **Content-Disposition** for the JSON object, I gave it the name "MetaData". This needs to match what we defined as our search term in the Flow app. Feel free to change this, but just remember to update the Flow app to match!.

Finally, we are just going to package everything up and send it off to the Flow web service with an Invoke-WebRequest.

```PowerShell
$req = Invoke-WebRequest -Uri $uri -Method Post -ContentType "multipart/form-data; boundary=`"$boundary`"" -Body $bodyLines
return $req
```

So now we have the basics of our function – let’s set up the metadata and point a log file at the function and see what happens.

```PowerShell
$logFile = "C:\bin\TeamsClient.log"
$metaData = [PSCustomObject]@{
    hostName    = $ENV:ComputerName
    clientName  = "Contoso"
    appName     = "Teams"
    logFileName = "$ENV:ComputerName`_$(Split-Path -Path $logFile -Leaf)"
}
Send-IntuneLogsToFlow -inputObject $logFile -metaData $metaData
```

Checking the Flow app to confirm everything passed&#8230;

[![check the flow app](https://i2.wp.com/i.imgur.com/J5D88rv.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/J5D88rv.png?w=1170&#038;ssl=1 "check the flow app")

And finally - let's make sure the log file was stored in the storage account!

[![Success!](https://i2.wp.com/i.imgur.com/SWYbx01.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/SWYbx01.png?w=1170&#038;ssl=1 "Success!")

Now I can connect to the Azure File Share using SMB3.0 and review all logs as they come down from the client machines without having to ask support or the end user if they have checked the log files!
The best part of this solution is I can use the same Flow app for any client I work with because I am dynamically creating the folder structure thanks to the metadata.

Finally, I've put the PowerShell function up on my [GitHub](https://github.com/tabs-not-spaces/CodeDump/tree/master/Send-IntuneLogsToFlow) as well as below for review.

```PowerShell
function Send-IntuneLogsToFlow {
    param (
        $inputObject,
        $metaData
    )
    $Uri = "https://azure.flow.url.com";
    try {
        $jsonMetaData = $metaData | ConvertTo-Json -Compress
        if (Test-Path $inputObject) {
            $fileBytes = [System.IO.File]::ReadAllBytes("$inputObject")
            $fileEnc = [System.Text.Encoding]::GetEncoding('UTF-8').GetString($fileBytes)
        }
        else {
            throw "Error accessing input object: $inputObject"
        }
        $boundary = [System.Guid]::NewGuid().ToString()
        $lf = "`r`n"
        $bodyLines = (
            "--$boundary",
            "Content-Disposition: form-data; name=`"$(split-path $inputObject -leaf)`"; filename=`"$(split-path $inputObject -leaf)`"",
            "Content-Type: application/octet-stream$lf",
            $fileEnc,
            "--$boundary",
            "Content-Disposition: form-data; name=`"MetaData`"",
            "Content-Type: application/json$lf",
            $jsonMetaData,
            "--$boundary--$lf"
        ) -join $lf
        $req = Invoke-WebRequest -Uri $uri -Method Post -ContentType "multipart/form-data; boundary=`"$boundary`"" -Body $bodyLines
        return $req
    }
    catch {
        Write-Warning $_.Exception.Message
    }
}
```
