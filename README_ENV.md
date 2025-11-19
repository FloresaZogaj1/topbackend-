## Environment Configuration (Backend)

Never commit real service credentials (.env) to the repository.

Replace sensitive values with placeholders before pushing:

```
DB_HOST=__REPLACE_ME__
DB_PORT=3306
DB_USER=__REPLACE_ME__
DB_PASS=__REPLACE_ME__
DB_NAME=topmobile
DB_SSL=true
SESSION_SECRET=__REPLACE_ME_SECRET__
JWT_SECRET=__REPLACE_ME_JWT__
```

Create a local file `.env.local` with real values (ignored by Git per `.gitignore`).

If GitHub Push Protection blocks a push:
1. Remove the secret from the commit (rewrite or amend).
2. Force rotate the exposed credential.
3. Re‑commit with placeholders.

To rewrite last commit after editing `.env`:
```
git add .env
git commit --amend --no-edit
git push --force-with-lease
```

Rotate any secret that was previously pushed even if blocked.