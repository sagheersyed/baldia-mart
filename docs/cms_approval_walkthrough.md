# Baldia Mart – Multi-Tenant Business CMS & Approval Workflow Implementation Walkthrough

This document outlines the architecture and implementation details for the newly created Business CMS and Approval Workflow engine in the NestJS backend.

---

## 1. Core Changes & Additions

### [NEW] CMS Module & Infrastructure
All the CMS-related code has been created under `backend-api/src/cms/`:

* **`cms.module.ts`**: The main entry point of the CMS module registering TypeORM entities, controllers, providers, and BullMQ moderation queue.
* **`guards/tenant.guard.ts`**: Strict security gate validating that the user is an active member of the target tenant, verifying that the tenant is active, and checking tenant-level roles.
* **`decorators/tenant-roles.decorator.ts`**: `@TenantRoles('owner', 'manager')` decorator to enforce action-level authorizations.

---

### [NEW] Database Entities
We added 6 new tables to represent tenants, roles, change requests, discussions, rules, and audit logs:

* **`Tenant`** (`tenants` table): Represents a business vertical entity mapping to grocery, restaurant, or pharmacy.
* **`TenantUser`** (`tenant_users` table): Bridges users to tenants with specific roles (`owner`, `manager`, `staff`, `pharmacist`, `assistant_pharmacist`).
* **`ChangeRequest`** (`change_requests` table): Records proposed actions (CREATE, UPDATE, DELETE) using RFC 6902 JSON Patches.
* **`ChangeRequestDiscussion`** (`change_request_discussions` table): Merchant-admin negotiation messages.
* **`ApprovalRule`** (`approval_rules` table): Rule config for auto-approval.
* **`AuditLog`** (`audit_logs` table): Append-only audit logger.

---

### [NEW] Core Services & Workers
* **`AuditService`**: Logs all actions asynchronously.
* **`ApprovalRuleService`**: Evaluates JSON patches against configured rules.
* **`ChangeRequestService`**: Manages status lifecycle (draft, submitted, under review, approved, rejected, published).
* **`MergeService`**: Applies approved JSON patches inside database transactions.
* **`CmsModerationProcessor`**: BullMQ queue processor running auto-approval checks and publishing changes.

---

### [NEW] API Controllers
* **`TenantController`**: Admin endpoints to manage tenants and memberships.
* **`ChangeRequestController`**: Generic moderation flow endpoints.
* **`ApprovalRuleController`**: Admin rules configuration.
* **`VendorCmsController`**: Grocery/mart CMS operations.
* **`RestaurantCmsController`**: Restaurant CMS operations.
* **`PharmacyCmsController`**: Pharmacy CMS operations.

---

## 2. Compilation and Verification

* **NestJS Compilation**: Verified by running `npm run build` in `backend-api`. All files compiled successfully to the `dist/` folder.
* **TypeORM Database Schema Synchronization**: The newly registered entities will be automatically created on application startup due to the configuration of `TypeOrmModule` in development.
