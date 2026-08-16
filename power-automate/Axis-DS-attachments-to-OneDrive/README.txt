Axis DS attachments to OneDrive (fixed)
=====================================

What went wrong
---------------
Get emails already finished in a few seconds. The run then sat on
Get Attachment (V2) for an hour because:

1. Include Attachments was Yes, so file bytes were already on the email.
   Calling Get Attachment (V2) downloads the same file again and often stalls.
2. Create file used base64ToBinary() on those bytes, which can freeze the action.
3. Pagination (5000) was enabled and is not needed for a 10-email test.
4. If /Documents/Axis-DS-Attachments does not exist, Create file cannot finish.

Fix in this package
-------------------
- Uses attachment contentBytes from Get emails when present (no extra download).
- Calls Get Attachment (V2) only if contentBytes is empty, with a 1-minute timeout.
- Create file writes contentBytes directly (no base64ToBinary).
- Max emails is a run-time input (use 1 while testing).
- Loops run one at a time.

Do I need a OneDrive folder?
----------------------------
Yes. Create file does not create parent folders.

In OneDrive for Business (work account):
1. Open https://onedrive.live.com or office.com -> OneDrive
   (or https://<tenant>-my.sharepoint.com)
2. Open Documents (or My files).
3. New -> Folder -> name it exactly: Axis-DS-Attachments

Full path expected by the flow: /Documents/Axis-DS-Attachments

If Documents is not visible, create Axis-DS-Attachments at My files root
and after import change Create file Folder Path with the folder picker.

How to import
-------------
My flows -> Import -> Import Package (Legacy) -> this zip -> Create as new.
Map Outlook and OneDrive for Business.

After import
------------
1. Cancel the stuck run (run history -> Cancel).
2. Confirm the OneDrive folder exists.
3. Edit Get emails -> re-select Inbox/Axis.
4. Edit both Create file actions -> pick Axis-DS-Attachments with the folder icon
   (do not leave a typed path).
5. Save. Test with Max emails = 1.

Do not click Resubmit on the old hour-long run. Start a new Test.


If a run succeeds but no file appears
-------------------------------------
Condition DS attachment True means the name matched _DS_.
Create file must sit directly under that True branch.
Do not keep Condition has content / Get Attachment for the test path.
Pick the OneDrive folder with the folder picker.
