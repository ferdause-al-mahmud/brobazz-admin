This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

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

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Authentication

Sign-in uses the MongoDB `users` collection. User passwords must be bcrypt hashes (the registration API stores them hashed). Configure `AUTH_SECRET` or `JWT_SECRET` with a long, random secret for signed session cookies. Users whose `password` is `null` do not have a password login and must be assigned one before they can sign in.

Google sign-in uses a Google OAuth web application client. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in the server environment. Set the authorized redirect URI in Google Cloud Console to the same value, ending in `/api/auth/google/callback` (for local development, use `http://localhost:3001/api/auth/google/callback`). Google users are stored in `users` with `password: null`; new Google users receive the `customer` role by default. Existing users with the same verified email are linked to the Google account without changing their role.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
