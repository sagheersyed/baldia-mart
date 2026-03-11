# Baldia Mart (Baldia Edition) - API Documentation

## Base URL
`/api/v1`

## Authentication

### POST `/auth/login`
- **Description:** Authenticates user via Firebase token.
- **Headers:** `Authorization: Bearer <FIREBASE_ID_TOKEN>`
- **Returns:** JWT Token for subsequent requests.

---

## Products & Categories

### GET `/categories`
**(Public)** Fetch all active categories.

### GET `/products`
**(Public)** Fetch all active products in the inventory.

### GET `/products/category/:categoryId`
**(Public)** Get products specific to a category.

---

## Orders & Checkout (Hyperlocal Core)

### POST `/orders/checkout`
**(Protected - JWT)** Places a new order from items inside the user's cart. 
**Crucial:** This endpoint calculates the Haversine distance from the requested `addressId` to the center of the configured `Baldia Town` delivery zones. If distance is `> 50km`, it returns a `400 Bad Request`.
- **Payload:**
```json
{
  "addressId": "uuid",
  "paymentMethod": "cod",
  "notes": "Deliver at the back door"
}
```

### GET `/orders/history`
**(Protected - JWT)** Retrieve order history for the current logged-in user.

---

## Admin Analytics

### GET `/admin/analytics`
**(Protected - Admin JWT)** Get system-wide metrics (total orders, users, revenue) for the Next.js Dashboard.
