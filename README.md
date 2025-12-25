You can read more about this project at https://archive2.lostcity.rs/about

## Easy local setup

Copy `.env.example` to a new file called `.env`, then define your database connection in it.

Execute `bun run db:reset` to create the database schema and seed the games table for import organization.

Visit http://localhost:3000/caches/list.

If you check the tools directory it has import scripts to start building your own database.  
If you don't have any local files to import there is an easy download-import command i.e. `bun run import:archive 377`

## Dependencies

- [Bun 1.3.3+](https://bun.sh)
- MariaDB (or MySQL-compatible) server
