This folder contains idempotent SQL migrations you can run against your local MySQL database.

Migration: 001_add_customer_id_to_contracts_softsave.sql
- Adds a nullable `customer_id` INT column to `contracts_softsave` if it doesn't already exist.
- Adds an index on `customer_id` to speed JOINs.
- Optionally adds a FK constraint (commented out in the file). Uncomment if your local DB allows it.

How to run (PowerShell)

1) Make sure your MySQL server is running and you have correct credentials. Replace placeholders below.

# Open a PowerShell prompt and run:
$env:MYSQL_PWD = 'your_mysql_password'
mysql -u your_mysql_user -h your_mysql_host your_database_name < migrations\\001_add_customer_id_to_contracts_softsave.sql

2) Alternatively, run the SQL file from within a MySQL client GUI, or copy/paste its content into your DB client.

Notes
- The migration checks information_schema and will do nothing if the column already exists.
- If you use a migration tool (Flyway, knex, etc.) integrate the SQL accordingly.

If you want, I can also add a tiny npm script or a NodeJS migration runner that uses your project's DB config to run the migration automatically; say the word and I'll add it.
