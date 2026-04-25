# 🔍 QA Diagnosis — warehouse

**Run:** 4/20/2026, 10:29:39 PM | **Duration:** 16.1s | **Findings:** 12

> ⚠️ **App could not be started:** Build failed: Error: Command failed: npm run build
Failed to type check.

./components/Forms/company/companyRegistration.tsx:67:12
Type error: Cannot find name 'res'.

  [90m65 |[0m       }
  [90m66 |[0m
[31m[1m>[0m [90m67 |[0m       [36mif[0m (!res.ok) {
  [90m   |[0m            [31m[1m^[0m
  [90m68 |[0m         [36mconst[0m errorData = [36mawait[0m res.json();
  [90m69 |[0m         [36mconst[0m errorMessage = errorData.error || [32m"Failed to save company data"[0m;
  [90m70 |[0m         [36mif[0m (errorMessage.includes([32m"duplicate"[0m) || errorMessage.includes([32m"23505"[0m)) {
Next.js build worker exited with code: 1 and signal: null
  
> Some dynamic checks were skipped. Static analysis findings are still included.

---

## Health Score

`████████████████░░░░` **78/100**

> Good — a few things to address.

| Severity | Count |
|----------|-------|
| 📋 Medium   | 5 |
| ℹ️ Low      | 7 |

---

## 📋 Medium Issues

### 1. Unbounded database query — no pagination or limit

app\api\dealers\route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `app\api\dealers\route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in app\api\dealers\route.ts
```

</details>

---
### 2. Unbounded database query — no pagination or limit

app\api\profiles\route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `app\api\profiles\route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in app\api\profiles\route.ts
```

</details>

---
### 3. Unbounded database query — no pagination or limit

app\api\warehouse\issued-history\route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `app\api\warehouse\issued-history\route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in app\api\warehouse\issued-history\route.ts
```

</details>

---
### 4. No rate limiting detected on /api/company/register

20 rapid requests to /api/company/register all succeeded without any 429 responses. No rate limiting library was detected in the project. Your API can be abused for scraping, spam, or DoS.

💥 **Impact:** Attackers can make unlimited requests to your API endpoints, enabling scraping, credential stuffing, spam signup, or exhausting your Vercel/Supabase quotas.

🔧 **Fix:** Add rate limiting using Upstash Ratelimit or a middleware:

import { Ratelimit } from '@upstash/ratelimit';
const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '10 s') });
const { success } = await ratelimit.limit(ip);
if (!success) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });

> ✨ **Auto-fixable** — run `npx qa-agent fix .` to apply this fix automatically

<details><summary>Evidence</summary>

```
20 concurrent GET http://localhost:3000/api/company/register → all returned non-429 responses. No rate limit library found in package.json.
```

</details>

---
### 5. 2 route segment(s) missing error.tsx

These route segments have no error boundary: app\(protected)\frontdesk\Company, app\(protected)\frontdesk\Customer. If a component in these segments throws, the entire page crashes with a generic Next.js error page.

💥 **Impact:** Unhandled rendering errors show users a broken white page with "Application error" message. Error boundaries catch exceptions and show a friendly message with a retry option.

🔧 **Fix:** Create error.tsx in each route segment:

'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

> ✨ **Auto-fixable** — run `npx qa-agent fix .` to apply this fix automatically

<details><summary>Evidence</summary>

```
Segments without error.tsx: app\(protected)\frontdesk\Company, app\(protected)\frontdesk\Customer
```

</details>

---
---

## ℹ️ Low Priority / Suggestions

- ℹ️ **9 data-heavy page(s) missing loading.tsx**
- ℹ️ **List rendering without empty state in components\Forms\warehouse\issueStockForm.tsx** _(components\Forms\warehouse\issueStockForm.tsx)_
- ℹ️ **List rendering without empty state in components\Forms\warehouse\sparesInventory.tsx** _(components\Forms\warehouse\sparesInventory.tsx)_
- ℹ️ **List rendering without empty state in components\Forms\warehouse\vehicleInventory.tsx** _(components\Forms\warehouse\vehicleInventory.tsx)_
- ℹ️ **List rendering without empty state in components\History\issuedHistory.tsx** _(components\History\issuedHistory.tsx)_
- ℹ️ **List rendering without empty state in components\sidebar.tsx** _(components\sidebar.tsx)_
- ℹ️ **List rendering without empty state in components\ui\field.tsx** _(components\ui\field.tsx)_

---

## ✅ What's Good

- Unauthenticated Api Access ✓
- Protected Page Rendering ✓
- Token Storage ✓
- Input Validation ✓
- Race Conditions ✓
- Http Methods ✓
- Error Leakage ✓
- Response Times ✓
- Cors Policy ✓
- Hardcoded Secrets ✓
- Next Config ✓
- Env Separation ✓
- Meta Tags ✓
- Accessibility ✓

---

## 📊 Coverage Summary

| Category      | Checks Run | Passed | Failed | Skipped |
|---------------|-----------|--------|--------|---------|
| Auth         |          6 |      3 |      0 |       3 |
| Data         |          4 |      2 |      1 |       1 |
| Payments     |          1 |      0 |      0 |       1 |
| API          |          5 |      4 |      1 |       0 |
| Config       |          4 |      3 |      0 |       1 |
| Frontend     |          5 |      2 |      3 |       0 |

---

## 🗺️ Next Steps

1. **Unbounded database query — no pagination or limit**  
   ~5–10 min
2. **Unbounded database query — no pagination or limit**  
   ~5–10 min
3. **Unbounded database query — no pagination or limit**  
   ~5–10 min
4. **No rate limiting detected on /api/company/register** _(auto-fixable)_  
   ~2 min (auto-fixable)
5. **2 route segment(s) missing error.tsx** _(auto-fixable)_  
   ~2 min (auto-fixable)

> Fixing the top 3 issues would bring your health score from **78** → **87**.

> Run `npx qa-agent fix .` to automatically fix 3 of 12 issues.

---

_Generated by [qa-agent](https://github.com/your/qa-agent)_
