---
layout: post
title: Calculate & Validate MD5 hashes on Azure blob storage files with PowerShell
titlecolor: pink
date: 2021-12-31 00:39 +0000
id: 031
author: Ben
views: 0
image: /assets/images/2021/12/getremotehashmatch.gif
categories:
- PowerShell
- Azure
- Automation
tags:
- PowerShell
- Azure
- Automation
---

I was recently asked to implement a solution to verify the integrity of a file stored in an Azure blob storage container. What started out as a frustrating task ended up being a really cool solution that I wanted to share with everyone!

<!--more-->

The obvious answer to this task is to compare a known file hash value against the actual file. This is fairly trivial to do with PowerShell.

```PowerShell
Get-FileHash -Path C:\PathToYour\File.ext -Algorithm MD5
```

Running the above command will return the computed file hash of whatever you point it at. Comparing it to a known file hash will confirm if the file has been altered / corrupted in any way.

[![Get-FileHash](/assets/images/2021/12/getfilehash.gif)](/assets/images/2021/12/getfilehash.gif "Get-FileHash")

Here, I've run the command against a simple text file and have made a note of the file hash.

Simple, right?

Now, let's go ahead and upload the same file to an Azure storage account. 

When you do this from the portal, a file hash is automatically computed and stored as an exposable piece of metadata against the file. In theory, knowing that nothing about the file has changed, the hash we computed locally should match the hash computed in Azure.

[![content-md5](/assets/images/2021/12/contentmd5.png)](/assets/images/2021/12/contentmd5.png "content-md5")

HANG ON A SECOND.. those two MD5 hash values don't match! Did something happen during the upload process? Was the file corrupted?

Not at all, thankfully! 

Azure stores the file hash value in the **CONTENT-MD5** tag as a **base64 encoded representation of the binary MD5 hash value**, whereas when we compute the MD5 value locally, the output of the hash is a **hex representation of the binary hash value**...

[![WHAT????](/assets/images/2021/12/what.webp)](/assets/images/2021/12/what.webp "WHAT????")

Don't worry if that flew over your head. The simple answer it is IS technically the same value, we just need to figure out how to "de hex" the result from our initial PowerShell command and convert it to a base64 string.

Thankfully, this is a fairly trivial process and I've found a [great article](https://galdin.dev/blog/md5-has-checks-on-azure-blob-storage-files/) written by [Galdin Raphael](https://twitter.com/gldraphael) discussing the EXACT situation I found myself facing. The only issue was that the code and tools mentioned in the article were for *nix environments..

If we look at the solution proposed by Galdin, for anyone not experienced in using *nix based tools, it can look a little confusing..

```bash
md5sum --binary $filename | awk '{print $1}' | xxd -p -r | base64
```

It is infact very simple. Let's split each command out at the pipe and look at what's happening.

|command                        |Explanation|
|---                            |---|
|```md5sum --binary $filename```| This is the same result as running ```Get-FileHash```. <br />This will return our hex representation of the MD5 hash|
|```awk '{print $1}'```         | This is just stripping out everything except for the hash.|
|```xxd -p -r```                | This command is doing a "reverse" hex dump and outputting<br /> the result in plain text (Converting back FROM hex to binary). |
|```base64```                   | This command is encoding the binary result into base64|

So now we know how to functionally do this, let's write it out in PowerShell!

```PowerShell
function Get-ComputedMD5 {
    [cmdletbinding()]
    param (
        [parameter(Mandatory = $true)]
        [System.IO.FileInfo]$FilePath
    )
    try {
        $rawMD5 = (Get-FileHash -Path $FilePath -Algorithm MD5).Hash
        $hashBytes = [system.convert]::FromHexString($rawMD5)
        return [system.convert]::ToBase64String($hashBytes)
    }
    catch {
        Write-Warning $_.Exception.Message
    }
}
```

Pretty simple, isn't it?!

Now that we know *how* to reencode the file hashes, let's look at how we could implement this in a real world scenario.

## Verify the file hash is the same AFTER download

This example will use the ```Get-ComputedMD5``` example from above to grab the MD5 hash from the storage container, download the file and confirm the local file hash matches the remote hash. If there is any mismatch during the download, we will delete the file.

```PowerShell
function Get-RemoteFileAndConfirmHashValidationLocally {
    [cmdletbinding()]
    param (
        [parameter(Mandatory = $true)]
        [uri]$FileUrl,

        [parameter(Mandatory = $true)]
        [System.IO.FileInfo]$OutputFolder
    )

    try {
        $fileDownload = Invoke-WebRequest -Method Get -Uri $FileUrl
        if ($fileDownload.StatusCode -ne 200) { throw [System.Net.WebException]::new('Failed to download content') }
        $fileDownload.Content | Out-File "$OutputFolder\$($FileUrl.Segments[-1])"
        $localHash = Get-ComputedMD5 -FilePath "$OutputFolder\$($FileUrl.Segments[-1])"
        if ($localHash -ne $fileDownload.Headers['Content-MD5']) {throw [System.Net.WebException]::new('hash mismatch.')}
    }
    catch [System.Net.WebException] {
        Write-Warning $_.Exception.Message
        Remove-Item -Path "$OutputFolder\$($FileUrl.Segments[-1])"
    }
    catch {
        Write-Warning $_.Exception.Message
    }
}
```

---

## BONUS ROUND: Verify the file hash is the same BEFORE download

This example doesn't compute the hash, but assumes you already have the MD5 hash and simply want to make sure the file in the storage container matches.  
A great way to confirm remote content hasn't been tampered with!

```PowerShell
function Get-RemoteFileIfHashIsKnown {
    [cmdletbinding()]
    param (
        [parameter(Mandatory = $true)]
        [uri]$FileUrl,

        [parameter(Mandatory = $true)]
        [string]$MD5,

        [parameter(Mandatory = $true)]
        [System.IO.FileInfo]$OutputFolder
    )
    try {
        $hashCheck = Invoke-WebRequest -Method Head -Uri $FileUrl
        if ($hashCheck.StatusCode -ne 200) { throw [System.Net.WebException]::new('Failed to get header content.') }

        Write-Host "Remote Hash: " -ForegroundColor Cyan -NoNewline
        Write-Host "$($hashCheck.Headers['Content-MD5'])" -ForegroundColor Green
        Write-Host "Known Hash: " -ForegroundColor Cyan -NoNewline
        Write-Host "$($MD5)" -ForegroundColor $(($hashCheck.Headers['Content-MD5'] -ne $MD5) ? "red" : "green")

        if ($hashCheck.Headers['Content-MD5'] -ne $MD5) { throw [System.Net.WebException]::new("hash mismatch") }

        Invoke-RestMethod -Method Get -Uri $FileUrl -OutFile "$OutputFolder\$($FileUrl.Segments[-1])"
    }
    catch {
        Write-Warning $_.Exception.Message
    }
}
```

---

Thanks for sticking around for this one. I had a lot of fun figuring this out, and I hope it helps others out!

As always, code referenced in this post is available on [GitHub]("").

For all of you that are lucky enough to get time off, have a safe break & I'll see you all again for a hopefully MUCH better 2022.

— Ben