# Uniq CRM

Light internal CRM + SFA for Uniq (Turkish B2B training and consulting). Built to replace Nimble for two users: contacts, companies, tags, custom fields, manual activities, a deal pipeline, workflow kanban boards, tasks, and a small home summary. No email or calendar sync.

## Stack

- Next.js App Router, TypeScript, Tailwind, shadcn/ui
- Prisma + SQLite (switch the Prisma `provider` to `postgresql` and point `DATABASE_URL` at Postgres when you want that)
- Cookie session auth (credentials), roles **Yönetici** / **Üye**

SQLite is the default so the app runs with zero infrastructure. It is indexed for roughly 20k contacts (search + pagination). Postgres is a one-line provider change when you outgrow the file database.

## Run locally

```bash
cp .env.example .env
npm install
npx prisma generate
npm run db:setup
npm run dev
```

Open [http://localhost:43141](http://localhost:43141).

Demo users (seeded):

| E-posta | Şifre | Rol |
| --- | --- | --- |
| `ayse@uniq.com.tr` | `Uniq2026!` | Yönetici |
| `mehmet@uniq.com.tr` | `Uniq2026!` | Üye |

Change `SESSION_SECRET` in `.env` before any real use.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 43141 |
| `npm run build` | `prisma generate` then production build |
| `npm run db:setup` | Push schema and load demo data |
| `npm run db:seed` | Re-seed (wipes CRM tables) |

## What is in this slice

- Login
- Mini dashboard (open deal count + TRY total, this week’s tasks, overdue highlight, upcoming meetings)
- Contacts: list (search / tag / owner / pagination), create, detail + edit, tags, custom fields, activities, related tasks
- Companies: list, create, detail
- Deal pipeline kanban (drag cards between stages, TRY amounts, won/lost stages)
- Workflow boards (seeded **Lead** and **Seyahat**) with drag-drop cards linked to contacts
- Tasks with due dates; overdue list emphasized
- Native upcoming meetings list
- CSV contact import (Nimble-style columns; sample file at `public/sample-contacts.csv`)
- Settings: tags/segments, custom field schema (admin), user list

## Out of scope

Email/IMAP/Gmail sync, sequences, inbound forms, calendar sync, advanced reports, marketplace integrations.

## CSV columns

`ad` / `firstName`, `soyad` / `lastName`, `eposta` / `email`, `telefon` / `phone`, `unvan` / `title`, `firma` / `company`, `sehir` / `city`

Duplicate e-mails are skipped. Missing companies are created.

Deal CSV import is intentionally stubbed for a later sprint.
