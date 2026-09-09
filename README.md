This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

The console uses the Inter typeface through `next/font`.

## First admin setup

The private `/setup` page is available only when both conditions are true:

1. `ADMIN_BOOTSTRAP_TOKEN` is configured as a server-only environment variable with a random value of at least 32 characters.
2. No document in `users` has `role: "admin"`.

Generate a token locally with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Put that value in `.env.local` for local setup, or in Vercel as an encrypted Production/Preview environment variable. Open `/setup`, enter the token and the first admin credentials, then remove the token from Vercel after setup. The server creates the Firebase Auth user and matching `users/{uid}` admin profile, and a Firestore bootstrap lock prevents a second first-admin claim. Never commit the token or place it in a `NEXT_PUBLIC_*` variable.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
