Axis DS attachments to OneDrive
===============================

This version:
- Does not load attachment bytes in Get emails (avoids zip payload stalls).
- Composes the attachment name, then checks that the name contains _DS_.
- Downloads only matching zips with Get Attachment (V2).
- Saves to the OneDrive root (/) so a missing folder cannot block Create file.

After a successful test, edit Create file and pick Documents/Axis-DS-Attachments.

Test with Max emails = 1. Cancel any spinning run first.
