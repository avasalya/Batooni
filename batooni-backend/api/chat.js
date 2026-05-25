export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { query, userId, products, metadata, history } = req.body;

    const cleanProducts = Array.isArray(products) ? products : [];
    const cleanMetadata = Array.isArray(metadata) ? metadata : [];
    const conversationHistory = Array.isArray(history) ? history : [];
    
    // Normalize user query by stripping conversational phrases for cleaner keyword matching
    let userQuery = (query || "").toLowerCase().trim();
    userQuery = userQuery
      .replace(/tell me about the/g, "")
      .replace(/tell me about/g, "")
      .replace(/what is your/g, "")
      .replace(/do you have/g, "")
      .replace(/show me/g, "")
      .trim();

    // 1. INTENT EXTRACTION: Identify if the user wants info/policies or products
    const infoKeywords = ["shipping", "rate", "rates", "delivery", "track", "about", "us", "brand", "story", "policy", "return", "refund", "exchange", "terms", "service", "privacy", "contact", "help"];
    const isInfoIntent = infoKeywords.some(keyword => userQuery.includes(keyword));

    let optimizedMeta = [];
    let optimizedProducts = [];

    if (isInfoIntent) {
      // Prioritize ALL pages, blogs, and policies. Do not filter them out.
      optimizedMeta = cleanMetadata.slice(0, 40).map(m => ({
        title: m.title.replace(/"/g, '\\"'),
        type: m.type,
        url: m.url || "#"
      }));
      
      // Send a small sample of items just as a backup context
      optimizedProducts = cleanProducts.filter(p => p && p.title).slice(0, 5).map(p => ({
        title: p.title.replace(/"/g, '\\"'),
        url: p.url || "#"
      }));
    } else {
      // Shopping intent: Apply keyword matching filter to protect token boundaries
      let filteredProducts = cleanProducts.filter(p => p && p.title);
      const keywords = userQuery.split(/\s+/).filter(k => k.length > 1);

      if (keywords.length > 0 && !["best products", "best seller", "best sellers", "catalog", "all", "everything"].includes(userQuery)) {
        filteredProducts = filteredProducts.filter(p => {
          const titleLower = p.title.toLowerCase();
          return keywords.some(keyword => titleLower.includes(keyword));
        });
      }

      if (filteredProducts.length === 0) {
        filteredProducts = cleanProducts.filter(p => p && p.title).slice(0, 20);
      }

      optimizedProducts = filteredProducts.slice(0, 25).map(p => ({
        title: p.title.replace(/"/g, '\\"'),
        url: p.url || "#"
      }));

      // Send a small structural meta list for catalog reference
      optimizedMeta = cleanMetadata.filter(m => m && m.type === "Collection/Category/Page").slice(0, 10).map(m => ({
        title: m.title.replace(/"/g, '\\"'),
        type: m.type,
        url: m.url || "#"
      }));
    }

    const systemPrompt = `You are Batooni, an exact, zero-fluff AI Shopping Assistant. 
Analyze the live store structure, metadata, policies, and products provided below to serve exactly what matches the user's intent.

Strict Execution Rules:
1. NO BS, NO CONVERSATIONAL FILLER, NO INTROS, NO OUTROS: Do not add conversational sentences, pleasantries, explanations, or text formatting outside anchors.
2. Direct Output Format: Return ONLY raw HTML anchor tags of the matching entries separated by a space or line break. No surrounding textual commentary.
3. Matching Intent: If the user asks about shipping, brand information, or store policies, select the direct matching link from the Available Site Content context. Do not output "No specific products found" if an informational metadata match is present.
4. If no valid link entry can be dynamically extracted to fit the request, then run the query on "https://YOURSTORE.com/search?q=&options%5Bprefix%5D=last" and return exactly the top 3 product links as anchors. Do not return "No specific products found" if you can pull any relevant product links from the search results.
5. LINK FORMAT RULE: You must build your HTML anchors exactly like this: <a href="URL" target="_blank" rel="noopener noreferrer" style="color:#1C1D1D;text-decoration:underline;"><strong>TITLE</strong></a>
6. NEVER append prices, descriptions, or currencies under any circumstance.

Available Site Content Context (Pages, Policies, Collections, Blogs):
${JSON.stringify(optimizedMeta)}

Available Store Inventory Catalog:
${JSON.stringify(optimizedProducts)}`;

    const compiledMessages = [
      { role: "system", content: systemPrompt }
    ];

    conversationHistory.slice(-2).forEach(item => {
      const cleanHistoryText = item.text ? item.text.replace(/<think>[\s\S]*?<\/think>/g, "").trim() : "";
      if (cleanHistoryText) {
        compiledMessages.push({
          role: item.role === "User" ? "user" : "assistant",
          content: cleanHistoryText
        });
      }
    });

    compiledMessages.push({ role: "user", content: query || "" });

    // Zero-overhead logging: Instantly tracks data without server latency/timeouts
    console.log(JSON.stringify({
      event: "chat_interaction",
      unique_user: userId || "anonymous",
      user_query: query || "", // <--- THIS SEES THE EXACT MESSAGE TYPED
      query_length: (query || "").length,
      timestamp: new Date().toISOString()
    }));
    
    // Using llama-3.3-70b-versatile for higher structural token throughput rules
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: compiledMessages,
        max_tokens: 400,
        temperature: 0.1
      })
    });

    const data = await groqResponse.json();
    if (data.error) {
      return res.status(200).json({ response: `Error: ${data.error.message}` });
    }

    let aiOutput = data.choices[0]?.message?.content || "";
    aiOutput = aiOutput.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    return res.status(200).json({ response: aiOutput || "No specific products found." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}