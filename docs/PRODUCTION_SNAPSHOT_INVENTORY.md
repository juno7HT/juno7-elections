# Production Snapshot Inventory

Snapshot UTC date: 2026-07-16T02:22:55Z

Production path: /home/juno7admin/apps/juno7-elections

Snapshot branch: stabilisation/snapshot-production-2026-07-16

## Active Files Preserved

The following files were copied from the production worktree because they are currently active application files on disk:

- index.js
- frontend/admin.html
- frontend/communes.html
- frontend/index.html

## Prototypes Preserved

The following untracked prototype files were preserved for later review. They are not official production interfaces:

- frontend/admin-modern.html
- frontend/admin-report.html
- frontend/home-2026.html
- frontend/report.html

## Excluded Backup Files

Backup, dated, old, broken, and manual-copy files were intentionally excluded from this snapshot commit. They remain preserved in the independent production archive created before this worktree preparation.

Excluded categories include:

- *.bak and *.bak.* files
- *.backup and *.backup.* files
- *.save files
- *.old files
- *.orig files
- files containing BROKEN in the filename
- dated backup copies of index.js and frontend HTML files

## Production Runtime Note

PM2 was not restarted during this snapshot process. The live backend process may therefore differ from the index.js file saved in this snapshot, because PM2 can continue running code that was loaded before later filesystem edits.

## Known Risks

- Three competing result models are present or referenced: results_department, results, and results_votes.
- Admin authentication is insufficient for a production election system.
- The database schema is incomplete relative to the routes currently present in index.js.
- Multiple dashboard variants compete for the same administrative role.
- There are no real automated tests in the project.

## Secret Handling

No environment file or secret value is included in this snapshot commit. The .env file remains excluded from Git.
