<p align="center"><a href="https://hytalemodding.dev"><img src="https://cdn.internal.hytalemodding.dev/assets/HytaleLogo_DiscordBannerV6.png" width="600"></a></p>

# HytaleModding Wiki

This is the official Wiki project from HytaleModding, hosted at https://wiki.hytalemodding.dev. It allows mod teams to create and manage documentation for their mods, making it easy for players and developers to find the information they need.

## Requirements

Before you start, make sure you have the following installed:

- PHP 8.2 or newer
- Composer
- Node.js 18 or newer
- Bun
- Git

You also need these PHP extensions enabled:

- `fileinfo`
- `pdo_sqlite`
- `sqlite3`

## Getting Started

Clone the repository and install the project dependencies:

```bash
git clone https://github.com/HytaleModding/wiki.git
cd wiki
composer install
bun install
```

Create your local environment file and application key:

```bash
cp .env.example .env
php artisan key:generate
```

Create the local SQLite database, run migrations, seed demo data, and link storage:

```bash
touch database/database.sqlite
php artisan migrate --seed
php artisan storage:link
```

Start the local development server:

```bash
composer dev
```

The app will be available at [http://localhost:8000](http://localhost:8000).

## Demo Accounts

After seeding the database, you can log in with:

| Email | Password |
| --- | --- |
| `admin@example.com` | `password` |
| `user@example.com` | `password` |
| `collaborator@example.com` | `password` |

## Development Commands

Run the frontend development server only:

```bash
bun run dev
```

Build frontend assets:

```bash
bun run build
```

Run frontend formatting, linting, and type checks:

```bash
bun run quality
```

Run PHP tests and style checks:

```bash
composer test
```

Format PHP code with Laravel Pint:

```bash
./vendor/bin/pint
```

## Resetting Local Data

To rebuild your local database from scratch and seed it again:

```bash
php artisan migrate:fresh --seed
```

## Contributing

If you'd like to contribute to this project, you can follow our [Contributing Guide](./CONTRIBUTING.md).
