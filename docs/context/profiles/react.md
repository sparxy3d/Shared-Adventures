# Stack profile: React

Edited 2026-10-08 to match this repo. Applies to `client/`.

## Structure

```
client/src/
  App.tsx          wouter <Switch> with every route. Add new pages here
  pages/           one file per route; vendor/ and admin/ subfolders
  components/      shared app components (navbar, footer, experience-card)
  components/ui/   stock shadcn/ui. Do not edit or read unless changing a primitive on purpose
  hooks/           use-toast, use-mobile
  lib/             queryClient (apiRequest, default fetcher), currency, dates, utils (cn)
client/public/images/   static experience photos
```

Pages are organized by role area, not by feature folder. Keep that until there is a reason
to change it.

## Conventions

- Function components and hooks only.
- Server state uses TanStack Query. The query key is the URL (`queryKey: ["/api/offers"]`).
  The default fetcher joins key parts with `/`. Pages that need a query string, or that need
  `/api/auth/me` to return `null` on a 401, pass their own `queryFn` that uses `fetch` with
  `credentials: "include"`. That pattern is fine. Mutations use
  `apiRequest(method, url, body)`, then `queryClient.invalidateQueries` for the affected keys.
- `/api/auth/me` is fetched separately on many pages, with a slightly different `queryFn`
  each time. Reuse one hook when you touch this. Do not add another copy.
- Defaults (`lib/queryClient.ts`): `staleTime: Infinity`, no retries, no refetch on focus.
  Invalidate after a write, or the UI shows stale data.
- Routing uses wouter (`Link`, `useLocation`, `useParams`), not react-router.
- Prices go through `formatPrice()`. Dates and times go through `lib/dates.ts`. Never use
  `toISOString()` for a local date.
- Images use `src={experience.imageUrl || "/images/fallback.png"}`.
- Add `data-testid` attributes on interactive elements, following the existing pattern
  (`button-confirm-${id}`).

## Design conventions

- shadcn/ui primitives, Tailwind, and the amber/orange primary (`hsl 22 93% 53%`) in
  Plus Jakarta Sans. Cards are `rounded-2xl`, and inputs and buttons are `rounded-xl`.
- framer-motion for entrance and hover. Keep motion subtle.
- Mobile-first layouts.

## Accessibility

- Every image has meaningful `alt` text (the experience title).
- Icon-only buttons (favorite, share) need an `aria-label`. None have one today. Add it
  when you touch them.
- Form errors use `role="alert"` (see `admin-dashboard.tsx`).

## Security

- The client never decides authorization. It hides what the server would refuse anyway.
- Never put secrets or env values in client code. Vite exposes only `VITE_*` variables, and
  none are used today.

## Testing

None yet. Verify by hand in the Replit preview with the seeded accounts.

## Commands

```
npm run dev     # Vite runs as middleware inside the Express server
npm run build
```

## Do not

- Edit `components/ui/*` to fix one screen. Wrap or compose instead.
- Call `fetch` outside a `useQuery` or `useMutation`. Server state belongs in the query cache.
- Reference an image file that is not in `client/public/images/`.
