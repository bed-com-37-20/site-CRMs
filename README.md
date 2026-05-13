# tapi-server API Documentation

## Overview

`tapi-server` is a NestJS backend that manages authentication, users, companies, products, events, and carrier applications. The server exposes REST endpoints for CRUD operations, file uploads, and image proxying.

## Base URL

- Default local base URL: `http://localhost:3000`

## Setup

```bash
cd tapi-server
npm install
```

## Run

```bash
npm run start:dev
```

## Authentication

Many endpoints require a Bearer JWT token in the `Authorization` header.

```http
Authorization: Bearer <token>
```

The `AuthGuard` validates the JWT and exposes the token payload as `req.user`.

---

## Endpoints

### Auth

#### POST `/auth/login`

Request body:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fname": "First",
    "lname": "Last",
    "address": "123 Street",
    "password": "hashed-or-plain",
    "profilePicUrl": null,
    "createdAt": "2026-05-13T00:00:00.000Z",
    "updatedAt": "2026-05-13T00:00:00.000Z"
  },
  "token": "jwt.token.string"
}
```

#### PATCH `/auth/reset-password`

Request body:

```json
{
  "email": "user@example.com",
  "newPassword": "newPassword123"
}
```

Response:

```json
true
```

#### GET `/auth/get-current-user`

Headers:

```http
Authorization: Bearer <token>
```

Response:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fname": "First",
  "lname": "Last",
  "address": "123 Street",
  "password": "hashed-or-plain",
  "profilePicUrl": null,
  "createdAt": "2026-05-13T00:00:00.000Z",
  "updatedAt": "2026-05-13T00:00:00.000Z"
}
```

---

### User

#### POST `/user`

Request body:

```json
{
  "email": "user@example.com",
  "fname": "First",
  "lname": "Last",
  "address": "123 Street",
  "password": "password",
  "profilePicUrl": null
}
```

Response: created user object.

#### GET `/user`

Response: array of user objects.

#### GET `/user/:id/profile-pic`

Response: JPEG image stream.

#### GET `/user/:id`

Response: user object.

#### PATCH `/user/:id`

Request body: valid `Prisma.UserUpdateInput` fields.

Response: updated user object.

#### DELETE `/user/:id`

Response: deleted user object or deletion result.

#### POST `/user/:id/upload-profile-pic`

Headers:

```http
Content-Type: multipart/form-data
```

Form fields:

- `file`: profile picture file upload

Response: upload metadata or updated user record.

#### DELETE `/user/:id/profile-pic-delete`

Response: deletion result.

---

### Company

> All `/company` routes require authentication.

#### POST `/company`

Request body:

```json
{
  "name": "Company Name",
  "description": "Company description",
  "address": "123 Business Blvd",
  "phone": "555-1234",
  "email": "company@example.com"
}
```

Response: created company record.

#### GET `/company`

Response: array of company records owned by the authenticated user.

#### GET `/company/:id`

Response: company object.

#### GET `/company/:id/logo`

Response: JPEG image stream.

#### GET `/company/:id/cover-image`

Response: JPEG image stream.

#### PATCH `/company/:id`

Request body: valid `Prisma.CompanyInfoUpdateInput` fields.

Response: updated company object.

#### DELETE `/company/:id`

Response: deleted company record or deletion result.

#### POST `/company/:id/upload-logo`

Form field:

- `file`: company logo file

Response: upload metadata.

#### POST `/company/:id/upload-cover-image`

Form field:

- `file`: company cover image file

Response: upload metadata.

#### POST `/company/:id/upload-file`

Form field:

- `file`: any company-related file

Response: upload metadata.

#### DELETE `/company/:id/logo-delete`

Response: deletion result.

#### DELETE `/company/:id/cover-image-delete`

Response: deletion result.

---

### Products

#### POST `/products`

Query string:

```http
?id=<companyId>
```

Request body:

```json
{
  "name": "Product Name",
  "description": "Product details",
  "price": 9.99,
  "avalailableQuantity": 10,
  "avalability": "IN_STOCK"
}
```

Response: created product object.

#### GET `/products`

Response: array of product objects.

#### GET `/products/:id`

Response: product object.

#### GET `/products/:id/image`

Response: JPEG image stream.

#### PATCH `/products/:id`

Request body: valid `Prisma.ProductUpdateInput` fields.

Response: updated product object.

#### DELETE `/products/:id`

Response: deleted product object or deletion result.

#### POST `/products/:id/upload-image`

Form field:

- `file`: product image file

Response: upload metadata.

#### DELETE `/products/:id/image-delete`

Response: deletion result.

---

### Events

#### POST `/events`

Query string:

```http
?id=<companyId>
```

Request body:

```json
{
  "name": "Event Title",
  "description": "Event description",
  "date": "2026-06-01T12:00:00.000Z"
}
```

Response: created event object.

#### GET `/events`

Query string:

```http
?id=<companyId>
```
```

Headers:

```http
Authorization: Bearer <token>
```

Response: array of event objects.

#### GET `/events/:id`

Response: event object.

#### GET `/events/:id/image`

Response: JPEG image stream.

#### PATCH `/events/:id`

Request body: valid `Prisma.EventUpdateInput` fields.

Response: updated event object.

#### DELETE `/events/:id`

Response: deleted event object or deletion result.

#### POST `/events/:id/upload-image`

Form field:

- `file`: event image file

Response: upload metadata.

#### DELETE `/events/:id/image-delete`

Response: deletion result.

---

### Carriers

#### POST `/carriers`

Query string:

```http
?companyInfoId=<companyId>
```

Request body:

```json
{
  "name": "Carrier Name",
  "description": "Carrier description"
}
```

Response: created carrier object.

#### GET `/carriers`

Query string:

```http
?companyInfoId=<companyId>
```
```

Response: array of carrier objects.

#### GET `/carriers/:id`

Response: carrier object.

#### PATCH `/carriers/:id`

Request body: valid `Prisma.CarrierUpdateInput` fields.

Response: updated carrier object.

#### DELETE `/carriers/:id`

Response: deleted carrier object or deletion result.

#### POST `/carriers/:id/apply`

Headers:

```http
Content-Type: multipart/form-data
```

Fields:

- `fullName` (string)
- `email` (string)
- `phone` (string)
- `position` (string)
- `resume` (file)
- `coverLetter` (file)

Response: created application object.

#### GET `/carriers/:id/applications`

Response: array of application objects.

#### GET `/carriers/applications/:applicationId`

Response: application object.

#### PATCH `/carriers/applications/:applicationId/status`

Request body:

```json
{
  "status": "PENDING"
}
```

Response: updated application object.

#### DELETE `/carriers/applications/:applicationId`

Response: deleted application object or deletion result.

---

## Model shapes

### User

```json
{
  "id": "uuid",
  "email": "string",
  "fname": "string",
  "lname": "string",
  "address": "string",
  "password": "string",
  "profilePicUrl": "string | null",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### CompanyInfo

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "address": "string",
  "phone": "string",
  "email": "string",
  "logoUrl": "string | null",
  "coverImageUrl": "string | null",
  "createdAt": "string",
  "updatedAt": "string",
  "ownerId": "uuid"
}
```

### Product

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "price": 0.0,
  "imageUrl": "string | null",
  "createdAt": "string",
  "updatedAt": "string",
  "status": true,
  "avalailableQuantity": 0,
  "avalability": "IN_STOCK",
  "companyInfoId": "uuid"
}
```

### Event

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "imageUrl": "string | null",
  "date": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "organiserId": "uuid"
}
```

### Carrier

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "companyInfoId": "uuid"
}
```

### Application

```json
{
  "id": "uuid",
  "carrierId": "uuid",
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "position": "string",
  "resumeUrl": "string",
  "coverlettUrUrl": "string | null",
  "status": "PENDING",
  "createdAt": "string",
  "updatedAt": "string"
}
```

## Notes

- Image endpoints return binary JPEG streams and are not JSON responses.
- `/company` routes require JWT authentication.
- `GET /events` requires JWT authentication.
- File uploads use `multipart/form-data`.
- The app uses `process.env.JWT_SECRET` for token signing and validation.

