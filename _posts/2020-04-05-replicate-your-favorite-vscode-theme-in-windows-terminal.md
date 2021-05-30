---
id: 238
title: Replicate your favorite VSCode theme in Windows Terminal
date: 2020-04-05T14:12:23+10:00
author: Ben
layout: post
guid: http://powers-hell.com/?p=238
permalink: /2020/04/05/replicate-your-favorite-vscode-theme-in-windows-terminal/
views:
  - "5835"
image: /assets/images/2020/04/install-vscodetheme.gif
categories:
  - Powershell
  - VSCode
  - Windows Terminal
tags:
  - Customization
  - VSCode
---
[Windows Terminal](https://aka.ms/windowsterminal) has been out for around 6 months now and it's safe to say it's a huge success.  
It's a great way to handle working with multiple terminal applications in one space, and the ability to customize the environment to suit your needs (both aesthetic and functional) make it a perfect tool for anyone who lives in a shell environment for hours on end.

I was recently tagged in a discussion on twitter around customization of Terminal where someone said "If there was a VSCode -> WT Theme converter, that would be the best".

Challenge accepted, [Mr. Rayner](https://twitter.com/MrThomasRayner)!

The first thing we need to do is understand how color schemes work in Windows Terminal and then see if we can identify any matching traits in the theme extensions of VSCode.  
  


Luckily, Windows Terminal is an [opensource solution](https://github.com/microsoft/terminal) and has excellent documentation. We need to know the schema of the "profiles.json" file that houses all of our customization, [which can be found here](https://github.com/microsoft/terminal/blob/master/doc/cascadia/SettingsSchema.md). Let's take a look at the "schemes" properties below.

<table class="wp-block-table">
  <tr>
    <td>
      <strong>Property</strong>
    </td>
    
    <td>
      <strong>Necessity</strong>
    </td>
    
    <td>
      <strong>Type</strong>
    </td>
    
    <td>
      <strong>Description</strong>
    </td>
  </tr>
  
  <tr>
    <td>
      <code>name</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Name of the color scheme.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>foreground</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the foreground color of the color scheme.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>background</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the background color of the color scheme.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>selectionBackground</code>
    </td>
    
    <td>
      Optional
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the selection background color of the color scheme.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>cursorColor</code>
    </td>
    
    <td>
      Optional
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the cursor color of the color scheme.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>black</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI black.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>blue</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI blue.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>brightBlack</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI bright black.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>brightBlue</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI bright blue.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>brightCyan</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI bright cyan.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>brightGreen</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI bright green.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>brightPurple</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI bright purple.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>brightRed</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI bright red.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>brightWhite</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI bright white.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>brightYellow</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI bright yellow.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>cyan</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI cyan.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>green</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI green.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>purple</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI purple.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>red</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI red.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>white</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI white.
    </td>
  </tr>
  
  <tr>
    <td>
      <code>yellow</code>
    </td>
    
    <td>
      <em>Required</em>
    </td>
    
    <td>
      String
    </td>
    
    <td>
      Sets the color used as ANSI yellow.
    </td>
  </tr>
</table>

As you can see, there's not a lot to a color scheme in Windows Terminal - we just need to define the base ANSI colors, give it a name and we should be in business. Let's move over to VSCode and have a look at some themes. For now let's focus only on the "required" fields.

For this demo, I'm going to use two well known themes that are available to install from the VSCode extension library - [Monokai Pro](https://marketplace.visualstudio.com/items?itemName=monokai.theme-monokai-pro-vscode) & [Material Theme](https://marketplace.visualstudio.com/items?itemName=Equinusocio.vsc-material-theme). If you haven't tried either of them out, stop what you are doing and give them a whirl. I personally cannot recommend Monokai Pro enough.

Installed extensions all live in the userprofile: `%userprofile%\.vscode\extensions`

So, with the two extensions installed on your system, we should see them both at the following paths:  


  * $env:UserProfile\.vscode\extensions\monokai.theme-monokai-pro-vscode-1.1.15
  * $env:UserProfile \.vscode\extensions\equinusocio.vsc-material-theme-32.5.0
  * 

Now, I've done the heavy lifting for all of you, so we don't need to go too in depth with how themes work (but if you are interested, there are plenty of resources that can [shed some light on the subject](https://medium.com/@caludio/how-to-write-a-visual-studio-code-color-theme-from-scratch-7ccb7e5da2aa)).

  
Let's just summarize everything down to two key files:

  * Package.json - which contains the metadata of the extension and the details of the theme & the location of the theme.json configuration file..
  * \*theme\*.json - contains all of the color configurations and properties for the theme.

If we use the example of the Monokai Pro theme as an example, we can open up the Package.json file, and look for the "themes" attribute, which shows the multiple themes available within this extension.

<img loading="lazy" width="1024" height="846" src="/assets/images/2020/04/image-1024x846.png" alt="" class="wp-image-247" srcset="/assets/images/2020/04/image-1024x846.png 1024w, /assets/images/2020/04/image-300x248.png 300w, /assets/images/2020/04/image-768x635.png 768w, /assets/images/2020/04/image.png 1107w" sizes="(max-width: 1024px) 100vw, 1024px" /> <figcaption>  
</figcaption> 

If we use the relative path of the first theme to open up the configuration file, we can then see every possible configurable attribute of the theme - this example in particular is over 1,200 lines of config, so you can see there is a lot of customisation available in VSCode!

Let's make this easier and do a search for the ANSI colors we know we need for our Windows Terminal theme..

[![ANSI Colours](/assets/images/2020/04/image-1.png)](/assets/images/2020/04/image-1.png "ANSI Colours")  

Looking good so far. All of the ANSI colors we need for Windows Terminal seem to exist within our theme, with the notable exception of Purple.  
For brevity, just understand that Magenta in VSCode refers to Purple in Windows Terminal.

Now that we know that we can assume that all themes \*should\* contain the properties we require, we can get down to writing a script in PowerShell to transpose them into a format that we need!

First, let's grab all the theme attributes from VSCode.

This is fairly simple - we are providing the path to our theme extension to the function, which is then using the package.json file to capture the theme config paths and extracting the required ANSI attributes into a digestible PSCustomObject. If we run the above code against our Monokai Pro theme, we should get some nice data back..

[![Get-VSCodeTheme](/assets/images/2020/04/get-vscodetheme.gif)](/assets/images/2020/04/get-vscodetheme.gif "Get-VSCodeTheme")

Now that we have a simple way to extract the data we need from our VSCode theme extension, we now just need to build a solution to programmatically insert it into our Windows Terminal profile.

Thankfully for me, there is already a great module created to allow easy access to the Windows Theme profile through PowerShell - [MSTerminalSettings](https://www.powershellgallery.com/packages/MSTerminalSettings/1.1.54-pre) so let's not reinvent the wheel and just install this onto our machine.

Now we have our pre-required module installed, let's polish up the data we grabbed from VSCode and send it to our Windows Terminal profile.

Again, what we are doing here is fairly simple - We are "splatting" out our parameters that we want to send to the cmdlet "New-MSTerminalColorScheme".  
In the unlikely scenario that one of the color attributes is not present in the theme of your choice, we need to omit that parameter from our "splatted" hashtable.  
In the Material theme I found that two of the "required parameters" - Foreground and Background were missing. This is something to be aware of, but for now, omitting them allows us to move ahead.

So now, let's put the two functions together and step through the process.

  * We call "Get-VSCodeTheme" with the path of our extension and store it in the $themes variable.
  * We send the $themes variable to "Out-GridView" to select which theme we want to export and store the data in the $theme variable.
  * We call "Import-VSCodeThemeToTerminal" with the chosen theme.
  * Finally, we set the name of our default color scheme in our Windows Terminal settings file "Profile.json"

[![Install VSCode Theme](/assets/images/2020/04/install-vscodetheme.gif)](/assets/images/2020/04/install-vscodetheme.gif "Install VSCode Theme") 

And that's it!  
I cannot guarantee that this will work for every theme in the VSCode extension library, but after testing it against a few of the more popular themes, I'm fairly happy with the strike rate.

I'm genuinely curious as to whether this is of use to any of you, so please, if you find yourself using this successfully (or unsuccessfully) please let me know on [twitter](https://twitter.com/powers_hell).

As always, code for this post is available on my [GitHub](https://github.com/tabs-not-spaces/CodeDump/tree/master/Import-VSCodeThemeToTerminal).

— Ben

— P.S. Yes, the colortest script I'm running is awesome.  
I didn't come up with it myself. Go and [check out the gist here](https://gist.github.com/timabell/cc9ca76964b59b2a54e91bda3665499e) and make sure to follow [Tim on twitter](https://twitter.com/tim_abell).