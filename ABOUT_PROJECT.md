## Inspiration

Impulse came from something we had all noticed in our own lives: buying something online can take seconds, while the financial and environmental effects last much longer.

Most sustainability solutions focus on what happens after a product has already been manufactured, shipped, and discarded. We wanted to step in earlier, at the exact moment someone clicks **“Place Order.”**

Our goal was not to stop people from buying things or shame them for spending. Instead, we wanted to introduce a thoughtful pause and give users the information they need to answer one question:

> Do I genuinely want this, or am I buying it because checkout makes it easy?

## What it does

**Impulse is a Chrome extension that turns impulse purchases into conscious decisions.**

When a user attempts to place an order on Amazon Australia or SHEIN, Impulse intercepts the checkout and holds the cart for a configurable decision period, set to 24 hours by default.

The Impulse dashboard then shows the user:

- Visually similar products they may already own
- Cheaper secondhand alternatives from eBay
- The purchase price expressed as hours of work
- Estimated water consumption and carbon emissions
- A running total of the money and emissions they have saved
- A history of purchases they released or decided to complete

Users can select **Release & Save** at any time. If they still want the product, **Buy Anyway** unlocks after the timer expires. They can also bypass the timer early by writing down who the purchase is for and why it cannot wait.

Impulse preserves the user's freedom to buy while making the decision more deliberate.

## How we built it

Impulse consists of a **Chrome Manifest V3 extension** and a **FastAPI backend**.

The extension was built with React, TypeScript, Vite, CRXJS, Tailwind CSS, TanStack Query, Framer Motion, Canvas Confetti, and Chrome's extension APIs. A content script detects checkout buttons on supported retailers. When the user clicks one, it extracts the products, images, prices, quantities, and checkout URL from the page. It then prevents the original action and sends the cart to the extension's background service worker, which stores the interception and opens the Impulse dashboard.

The backend was built with Python and FastAPI. It handles Gmail authentication, purchase-history processing, visual product matching, secondhand searches, true-cost estimates, and decision logging.

To discover products the user may already own, Impulse connects to Gmail using read-only OAuth access and parses order-confirmation emails. We use the `clip-ViT-B-32` model to create visual embeddings for product images.

The similarity between a new product embedding \(q\) and a previously purchased product embedding \(p\) is calculated using cosine similarity:

$$
\operatorname{similarity}(q,p)
=
\frac{q \cdot p}
{\lVert q\rVert \lVert p\rVert}
$$

This allows Impulse to recognise visually similar products even when their titles are completely different.

We also reframe the purchase price as time spent working:

$$
\text{work hours}
=
\frac{\text{purchase price}}
{\text{hourly rate}}
$$

For example, a \$120 purchase at an hourly rate of \$30 represents approximately four hours of work. Environmental estimates are calculated from category-based water and carbon data, giving users a more tangible view of the purchase's wider cost.

Finally, Impulse searches the Australian eBay marketplace for relevant secondhand alternatives that are at least 10% cheaper. We also created a curated mock service so the feature remains reliable when production API credentials or external services are unavailable.

## Challenges we ran into

One of our biggest challenges was extracting accurate product information from retailer checkout pages. Amazon and SHEIN use complex, dynamically rendered markup that can change without warning. Some product titles only appear in image attributes, while prices and quantities may be located in completely different parts of the page.

To make the extension more resilient, we implemented retailer-specific selectors alongside generic fallbacks, image-based title extraction, multi-item cart parsing, quantity detection, and duplicate removal.

Another challenge was intercepting checkout synchronously. The extension must decide whether to block the click before the browser completes the order, but Chrome's storage APIs are asynchronous. We solved this by maintaining synchronously readable copies of important settings, such as minimum purchase thresholds, category exemptions, and temporary buy passes.

Gmail order emails were also difficult to process consistently. Different retailers use different layouts, naming conventions, and image formats. We created retailer-specific parsers and seeded realistic demonstration emails so we could test the full OAuth, email parsing, and visual-matching pipeline without placing real orders.

External APIs presented another risk. Marketplace API approval, credentials, rate limits, and network availability could all affect a live demonstration. We designed the secondhand service with interchangeable live and mock implementations so the rest of the product would continue working reliably.

The final challenge was designing the right amount of friction. If Impulse were too easy to dismiss, it would not change behaviour. If it were too restrictive, users would disable it. We addressed this with configurable hold times, minimum price thresholds, category exemptions, and a reflective early-bypass flow.

## Accomplishments that we're proud of

We are proud that Impulse works at the actual moment of purchase rather than acting as a separate budgeting dashboard that users must remember to open.

We built an end-to-end system that can:

- Detect and intercept real checkout attempts
- Extract multiple products from a live shopping cart
- Synchronise purchase history through Gmail
- Match visually similar products using CLIP
- Find cheaper secondhand alternatives
- Calculate financial and environmental costs
- Track released purchases and money saved
- Return users to checkout if they consciously decide to buy

The purchase history used by the matching pipeline is not hardcoded. Impulse can parse realistic order-confirmation emails and use machine learning to identify items the user may already own.

We also built a complete demonstration environment, including seeded emails, mock marketplace results, resettable user data, and a risk-free checkout page. This allowed us to test the full experience without making real purchases.

The result supports more sustainable choices without taking control away from the user.

## What we learned

We learned that behavioural technology does not need to make decisions for people. A pause at the right moment, backed by personal and relevant information, can be more useful than a generic warning.

We also gained a much deeper understanding of browser-extension architecture. Content scripts, background service workers, Chrome storage, OAuth callbacks, dynamically changing pages, and backend APIs all had to cooperate to make one interaction feel seamless.

From the machine-learning side, we learned that multimodal embeddings are particularly valuable for shopping data. Product names are often vague, promotional, or inconsistent, while images can reveal that two differently named products are functionally very similar.

We also learned the importance of designing for failure. External APIs, retailer markup, image URLs, and OAuth flows can all break independently. Building fallbacks and separating integrations into replaceable services made the project much more resilient.

We learned that sustainability is also a timing and product-design problem. People may already understand that unnecessary consumption has a cost, but that information needs to appear while it can still influence their decision.

## What's next for Impulse

The next step is to expand Impulse beyond Amazon Australia and SHEIN by creating a more adaptable retailer-integration system.

We also want to:

- Support additional shopping platforms
- Improve product-level environmental estimates
- Add optional personal budgets and savings goals
- Detect recurring impulse-spending patterns
- Provide weekly insights into purchases avoided
- Strengthen privacy controls and local data processing
- Improve matching when product images are missing or expired
- Add shared household purchase histories
- Partner with verified secondhand marketplaces
- Make checkout detection more resilient to website changes

We want Impulse to sit between wanting something and buying it, helping people spend less, waste less, and avoid purchases they are likely to regret.
