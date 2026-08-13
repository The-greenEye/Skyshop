# SkyShop Final Static Firebase Edition

## Stack
- HTML5
- CSS3
- Vanilla JavaScript ES Modules
- Firebase v12.17.1 CDN
- Firebase Authentication
- Cloud Firestore
- Cloudinary unsigned uploads

## Run
Use VS Code Live Server or another local HTTP server. Do not open index.html with `file://`.

## Firebase
Enable:
- Authentication > Email/Password
- Firestore Database

The Firebase configuration is in `js/firebase.js`.

## Cloudinary
Configured:
- Cloud name: `dgfcfpl1n`
- Upload preset: `skyshop_uploads`
- Unsigned upload

Never put a Cloudinary API Secret in frontend code.

## Firestore rules
`firestore.rules` is a starting point. Deploy it only after reviewing it for your project and before production use.

## Important
The frontend creates user profile documents at `users/{Firebase UID}`.
Orders are created at `orders/{orderId}`.
Product/site-setting reads are supported by the UI, with local fallback data so the storefront remains usable if Firestore collections are not seeded yet.
