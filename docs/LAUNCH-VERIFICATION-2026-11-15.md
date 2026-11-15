# Launch verification: 15 November 2026

## Implemented and deployed

- generate-autopilot-suggestions version 36 requires separate Chinese, tone-marked pinyin and English fields for Mandarin. Incomplete output is rejected before saved suggestions are replaced. The stored display string remains compatible with existing clients. JWT verification remains enabled.
- recommend-books version 26 restricts practice words to the supplied vocabulary and permits zero matches. JWT verification remains enabled.
- Repaired 46 blank Chinese-card English meanings using scripts/maintenance/fill-empty-card-meanings.sql. No blank Chinese meanings remain at verification time. All 85 previously populated back/pinyin pairs have the same checksum before and after: 85ed9d38634dadbe13dd740ecbce1537. Fronts were not changed.

## Tested

- 26 Node regression tests pass; eight backup tests pass; production build passes.
- Earlier live test: ten onboarding cards saved in two sets; practice round and a fictional spoken-word entry survive refresh; six-page duplex PDF downloaded; print quota decremented once; six books generated within 29 seconds and restored on reopening.
- Phone-width Chrome test at 393px: dashboard, Books and two-item account menu render. This is not actual iPhone Safari/touch verification.

## Prepared locally, not published

- Full Unicode book title plus author searches; practice-vocabulary wording and disclaimer.
- Explicit structured fields in initial card creation; block starting a Mandarin plan with blank English meanings.
- Controlled workflow_dispatch alert_test option in health.yml. This intentionally fails only the workflow, without interrupting production. Receipt is not verified.
- GitHub push was blocked by automatic approval review, which requested explicit permission to transmit changed project files to the existing public GitHub repository. No alternate publishing route was used.

## Still open

- Publish frontend and controlled alert-test workflow; verify deployment.
- Live word swap and sign-out/sign-in persistence test. Chrome automation timed out during this session.
- Initial generation latency was not measured because onboarding completed before the browser connection.
- Actual iPhone Safari check by owner.
- Failure-notification inbox receipt.
- Scheduled backups remain skipped: latest scheduled runs on 13, 14 and 15 November were skipped. The workflow condition requires BACKUPS_ENABLED=true. Check credentials and run a successful manual backup before enabling the gate. Prior owner-confirmed restore work is retained; no production restore was attempted.

Latest service records:
- Health success: https://github.com/LittleGreenNest/sprouttie-app-lovable/actions/runs/43670772926
- Backup skipped: https://github.com/LittleGreenNest/sprouttie-app-lovable/actions/runs/43665613445
