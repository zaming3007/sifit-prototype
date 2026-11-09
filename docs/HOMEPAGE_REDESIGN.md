# Homepage redesign

Implemented in the existing React/Vite frontend. Backend contracts remain in use.

## References consulted

- https://www.zara.com/us/en/woman-new-in-l1180.html — new-arrival and editorial collection structure.
- https://www.vinted.com/ — searchable resale catalogue, price, size and condition.
- https://www.thredup.com/women/new-in — new-arrival browsing and category navigation.

Design interpretation: warm off-white, black type, lime accents, a fashion hero, shopping categories, real API product collections, style inspiration and a selling entry point. No copied promotions or fabricated sales/reviews.

## Image assets

Built-in Imagegen was used. The logo is a transparent version derived from the supplied reference, not the original vector master. Existing source assets are retained.

- `src/image/logo-favicon/sifit-mark.png`: transparent black SiFit logo.
- `src/image/banner/sifit-style-edits.png`: three-panel AI-generated editorial inspiration image. It does not represent specific inventory.

### Logo prompt

Use case: background-extraction. Edit target: the user's attached black SiFit logo on a white square. Produce a clean transparent PNG of exactly this existing logo, with tight landscape framing around the full mark (black handwritten 'SiFit', asymmetric thin sweeping oval from left around the top to the upper right and lower curve, and small separate black dot at lower right). Remove only the white background and vast empty margins. Preserve the exact lettering, case, stroke shapes, oval and dot. No redesign, no additional text, no shadows, no white background. Output logo only.

### Editorial image prompt

Use case: photorealistic-natural. Asset type: a single panoramic triptych fashion editorial image for a Vietnamese pre-loved fashion shop's three collection cards. Create a wide horizontal 3:1 image made of three equal-width square photographic panels edge-to-edge, no borders or gutters, absolutely no text, logos or watermarks. Left third: a stylish adult Vietnamese woman in a relaxed ivory cotton blouse and chocolate tailored trousers, full body, candid walking pose outside a warm cream stone cafe in soft daylight. Center third: a different adult Vietnamese woman with short dark hair wearing a blue denim jacket, white tee and wide-leg faded blue jeans, full body, casual confident pose on a muted pale concrete city street. Right third: a third adult Vietnamese woman in an elegant flowing sage green midi dress and small black shoulder bag, full body in soft garden light beside a pale stucco wall. Contemporary attainable street style, pre-loved fashion, restrained warm natural colors, realistic fabric textures, understated premium ecommerce editorial photography. Every outfit and face must stay within its own square third. All three distinct scenes have consistent photographic quality. No collaged product cutouts. No lettering.

## Validation

## Shopping and selling pages

The catalogue and public selling page now use the same visual language as the homepage. The existing Seller Studio and backend contracts remain in use.

- Catalogue: category shortcuts, local search input, server-side combined filters, sorting, pagination, removable filter chips including price/condition, price presets, mobile filter controls, loading/error/empty states, existing wishlist/cart/product actions.
- Selling: seller-signup/Studio entry points, listing workflow, preparation checklist, expandable FAQs, existing selling-guide anchors and impact link.
- Existing integration suite passed after these changes, including draft/image/submission/moderation, catalogue filters/pagination, wishlist/cart, checkout, shipping and payouts.
- Chrome checks passed for both pages in Vietnamese and English at 320, 390, 768 and 1440 px. Additional CTA, guide navigation, FAQ, price-preset and mobile filter checks passed.
- Screenshots: ignored `artifacts/shop-sell/` directory.

### Homepage validation

- Vite production build.
- Existing integration suite with disposable MongoDB replica set: all scenarios passed, no browser runtime errors.
- Chrome homepage checks: API product collections, budget and condition filters, category navigation, responsive layouts at 320, 390, 768 and 1440 pixels.
- Screenshots: ignored `artifacts/homepage/` directory.

