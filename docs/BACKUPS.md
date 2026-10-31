# Independent backups to Google Drive

Owner choice, 31 October 2026: remain on Supabase Free and use encrypted independent backups in an existing Google Drive account. No paid upgrade authorised.

Status: implementation prepared, not connected or running. No production backup or restore drill has been completed. Do not call this protected until the activation checks below pass.

## What runs

The `Encrypted Google Drive backup` workflow runs at approximately 06:23 Singapore time daily once enabled. It runs on a temporary GitHub runner, independently of the owner's Mac. Export database roles, application schema and data (including auth and Storage metadata), and applied migration history through the official Supabase CLI. Download all Storage objects separately. Pack a checksum inventory and encrypt with an age public key before any upload. Upload only the encrypted archive to `Sprouttie Backups/xqwrfbyqhuxveoqksuqz` in the chosen Drive. Download it again and compare its hash. After a successful verification, expire only generated snapshots older than seven days in that dedicated folder. Expiration permanently deletes these expired backup files rather than leaving personal data in Drive trash.

The owner's recovery private key stays outside GitHub. The job gets only its public encryption recipient. Losing the private key makes backups unrecoverable.

Three Storage buckets were checked on 31 October: pronunciations, insight-photos and spoken-word-videos. All were empty. The app nevertheless has paths that save photos and videos. Do not remove media from backup coverage until those features are changed and existing objects are accounted for.

## One-time connection

Technical partner performs this setup with the owner. Do not request passwords, refresh tokens or recovery keys in chat.

1. On the owner's computer install age and rclone from official releases. Run `age-keygen -o sprouttie-recovery-key.txt` in a private directory outside Git. Keep the private key in the owner's password manager and a separate secure recovery copy. The printed `age1...` recipient is public.
2. Create a dedicated Google OAuth desktop client with Drive API enabled, following https://rclone.org/drive/#making-your-own-client-id. Avoid the retired shared rclone client. For a personal external OAuth application, leave testing mode before relying on unattended refresh tokens; testing-mode tokens can expire. Have the owner approve the actual Google connection.
3. Use `rclone config` to create a remote named `gdrive`, type `drive`, scope `drive.file`, using that client. This scope accesses files created by that app, not the owner's other Drive files. Do not use full-drive scope. Let rclone create the new private backup folder. Confirm its sharing is Restricted.
4. Put the following in repository Actions secrets using the GitHub settings UI, never source files: `BACKUP_RCLONE_CONFIG` (only this dedicated remote), `BACKUP_AGE_RECIPIENT` (public recipient), `BACKUP_DATABASE_URL` (live project's direct or session-pooler URL, port 5432, with sslmode=require), and `BACKUP_STORAGE_KEY` (server-side secret key for the live project). Use existing credentials securely; do not reset the production password just to obtain it.
5. Run the workflow manually before enabling its schedule. It should fail clearly when any setting is missing. No backup files are ever attached as GitHub artifacts because the repository is public. Restrict who can edit workflow code or repository secrets. Do not enable untrusted workflows with these credentials.

## Activation evidence

- A manual run finishes successfully and its encrypted archive appears in the owner's intended private Drive account.
- Download that archive locally. Decrypt with `age --decrypt --identity sprouttie-recovery-key.txt --output snapshot.tar.gz ARCHIVE.tar.gz.age`, in a private temporary directory. Run `python3 scripts/backups/verify.py snapshot.tar.gz`. This checks inventory and content hashes; it does not prove the database can be restored.
- Restore into a separate disposable Supabase project, never the live project. Follow the current Supabase CLI restore guide: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore. Use roles.sql, schema.sql and data.sql in a single transaction with ON_ERROR_STOP. Restore migration history separately from its two exports. Review target managed schema/version compatibility first. Re-upload the media identified in storage.json through the Storage API, preserving bucket visibility, MIME type and original object names. Do not assume SQL metadata alone restores files.
- Compare auth-user and all application-table counts with the restored dump, sample custom cards and progress, and open sample media if any exists. Check RLS, profile/card guards and sign-in with a disposable test account. Existing users may need to sign in again after recovery.
- Confirm failed-workflow notifications actually arrive. Then set Actions variable `BACKUPS_ENABLED=true` and observe the next scheduled run. A successful GitHub run and a Drive download do not substitute for the restore drill.

## Limits and ongoing care

Daily backups can lose roughly 24 hours of changes, longer after failed or delayed runs. Sequential exports and media downloads are not one atomic snapshot. Changes during a backup may need reconciliation on restore. GitHub schedules are best effort; in public repositories scheduled workflows can be disabled after 60 days without repository activity. A separate freshness monitor and tested alert destination are still needed before claiming unattended monitoring is complete.

Google Drive quota and Supabase download allowance are consumed; this is not a promise of zero cost at all sizes. Review retention against usage and privacy requirements. Deleted user data may remain in encrypted snapshots until they expire and must not be reintroduced into active use after recovery.

Provider settings, API secrets, Google OAuth, SMTP, DNS and Stripe billing are not restored by this archive. App and edge-function source remains in Git. Record provider configuration privately and reconcile billing directly with Stripe after recovery.

No restore script automatically writes to production. Never upload decrypted exports or private keys to this public repository or Actions artifacts.
