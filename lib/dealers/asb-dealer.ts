export type Dealer = {
  dealer_code: string;
  business_name: string;
  owner_name?: string;
  city: string;
  state: string;
  address: string;
  is_active: boolean;
  created_at?: string;
};

/* ---------------- FETCH ALL ---------------- */
export async function getDealers(): Promise<Dealer[]> {
  const res = await fetch("/api/dealers", {
    method: "GET",
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch dealers");
  }

  return data;
}

/* ---------------- CREATE ---------------- */
export async function createDealer(input: Dealer) {
  const res = await fetch("/api/dealers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to create dealer");
  }

  return data;
}

/* ---------------- CODE GENERATOR (API BASED LOGIC STILL CLIENT SIDE OK) ---------------- */
export async function generateDealerCode(): Promise<string> {
  const res = await fetch("/api/dealers", {
    method: "GET",
  });

  const data: Dealer[] = await res.json();

  if (!Array.isArray(data) || data.length === 0) {
    return "ASB-DL-001";
  }

  const last = data[0]?.dealer_code;

  const match = last?.match(/ASB-DL-(\d+)/);
  const num = match ? parseInt(match[1], 10) + 1 : 1;

  return `ASB-DL-${String(num).padStart(3, "0")}`;
}
