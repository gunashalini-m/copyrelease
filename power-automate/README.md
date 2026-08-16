# Axis DS attachments — Power Automate package

**Download:** [Axis-DS-attachments-to-OneDrive.zip](./Axis-DS-attachments-to-OneDrive.zip)

Direct: https://github.com/gunashalini-m/copyrelease/raw/cursor/axis-ds-power-automate-package-e73a/power-automate/Axis-DS-attachments-to-OneDrive.zip

## Yes — create the OneDrive folder first

Create file does **not** create folders. In OneDrive for Business:

1. Open OneDrive (work account).
2. Go to **Documents** (or **My files**).
3. **New → Folder** named `Axis-DS-Attachments`.

After import, open both **Create file** actions and pick that folder with the folder picker.

## Import

**My flows → Import → Import Package (Legacy)** (not Solutions). Create as new. Map Outlook and OneDrive.

Then **cancel** any run that has been spinning for an hour. **Test** with **Max emails = 1**. Do not Resubmit the stuck run.
