Axis DS attachments to OneDrive
================================

What this flow does
-------------------
Manual run. You enter Start date and End date (IST calendar days).
It reads Inbox/Axis (no subfolders), skips mail with no attachments,
keeps files whose names contain _DS_, and saves them to OneDrive for
Business using the original file names.

Start = Start date 00:00 IST
End   = End date 23:50 IST

Example: 01-08-2026 to 03-08-2026 = 1 Aug 00:00 IST through 3 Aug 23:50 IST.

How to import
-------------
1. Go to https://make.powerautomate.com
2. My flows -> Import -> Import Package (Legacy)
   (Do not use Solutions import; this is not a Dataverse solution.)
3. Upload this zip file.
4. Import setup for the flow: Create as new.
5. Related resources: select or create
   - Office 365 Outlook (the mailbox that has Inbox/Axis)
   - OneDrive for Business (work account)
6. Import.

After import (required)
-----------------------
1. Open the flow and turn it Off until you finish these checks.
2. Get emails (V3): re-select Folder = Inbox -> Axis
   (do not leave Inbox).
3. Create file: re-select Folder Path to your OneDrive folder
   (default in the package is /Documents/Axis-DS-Attachments).
   Create that folder in OneDrive first if it does not exist.
4. Flow settings -> Time zone:
   (UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi
5. Save, then Test -> Manually.
   Start date: 01-08-2026
   End date:   03-08-2026
   (Your account uses English (India) DD-MM-YYYY.)

Loop order (do not invert)
--------------------------
Get emails
  -> Filter by received IST range
  -> For each email          (body/value of the filter)
       -> For each attachment (Attachments of the current email)
            -> Condition name contains _DS_ and not inline
                 -> Get Attachment (V2)
                 -> Create file

If import fails
---------------
Use Import Package (Legacy), not solution import.
Zip must contain manifest.json next to the Microsoft.Flow folder
(no extra parent folder). Re-download this package; do not re-zip
only an inner folder.
