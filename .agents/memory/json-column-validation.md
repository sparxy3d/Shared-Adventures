---
name: Typed JSON array validation
description: Why typed JSON array columns need explicit shared validation overrides.
---

Use an explicit shared Zod schema for typed JSON array columns rather than
relying solely on drizzle-zod's inferred JSON validator.

**Why:** The installed drizzle-zod inferred typed JSON arrays as indexed object
shapes, including array-method properties. Valid database inserts then failed
TypeScript checks. A schema override preserved both validation and correct types;
casting the insert would have concealed the underlying mismatch.

**How to apply:** Reuse the domain's bounded array schema in createInsertSchema's
column override. Recheck type inference and runtime validation after upgrades.
