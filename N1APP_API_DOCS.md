# N1App API Documentation

**Base URL**: `https://api.n1boost.com`

This document provides details for the N1App integration endpoints. These endpoints are designed to allow boosters to access their claimed orders and specific order details via a secure API.

## Authentication

All endpoints require the following authentication mechanisms:

**API Key**: Must be provided in the request **Header**.
    -   Key: `x-api-key`
    -   Value: Provided by the administrator (e.g., `UP5h8LIL5t3PdAFxMw5jinWsT1I7sW3N`)

---

## Endpoints

### 1. Get Claimed Boost Orders

Retrieves a list of boost orders claimed by the authenticated booster.
**Note:** Only orders with status **1 (Active)**, **3 (Completed)**, or **4 (Cancelled)** are returned.

-   **URL**: `/v1/n1app/claimed-boost-orders`
-   **Method**: `POST`
-   **Query Parameters**:
    -   `page` (optional): Page number (default: 1)
    -   `limit` (optional): Items per page (default: 5)

#### Request Body
```json
{
  "email": "booster@example.com",
  "password": "your_secure_password"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "order_id": "7034875e-cb65-4f7c-9237-d779ba0a2b00",
      "type": "boost",
      "price": null,
      "currency": "USD",
      "status": 1,
      "created_at": "2025-12-25T16:36:21.000Z",
      "updated_at": "2025-12-26T12:02:38.000Z",
      "is_customer_vip": false,
      "data": {}
    },
    {
      "order_id": "c15a1760-8e5a-4d24-a79e-1b187605f45a",
      "type": "boost",
      "price": 8.49,
      "currency": "USD",
      "status": 3,
      "created_at": "2025-12-25T16:36:10.000Z",
      "updated_at": "2025-12-26T12:02:05.000Z",
      "is_customer_vip": true,
      "data": {
        "type": "boost",
        "service": "marvel-rivals-unlock-competitive-boost",
        "server": "Europe",
        "platform": "PC",
        "options": [
          "OFF",
          "LGN"
        ],
        "reff_code": null,
        "language": "en"
      }
    },
    {
      "order_id": "552fdb0c-9566-484c-9705-36600654df37",
      "type": "boost",
      "price": 405.4,
      "currency": "USD",
      "status": 3,
      "created_at": "2025-12-25T16:35:57.000Z",
      "updated_at": "2025-12-26T12:02:00.000Z",
      "is_customer_vip": true,
      "data": {
        "type": "boost",
        "service": "marvel-rivals-achievement-boost",
        "server": "Europe",
        "platform": "PC",
        "achievements": [
          "Inevitable",
          "All Eyes On Me"
        ],
        "options": [
          "OFF",
          "LGN"
        ],
        "reff_code": null,
        "language": "en"
      }
    },
    {
      "order_id": "6bed40d0-b2f5-437b-9f6b-383bd928f6bb",
      "type": "boost",
      "price": 0.49,
      "currency": "USD",
      "status": 3,
      "created_at": "2025-12-25T16:35:42.000Z",
      "updated_at": "2025-12-26T12:05:02.000Z",
      "is_customer_vip": true,
      "data": {
        "type": "boost",
        "service": "marvel-rivals-win-boost",
        "current_rank": "Silver",
        "current_rank_tier": 3,
        "desired_count": 1,
        "server": "Europe",
        "platform": "PC",
        "options": [
          "OFF",
          "LGN"
        ],
        "roles": [],
        "heroes": [],
        "reff_code": null,
        "language": "en"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 4,
    "limit": 5
  },
  "message": "Claimed boost orders retrieved successfully."
}
```

---

### 2. Get Claimed Boost Order Detail (Pre-Order Info)

Retrieves specific pre-order details (account credentials, notes, etc.) for a claimed order.
**Security Check:** The authenticated user MUST be the claimant (recipient) of the order to access this data.

-   **URL**: `/v1/n1app/claimed-boost-orders/:order_id/detail`
-   **Method**: `POST`
-   **URL Parameters**:
    -   `order_id`: The ID of the order (e.g., `ORD-12345`)

#### Request Body
```json
{
  "email": "booster@example.com",
  "password": "your_secure_password"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "name": "test",
    "accountName": "test",
    "accountPassword": "test",
    "note": "test"
  }
}
```

#### Response if Pre-Order Data is Missing (200 OK)
```json
{
  "success": true,
  "message": "No pre-order details available",
  "data": null
}
```

#### Error Responses
-   **400 Bad Request**: Missing email/password.
-   **401 Unauthorized**: Invalid API Key, Invalid Credentials, or User is not a booster.
-   **403 Forbidden**: User is not authorized to view this order (not the claimant).
-   **404 Not Found**: Order ID not found.
