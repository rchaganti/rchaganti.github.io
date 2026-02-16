# PowerShell script to download and install Azure CLI


Whenever I have to build a new development machine or VM, I usually go about installing a few development tools and command line tools that I use quite often. One such tool is the [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/). 

There are many alternatives for installing Azure CLI as a part of build process but what I use is this PowerShell script.

```powershell
[CmdletBinding()]
param
(

)
$InformationPreference = 'Continue'

# Verify that the script is running as administrator
if ([bool](([System.Security.Principal.WindowsIdentity]::GetCurrent()).groups -match 'S-1-5-32-544'))
{
    # Download Azure CLI MSI package
    $uri = 'https://aka.ms/installazurecliwindows'
    $request = Invoke-WebRequest -UseBasicParsing -Uri $uri -MaximumRedirection 0 -ErrorAction Ignore

    if(($request.StatusCode -ge 300) -and ($request.StatusCode -lt 400))
    {
       $location = $request.Headers.Location
       $fileName = Split-Path -Path $location -Leaf
       $cliVersion = $fileName.Split('-')[2].trim('.msi')
       $downloadPath = "${env:Temp}\$fileName"

       Write-Information -Message ("Downloading Azure CLI version {0} to {1}" -f $cliVersion, $downloadPath)
       Invoke-WebRequest -UseBasicParsing -Uri $location -OutFile $downloadPath -ErrorAction SilentlyContinue -Verbose:$false
       if (Test-Path -Path $downloadPath)
       {
            Write-Information -Message ("Installing Azure CLI version {0} from {1}" -f $cliVersion, $downloadPath)
            #Start-Process -FilePath msiexec.exe -ArgumentList "/i $downloadPath /qb /passive" -Wait -ErrorAction Stop -Verbose:$false

            Write-Information -Message ("Remove Azure CLI installer file from {0}" -f $downloadPath)
            Remove-Item -Path $downloadPath -Force
       }
    }
    else
    {
        throw 'Cloud not retrieve the redirected URL'
    }
}
else
{
    throw 'This must run as administrator at an elevated PowerShell prompt.'
}
```

This script downloads the most recent public build and installs it.
