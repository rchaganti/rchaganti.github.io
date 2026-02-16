# Monitoring Volume Change Events in PowerShell using WMI


While I was preparing a few demo scripts for a Bangalore IT Pro UG meet session, I tumbled upon on WMI event class Win32_VolumeChangeEvent. This one is interesting. It is derived from Win32_DeviceChangeEvent class and gives us the ability to monitor local drive events directly.For example, you can get a notification when a local drive or mount point gets removed or added. The following table shows a list of event types we can monitor.

**Note**: This class may not be there on Windows XP. I have not verified this fact.

| Value |        Meaning        |
| :---: | :-------------------: |
|   1   | Configuration Changed |
|   2   |    Device Arrival     |
|   3   |    Device Removal     |
|   4   |        Docking        |

Let us see a few examples:

#### Adding a new local drive

We can monitor a local drive addition using the following query:

```
$query = "SELECT * FROM Win32_VolumeChangeEvent WHERE EventType=2"
```

Using this, you can monitor removable drives such as external hard drives and flash drives.

####  Removal of a local drive

To monitor the removal of local drive events, we can use the following query:

```
$query = "SELECT * FROM Win32_VolumeChangeEvent WHERE EventType=3"
```

#### Registering for the above events

```
#Query for finding all device arrival events
$query = "SELECT * FROM Win32_VolumeChangeEvent WHERE EventType=2"            

#Register an event subscription
Register-WmiEvent -Query $query -Action {
    $volumeName = (Get-WMIObject -Class Win32_LogicalDisk -Filter "DeviceID='$($Event.SourceEventArgs.NewEvent.DriveName)'").VolumeName
    Write-Host "$($Event.SourceEventArgs.NewEvent.DriveName) ($($volumeName)) was added"
} | Out-Null            

#Query for finding all device Removal events
$query = "SELECT * FROM Win32_VolumeChangeEvent WHERE EventType=3"            

#Register an event subscription
Register-WmiEvent -Query $query -Action {
    Write-Host "$($Event.SourceEventArgs.NewEvent.DriveName) was removed"
} | Out-Null
```

Once we have these event registrations done, we can test this by connecting or disconnecting a local drive such as a USB flash drive.

Now, let us see a “real-world” application of these events and how we can use that to create a simple script to backup some files automatically whenever a USB flash drive gets added. Here is the script to do that:

```
Function Backup-ScriptFolder {
    Param ([string]$backupDrive,[string]$scriptFolder)
    $backupFolder = "$($backupDrive)\Backup-$(Get-Date -Format MM-dd-yyyy-hh-mm)"
    try {
        New-Item -type directory -Path $backupFolder -Force
    }
    catch {
        $_
        return
    }
    try {
        copy-item $scriptFolder -destination $backupFolder -recurse -Verbose
    }
    catch {
        $_
    }
}                

#Query for finding all device arrival events
$query = "SELECT * FROM Win32_VolumeChangeEvent WHERE EventType=2"            

#Register an event subscription
Register-WmiEvent -Query $query -Action {
    $volumeName = (Get-WMIObject -Class Win32_LogicalDisk -Filter "DeviceID='$($Event.SourceEventArgs.NewEvent.DriveName)'").VolumeName
    #Write-Host "$($Event.SourceEventArgs.NewEvent.DriveName) ($($volumeName)) was added"
    if ($volumeName -eq "BACKUPDRIVE") {
        Write-Host "Starting file copy.."
        Backup-ScriptFolder -backupdrive $Event.SourceEventArgs.NewEvent.DriveName -ScriptFolder "C:\Dropbox\Scripts"
    }
} | Out-Null
```

If you see the above code, I have a simple function *Backup-ScriptFolder* that is called within the events -Action script block. I am calling this function only when the newly added local drive has the volume name “BACKUPDRIVE”. This is to make sure I don’t make multiple copies of my backup on unnecessary drives.

Now, when I add a new USB flash drive or any external hard drive with a volume name “BACKUPDRIVE”, all files from the specified folder just get copied to the newly added drive under a new folder. In the *Backup-ScriptFolder* function, *-BackupDrive* is the newly added drive letter and *-ScriptFolder* is the folder you want backup.

This is a very basic implementation. You can easily extend it by adding a pretty progress bar and other features.

**Note**: Register-WMIEvent creates a temporary event consumer. Hence, the event notifications won’t be available if we close the PowerShell host. If you want to have a permanent event registration,  use [PowerEvents ](http://powerevents.codeplex.com/)module to make your life easy.

Here is a video that shows this script in action!
{{<youtube "X0EO-tFhsWc">}}
