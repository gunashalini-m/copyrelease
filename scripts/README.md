# Save Axis DS attachments with Microsoft Graph + PowerShell

Works with **Outlook on the web** and **OneDrive for Business on the web**. No desktop Outlook or OneDrive sync client.

## One-time setup

1. On your Windows PC, install **PowerShell 7**: https://aka.ms/powershell
2. Open **PowerShell 7** (not Windows PowerShell 5).
3. Install the Graph sign-in module (once):

```powershell
Install-Module Microsoft.Graph.Authentication -Scope CurrentUser
```

Answer **Yes** to the NuGet and repository prompts.

4. In the **OneDrive website**, create folder  
   **My files → Documents → Axis-DS-Attachments**  
   (the script also tries to create it if missing).

5. Download `Save-AxisDsAttachments.ps1` from this folder.

6. If scripts are blocked:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## Each time you run it

```powershell
cd <folder-that-has-the-script>

.\Save-AxisDsAttachments.ps1 -StartDate '2026-08-01' -EndDate '2026-08-03'
```

A browser window opens. Sign in with the **same work account** that has Inbox → Axis and OneDrive.

First run: accept **Mail.Read**, **Files.ReadWrite**, and **User.Read**. If consent is blocked, an admin must allow those permissions.

Test with a cap:

```powershell
.\Save-AxisDsAttachments.ps1 -StartDate '2026-08-01' -EndDate '2026-08-03' -MaxEmails 5
```

Then refresh OneDrive in the browser. Files keep their original names (including `.zip`).

Dates are **IST**: start 00:00 on StartDate, end **23:50** on EndDate. Only **Inbox/Axis** (no subfolders). Only attachments whose names contain `_DS_` or `DS`. Inline images are skipped.

## If it fails

| Message | What to do |
|---|---|
| Could not find mail folder Axis | Folder must be **Inbox → Axis**, same mailbox you signed in with |
| Access denied / admin consent | Ask IT to allow Mail.Read and Files.ReadWrite |
| Could not create folder | Create `Documents/Axis-DS-Attachments` in the OneDrive website, re-run |
| Install-Module not found | You are in Windows PowerShell 5; open **pwsh** (PowerShell 7) |
