# 🔍 QA Diagnosis — warehouse

**Run:** 4/18/2026, 8:18:29 PM | **Duration:** 0.3s | **Findings:** 15

> ⚠️ **App could not be started:** Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL  
> Some dynamic checks were skipped. Static analysis findings are still included.

---

## Health Score

`███████████████░░░░░` **73/100**

> Good — a few things to address.

| Severity | Count |
|----------|-------|
| 📋 Medium   | 6 |
| ℹ️ Low      | 9 |

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

app\api\warehouse\issue\route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `app\api\warehouse\issue\route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in app\api\warehouse\issue\route.ts
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
### 4. Unbounded database query — no pagination or limit

lib\showrooms\route.ts fetches records without a LIMIT or pagination constraint. As your data grows, this query will become slow and expensive.

📍 **File:** `lib\showrooms\route.ts`
💥 **Impact:** A table with 100k+ rows will cause slow responses, high DB load, and potential Vercel function timeouts. At scale this becomes a denial-of-service vector.

🔧 **Fix:** Add pagination to all data-fetching queries:

// Prisma
const items = await prisma.item.findMany({ take: 50, skip: offset });

// Supabase
const { data } = await supabase.from('items').select('*').range(offset, offset + 49);

<details><summary>Evidence</summary>

```
.select('*') without .limit(N) in lib\showrooms\route.ts
```

</details>

---
### 5. Security headers not configured in next.config.js

next.config.ts does not define a headers() function. Your app is missing important security headers like X-Frame-Options, X-Content-Type-Options, and CSP.

📍 **File:** `next.config.ts`
💥 **Impact:** Missing security headers make your app vulnerable to clickjacking, MIME type sniffing attacks, and make CSP enforcement impossible.

🔧 **Fix:** Add security headers to next.config.ts:

async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
    ]
  }];
}

<details><summary>Evidence</summary>

```
No headers() function found in next.config.ts
```

</details>

---
### 6. 13 route segment(s) missing error.tsx

These route segments have no error boundary: app, app\(auth)\login, app\(protected)\admin, app\(protected)\admin\Dealers, app\(protected)\admin\Dealers\[dealerCode].... If a component in these segments throws, the entire page crashes with a generic Next.js error page.

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
Segments without error.tsx: app, app\(auth)\login, app\(protected)\admin, app\(protected)\admin\Dealers, app\(protected)\admin\Dealers\[dealerCode], app\(protected)\admin\Inventory, app\(protected)\admin\IssuedHistory, app\(protected)\admin\IssueStock, app\(protected)\admin\Showroom, app\(protected)\admin\Spares, app\(protected)\dashboard, app\(protected)\frontdesk, app\(protected)\manager
```

</details>

---
---

## ℹ️ Low Priority / Suggestions

- ℹ️ **9 data-heavy page(s) missing loading.tsx**
- ℹ️ **List rendering without empty state in components\Forms\warehouse\dealerInventory.tsx** _(components\Forms\warehouse\dealerInventory.tsx)_
- ℹ️ **List rendering without empty state in components\Forms\warehouse\issueStockForm.tsx** _(components\Forms\warehouse\issueStockForm.tsx)_
- ℹ️ **List rendering without empty state in components\Forms\warehouse\showroomInventory.tsx** _(components\Forms\warehouse\showroomInventory.tsx)_
- ℹ️ **List rendering without empty state in components\Forms\warehouse\sparesInventory.tsx** _(components\Forms\warehouse\sparesInventory.tsx)_
- ℹ️ **List rendering without empty state in components\Forms\warehouse\vehicleInventory.tsx** _(components\Forms\warehouse\vehicleInventory.tsx)_
- ℹ️ **List rendering without empty state in components\History\issuedHistory.tsx** _(components\History\issuedHistory.tsx)_
- ℹ️ **List rendering without empty state in components\sidebar.tsx** _(components\sidebar.tsx)_
- ℹ️ **Missing Open Graph image** _(app/layout.tsx)_

---

## ✅ What's Good

- Unauthenticated Api Access ✓
- Protected Page Rendering ✓
- Token Storage ✓
- Input Validation ✓
- Race Conditions ✓
- Http Methods ✓
- Rate Limiting ✓
- Error Leakage ✓
- Response Times ✓
- Cors Policy ✓
- Hardcoded Secrets ✓
- Env Separation ✓
- Accessibility ✓

---

## 📊 Coverage Summary

| Category      | Checks Run | Passed | Failed | Skipped |
|---------------|-----------|--------|--------|---------|
| Auth         |          6 |      3 |      0 |       3 |
| Data         |          4 |      2 |      1 |       1 |
| Payments     |          1 |      0 |      0 |       1 |
| API          |          5 |      5 |      0 |       0 |
| Config       |          4 |      2 |      1 |       1 |
| Frontend     |          5 |      1 |      4 |       0 |

---

## 🗺️ Next Steps

1. **Unbounded database query — no pagination or limit**  
   ~5–10 min
2. **Unbounded database query — no pagination or limit**  
   ~5–10 min
3. **Unbounded database query — no pagination or limit**  
   ~5–10 min
4. **Unbounded database query — no pagination or limit**  
   ~5–10 min
5. **Security headers not configured in next.config.js**  
   ~5–10 min

> Fixing the top 3 issues would bring your health score from **73** → **82**.

> Run `npx qa-agent fix .` to automatically fix 2 of 15 issues.

---

_Generated by [qa-agent](https://github.com/your/qa-agent)_
