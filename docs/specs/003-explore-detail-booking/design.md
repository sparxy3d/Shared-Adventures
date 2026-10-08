# Implementation boundaries

- Search owns URL-backed filters; price and sorting stay in the browser. Use real nextSession and the unchanged Stage 2 card.
- Detail owns URL session/group/booking-open state so authentication survives page navigation. Reuse shared identity query. Separate request dialog from session panel and pure grouping/date helpers.
- Authenticated customer booking uses the existing endpoint and four allowed input fields. Guest UI is prototype-only and cannot send a request without authentication.
- Extend only the member read projection in storage; existing customer ownership filter and all routes/guards remain unchanged. Vendor/admin response shapes unchanged.
- One photo is supported by the existing public API. No fabricated gallery, suitability, capacity or vendor information.
- Keep Stage 1 header/footer and Stage 2 homepage/card unchanged; support address flows from shared catalog.
