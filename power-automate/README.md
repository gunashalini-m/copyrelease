# Axis DS attachments — Power Automate package

Download **[Axis-DS-attachments-to-OneDrive.zip](./Axis-DS-attachments-to-OneDrive.zip)** from this folder (GitHub: open the file, then **Download**).

## Import

1. Open [Power Automate](https://make.powerautomate.com).
2. **My flows** → **Import** → **Import Package (Legacy)**.
3. Upload `Axis-DS-attachments-to-OneDrive.zip`.
4. Set the flow to **Create as new**.
5. Map **Office 365 Outlook** and **OneDrive for Business** connections.
6. **Import**.

After import, re-select **Inbox → Axis** on Get emails, re-select the OneDrive folder on Create file, set the flow time zone to **(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi**, then run with Start/End dates.

Full notes are in `Axis-DS-attachments-to-OneDrive/README.txt`.
