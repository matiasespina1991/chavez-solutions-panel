<p align="center">
<h1 align="center">Admin Dashboard Starter Template with Next.js &amp; Shadcn UI</h1>

<div align="center">Built with the Next.js 16 App Router, Tailwind CSS &amp; Shadcn UI components</div>

<br />

<div align="center">
  <a href="https://dub.sh/shadcn-dashboard"><strong>View Demo</strong></a>
</div>
<br />
<div align="center">
  <img src="/public/shadcn-dashboard.png" alt="Shadcn Dashboard Cover" style="max-width: 100%; border-radius: 8px;" />
</div>

## Overview

This is an **admin dashboard starter template** built with **Next.js 16, Shadcn UI, and Tailwind CSS**.

It gives you a production-ready **dashboard UI** with authentication, charts, tables, forms, and a feature-based folder structure, perfect for **SaaS apps, internal tools, and admin panels**.

### Tech Stack

This template uses the following stack:

- Framework - [Next.js 16](https://nextjs.org/16)
- Language - [TypeScript](https://www.typescriptlang.org)
- Auth - Firebase-ready stubs (wire Firebase Auth when available)
- Analytics/Error logging - Console instrumentation (plug Firebase Analytics / Logging later)
- Styling - [Tailwind CSS v4](https://tailwindcss.com)
- Components - [Shadcn-ui](https://ui.shadcn.com)
- Schema Validations - [Zod](https://zod.dev)
- State Management - [Zustand](https://zustand-demo.pmnd.rs)
- Search params state manager - [Nuqs](https://nuqs.47ng.com/)
- Tables - [Tanstack Data Tables](https://ui.shadcn.com/docs/components/data-table) • [Dice table](https://www.diceui.com/docs/components/data-table)
- Forms - [React Hook Form](https://ui.shadcn.com/docs/components/form)
- Command+k interface - [kbar](https://kbar.vercel.app/)
- Linting - [ESLint](https://eslint.org)
- Pre-commit Hooks - [Husky](https://typicode.github.io/husky/)
- Formatting - [Prettier](https://prettier.io)

_If you are looking for a Tanstack start dashboard template, here is the [repo](https://git.new/tanstack-start-dashboard)._

## Features

- 🧱 Pre-built **admin dashboard layout** (sidebar, header, content area)

- 📊 **Analytics overview** page with cards and charts

- 📋 **Data tables** with server-side search, filter & pagination

- 🔐 **Authentication UI** ready to plug into Firebase Auth

- 🏢 **Workspace + org switcher** powered by mock data (replace with Firestore later)

- 💳 **Billing & subscriptions** screens with mock plans + upgrade flows

- 🔒 Simplified navigation config that can be extended with Firebase roles later

- 🧩 **Shadcn UI components** with Tailwind CSS styling

- 🧠 Feature-based folder structure for scalable projects

- ⚙️ Ready for **SaaS dashboards**, internal tools, and client admin panels

## Use Cases

You can use this Next.js + Shadcn UI dashboard starter to build:

- SaaS admin dashboards

- Internal tools & operations panels

- Analytics dashboards

- Client project admin panels

- Boilerplate for new Next.js admin UI projects

## Pages

| Pages                                                                                                                                                                  | Specifications                                                                                                                                                                                                                                                          |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signup / Signin                                                                                                                                                       | Shadcn-based forms with stateful validation that can be pointed to Firebase Auth.                                                                                                                                                   |
| [Dashboard Overview](https://shadcn-dashboard.kiranism.dev/dashboard)                                                                                                  | Cards with Recharts graphs for analytics. Parallel routes in the overview sections feature independent loading, error handling, and isolated component rendering.                                                                                                       |
| [Product List (Table)](https://shadcn-dashboard.kiranism.dev/dashboard/product)                                                                                        | Tanstack tables with server side searching, filter, pagination by Nuqs which is a Type-safe search params state manager in nextjs                                                                                                                                       |
| [Create Product Form](https://shadcn-dashboard.kiranism.dev/dashboard/product/new)                                                                                     | A Product Form with shadcn form (react-hook-form + zod).                                                                                                                                                                                                                |
| Profile                                                                                                                                                               | Editable profile + security cards backed by mock data until Firebase Auth lands.                                                                                                                                                   |
| [Kanban Board](https://shadcn-dashboard.kiranism.dev/dashboard/kanban)                                                                                                 | A Drag n Drop task management board with dnd-kit and zustand to persist state locally.                                                                                                                                                                                  |
| Workspaces                                                                                                                                                            | Card-based workspace selector with mock organizations to illustrate multi-tenant flows.                                                                                                                                            |
| Team Management                                                                                                                                                       | Custom table for members, roles, invites, plus quick actions ready for Firestore data.                                                                                                                                             |
| Billing & Plans                                                                                                                                                       | Pricing grid + usage stats using mock plans, intended to hook into Firebase/Stripe later.                                                                                                                                         |
| Exclusive Page                                                                                                                                                        | Example of feature gating using the mock plan tier from the active workspace.                                                                                                                                                     |
| [Not Found](https://shadcn-dashboard.kiranism.dev/dashboard/notfound)                                                                                                  | Not Found Page Added in the root level                                                                                                                                                                                                                                  |
| Global Error                                                                                                                                                           | App Router global error boundary that logs issues to the console (swap with Firebase Logging later).                                                                                                                               |

## Feature based organization

```plaintext
src/
├── app/ # Next.js App Router directory
│ ├── (auth)/ # Auth route group
│ │ ├── (signin)/
│ ├── (dashboard)/ # Dashboard route group
│ │ ├── layout.tsx
│ │ ├── loading.tsx
│ │ └── page.tsx
│ └── api/ # API routes
│
├── components/ # Shared components
│ ├── ui/ # UI components (buttons, inputs, etc.)
│ └── layout/ # Layout components (header, sidebar, etc.)
│
├── features/ # Feature-based modules
│ ├── feature/
│ │ ├── components/ # Feature-specific components
│ │ ├── actions/ # Server actions
│ │ ├── schemas/ # Form validation schemas
│ │ └── utils/ # Feature-specific utilities
│ │
├── lib/ # Core utilities and configurations
│ ├── auth/ # Auth configuration
│ ├── db/ # Database utilities
│ └── utils/ # Shared utilities
│
├── hooks/ # Custom hooks
│ └── use-debounce.ts
│
├── stores/ # Zustand stores
│ └── dashboard-store.ts
│
└── types/ # TypeScript types
└── index.ts
```

## Getting Started

> [!NOTE]  
> This admin dashboard starter uses **Next.js 16 (App Router)** with **React 19** and **Shadcn UI**. Follow these steps to run it locally:

Clone the repo, install dependencies, and copy the env template:

```
npm install
cp env.example.txt .env.local
npm run dev
```

##### Environment Configuration Setup

To configure the environment for this project, refer to the `env.example.txt` file. This file contains the necessary environment variables required for authentication and error tracking.

Firebase Auth + Analytics wiring is not included yet. Replace the mock session provider with your Firebase implementation when ready.

You should now be able to access the application at http://localhost:3000.

> [!WARNING]
> After cloning or forking the repository, be cautious when pulling or syncing with the latest changes, as this may result in breaking conflicts.

Cheers! 🥂

<!--

SEO keywords:

nextjs admin dashboard, nextjs dashboard template, shadcn ui dashboard,

admin dashboard starter, dashboard ui template, nextjs shadcn admin panel,

react admin dashboard, tailwind css admin dashboard

-->

## Star History

<a href="https://www.star-history.com/#Kiranism/next-shadcn-dashboard-starter&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Kiranism/next-shadcn-dashboard-starter&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=Kiranism/next-shadcn-dashboard-starter&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=Kiranism/next-shadcn-dashboard-starter&type=date&legend=top-left" />
 </picture>
</a>
