# Implementation Plan - Multi-Restaurant Rating Support

This plan outlines the changes needed to allow users to rate each restaurant independently in a multi-restaurant order.

## User Review Required

> [!IMPORTANT]
> - Users will be prompted to rate each restaurant in their order sequentially.
> - For Mart orders with multiple brands, we will currently still use a single "Store/Brand" rating unless SubOrders are implemented for Mart as well.

## Proposed Changes

### [Backend]
#### [MODIFY] [business-review.entity.ts](file:///d:/mart/baldia-mart/backend-api/src/common/business-review.entity.ts)
- Add `subOrderId` field (nullable) to link to the specific sub-order.
- Update indices if necessary.

#### [MODIFY] [business-reviews.service.ts](file:///d:/mart/baldia-mart/backend-api/src/reviews/business-reviews.service.ts)
- Update [create](file:///d:/mart/baldia-mart/backend-api/src/riders/riders.service.ts#36-40) method to allow multiple reviews for the same `orderId` if they have different `subOrderId` or `restaurantId`.
- Validate that the restaurant/brand actually exists in the order.

### [Mobile App]
#### [MODIFY] [OrderTrackingScreen.tsx](file:///d:/mart/baldia-mart/mobile-user-app/src/screens/OrderTrackingScreen.tsx)
- Add `businessesToRate` state to store the list of restaurants/brands from the order.
- Add `currentBusinessIndex` state to track progress.
- Update the rating modal to loop through all `businessesToRate` after the Rider rating step.

## Verification Plan

### Automated Tests
- Post multiple reviews for the same order via Postman/API and verify they are stored correctly.

### Manual Verification
- Place an order with 2 different restaurants.
- Deliver the order and verify the rating modal prompts for Rider, then Restaurant 1, then Restaurant 2.
