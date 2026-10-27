# Stack profile: React

Edited 2026-10-27 to match this repo. Applies to `client/`.

## Structure

```
client/src/
  App.tsx          wouter <Switch> with every route. Add new pages here
  pages/           one file per route; vendor/ and admin/ subfolders
  components/      shared app components (navbar, footer, experience-card, photo editor, dialogs)
  components/ui/   stock shadcn/ui. Do not edit or read unless changing a primitive on purpose
  hooks/           use-auth, use-site-config, use-pricing-config, use-toast and others
  lib/             queryClient (apiRequest, default fetcher), pricing, discovery (Sri Lanka time), dates
client/public/images/   curated experience photos
client/public/brand/    logos (WebP, with @2x)
```

Pages are organized by role area, not by feature folder. Keep that until there is a reason
to change it.

## Conventions

- Function components and hooks only.
- Server state uses TanStack Query. The query key is the URL. Mutations use
  `apiRequest(method, url, body)`, then `queryClient.invalidateQueries` for the affected keys.
- The signed-in user comes from `useAuth()`. Do not add another `/api/auth/me` query.
- Defaults (`lib/queryClient.ts`): `staleTime: Infinity`, no retries. Invalidate after a write,
  or the UI shows stale data.
- Routing uses wouter (`Link`, `useLocation`, `useParams`), not react-router.
- Prices: resident LKR and optional visitor USD come from the server. Display them with the
  helpers in `lib/pricing.ts`; never compute a booking total in the browser.
- Dates and times: Sri Lanka time helpers in `lib/discovery.ts` and `lib/dates.ts`.
- Images: listing photos may be curated files or `/api/listing-images/...` URLs. Fall back to
  `/images/fallback.png`.
- Add `data-testid` attributes on interactive elements, following the existing pattern.
- No em dashes in user-facing text.

## Design conventions

- shadcn/ui primitives, Tailwind, the warm orange primary and Plus Jakarta Sans.
- Keep motion subtle. Mobile-first layouts; check 375 px and 1440 px.

## Accessibility

- Every image has meaningful `alt` text.
- Icon-only buttons need an `aria-label`.
- Form errors use `role="alert"` and are linked with `aria-describedby`.

## Security

- The client never decides authorization. It hides what the server would refuse anyway.
- Never put secrets or env values in client code.

## Testing

Browser checks in `script/capture-*.cjs` take screenshots at 1440 px and 375 px into
`generated-artifacts/` (not committed). Record what was checked in `verification.md`.

## Commands

```
npm run dev     # Vite runs as middleware inside the Express server
npm run build
```

## Do not

- Edit `components/ui/*` to fix one screen. Wrap or compose instead.
- Call `fetch` outside a `useQuery` or `useMutation`.
- Reference an image file that is not in `client/public/images/`.
