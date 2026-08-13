# SkyShop Order Pricing Contract

Every created order should persist both the pre-discount and final customer totals:

- `subtotal`: merchandise subtotal before discounts
- `couponDiscount`: coupon discount amount
- `personalDiscountPercent`: permanent user discount percentage
- `personalDiscountAmount`: permanent user discount amount
- `shipping`: shipping cost
- `tax`: tax amount
- `originalTotal`: amount before the permanent customer discount
- `finalTotal`: amount the customer actually pays
- `total`: same value as `finalTotal` for compatibility
- `userId`: Firebase Auth UID
- `customerName`, `customerPhone`, delivery fields
- `items`: products and quantities

Formula:
`afterCoupon = max(0, subtotal - couponDiscount)`
`personalDiscountAmount = afterCoupon * personalDiscountPercent / 100`
`finalTotal = max(0, afterCoupon - personalDiscountAmount + shipping + tax)`

The admin order page should display `originalTotal`, `personalDiscountAmount`, and `finalTotal`.
