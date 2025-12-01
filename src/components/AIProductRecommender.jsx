import React, { useState } from "react";

// Default export a React component that you can drop into a CRA/Vite app.
// Replace AI_API_ENDPOINT and AI_API_KEY with your chosen AI endpoint (Gemini / OpenAI / other).

const AI_API_ENDPOINT = "https://api.example.com/v1/recommend"; // <-- REPLACE
const AI_API_KEY = "AIzaSyAM8qssdwRuEi9kFQRTCvjoEzeNvIyvka8"; 

// Example product catalog (this is the list displayed in the UI)
const PRODUCTS = [
  { id: "p1", name: "PocketPhone A1", price: 299, category: "phone", features: ["5.5in", "64GB", "dual-sim"] },
  { id: "p2", name: "PocketPhone Pro", price: 549, category: "phone", features: ["6.2in", "128GB", "fast-charge"] },
  { id: "p3", name: "BudgetPhone B2", price: 199, category: "phone", features: ["5.0in", "32GB"] },
  { id: "p4", name: "CameraZoom X", price: 699, category: "camera", features: ["50MP", "optical-zoom"] },
  { id: "p5", name: "WorkTablet T1", price: 429, category: "tablet", features: ["10in", "64GB"] },
  { id: "p6", name: "Lifestyle Earbuds", price: 89, category: "audio", features: ["noise-cancel", "bluetooth 5.2"] },
];

function ProductCard({ product }) {
  return (
    <div className="border rounded-2xl p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{product.name}</h3>
      <p className="text-sm text-slate-600">{product.category.toUpperCase()}</p>
      <p className="mt-2 font-medium">${product.price}</p>
      <div className="mt-2 text-xs text-slate-500">{product.features.join(' · ')}</div>
    </div>
  );
}

export default function AIProductRecommender() {
  const [query, setQuery] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sends the user's preference and the product catalog to the AI.
  // The AI is expected to return a simple list of product IDs (e.g. ["p1","p3"]) or an explanation.
  // If you don't have an AI endpoint available, the function falls back to a simple local heuristic filter.
  async function askAIForRecommendations(userInput) {
    setLoading(true);
    setError(null);

    // Build a concise payload: user query + small product catalog
    const payload = {
      query: userInput,
      products: PRODUCTS.map(p => ({ id: p.id, name: p.name, price: p.price, category: p.category, features: p.features })),
      instruction: `Return a JSON object: { "recommended_ids": [<product ids in order>], "reason": "short reason" }. Only output JSON.`
    };

    try {
      // Try calling the external AI API
      const resp = await fetch(AI_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        // fallback to local filter if remote fails
        throw new Error(`AI endpoint error: ${resp.status}`);
      }

      const data = await resp.json();
      // Expecting data.recommended_ids to be an array of product ids
      if (data && Array.isArray(data.recommended_ids)) {
        const recs = data.recommended_ids.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
        setRecommendations(recs);
      } else {
        // Unexpected response, fallback
        setError('AI returned unexpected shape — falling back to local filter.');
        fallbackLocalFilter(userInput);
      }
    } catch (e) {
      console.warn('AI call failed:', e);
      // Local fallback
      fallbackLocalFilter(userInput);
    } finally {
      setLoading(false);
    }
  }

  // Very simple local heuristic to provide at least reasonable results without an AI
  function fallbackLocalFilter(userInput) {
    // parse price like "$500" or "under 500" or "<500"
    const lower = userInput.toLowerCase();
    const priceMatch = lower.match(/(under|below|<)\s*\$?(\d{2,6})/);
    const maxPrice = priceMatch ? Number(priceMatch[2]) : null;

    // look for category keywords
    const categoryKeywords = ['phone','tablet','camera','audio','earbud','earbuds','work'];
    const foundCategory = categoryKeywords.find(k => lower.includes(k));

    let filtered = PRODUCTS.slice();
    if (foundCategory) {
      filtered = filtered.filter(p => p.category.includes(foundCategory) || p.name.toLowerCase().includes(foundCategory));
    }
    if (maxPrice != null) {
      filtered = filtered.filter(p => p.price <= maxPrice);
    }

    // simple scoring: closeness to price and presence of tokens
    const tokens = lower.split(/[\s,]+/).filter(Boolean);

    filtered.sort((a,b) => {
      let scoreA = 0;
      let scoreB = 0;
      tokens.forEach(t => {
        if (a.name.toLowerCase().includes(t) || a.category.includes(t) || a.features.join(' ').toLowerCase().includes(t)) scoreA += 1;
        if (b.name.toLowerCase().includes(t) || b.category.includes(t) || b.features.join(' ').toLowerCase().includes(t)) scoreB += 1;
      });
      // prefer cheaper if user mentioned 'budget' or 'under'
      if (lower.includes('budget') || lower.includes('cheap') || priceMatch) {
        scoreA += (1000 - a.price) / 1000;
        scoreB += (1000 - b.price) / 1000;
      }
      return scoreB - scoreA; // descending
    });

    setRecommendations(filtered.slice(0, 6));
  }

  function handleRecommendClick(e) {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter a preference like "I want a phone under $500"');
      return;
    }
    askAIForRecommendations(query.trim());
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">AI Product Recommender</h1>
        <p className="text-sm text-slate-600 mt-1">Type a preference and let the AI pick products from the displayed catalog.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: input + recommended */}
        <div className="md:col-span-1 bg-white p-4 rounded-2xl shadow-sm">
          <form onSubmit={handleRecommendClick}>
            <label className="block text-sm font-medium mb-2">Your preference</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={'e.g. "I want a phone under $500"'}
              className="w-full border rounded-lg p-2 mb-3"
            />
            <button
              onClick={handleRecommendClick}
              className="w-full py-2 rounded-xl font-medium border"
              disabled={loading}
            >
              {loading ? 'Thinking...' : 'Get Recommendations'}
            </button>
          </form>

          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

          <div className="mt-4">
            <h4 className="text-sm font-semibold">AI Results</h4>
            {recommendations.length === 0 ? (
              <div className="text-xs text-slate-500 mt-2">No recommendations yet.</div>
            ) : (
              <ul className="mt-2 space-y-2">
                {recommendations.map(r => (
                  <li key={r.id} className="text-sm">
                    <span className="font-medium">{r.name}</span> — ${r.price}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: product catalog */}
        <div className="md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRODUCTS.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
