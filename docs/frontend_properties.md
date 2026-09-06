# Vistora Frontend Properties Integration Guide

> **Target Audience:** Frontend Developers (Vue 3 / React / TanStack Query)  
> **Backend Base URL:** `http://localhost:5000`  
> **Module Base Route:** `http://localhost:5000/api/properties`  
> **Default Headers:** `Content-Type: application/json`

---

## 📌 1. Overview & RBAC Permissions

The Properties module powers both public stay discovery for **Guests** and property listing/management for **Hosts**.

| Endpoint | Method | Role Required | Description |
|---|---|---|---|
| `/api/properties` | `GET` | 🌐 **Public** | Browse all active properties (discovery) |
| `/api/properties/:id` | `GET` | 🌐 **Public** | View full details of a single property (photos, amenities, host) |
| `/api/properties` | `POST` | 🔒 **HOST only** | Create a new property listing with images & amenities |
| `/api/properties/my-properties` | `GET` | 🔒 **HOST only** | Fetch all listings created by the logged-in host |

> [!IMPORTANT]
> All protected Host routes require the **Access Token** passed in the HTTP Authorization header:  
> `Authorization: Bearer <accessToken>`

---

## 📐 2. TypeScript Types & Interfaces

```typescript
export interface PropertyImage {
  id: number;
  url: string;
}

export interface Amenity {
  id: number;
  name: string;
}

export interface Property {
  id: number;
  host_id: number;
  title: string;
  description: string | null;
  location: string;
  price_per_night: string; // Decimal from PostgreSQL returned as string
  max_guests: number;
  is_active: boolean;
  created_at: string;
  images: PropertyImage[];
  amenities?: Amenity[];
  host_name?: string;
  host_email?: string;
  host_mobile?: string;
}

export interface CreatePropertyPayload {
  title: string;
  description?: string;
  location: string;
  price_per_night: number;
  max_guests: number;
  images?: string[];
  amenity_ids?: number[];
}

export interface PropertyListResponse {
  count: number;
  properties: Property[];
}

export interface SinglePropertyResponse {
  property: Property;
}

export interface CreatePropertyResponse {
  message: string;
  property: Property;
}
```

---

## 📡 3. Complete API Specifications

### 3.1 Browse All Active Properties (`GET /api/properties`)
Used on the home/explore page for guests to discover available stays.

- **Method:** `GET`
- **URL:** `/api/properties`
- **Headers:** None (Public)
- **Response `200 OK`:**
```json
{
  "count": 1,
  "properties": [
    {
      "id": 1,
      "title": "Sunset Beach Villa",
      "location": "Goa",
      "price_per_night": "8500.00",
      "max_guests": 6,
      "created_at": "2026-09-06T20:38:16.841Z",
      "images": [
        {
          "id": 1,
          "url": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
        }
      ]
    }
  ]
}
```

---

### 3.2 Get Single Property Details (`GET /api/properties/:id`)
Used on the property details page (`/properties/:id`). Returns photos, amenities, and host contact details.

- **Method:** `GET`
- **URL:** `/api/properties/1`
- **Headers:** None (Public)
- **Response `200 OK`:**
```json
{
  "property": {
    "id": 1,
    "host_id": 7,
    "title": "Sunset Beach Villa",
    "description": "Spectacular sea view villa with private pool",
    "location": "Goa",
    "price_per_night": "8500.00",
    "max_guests": 6,
    "is_active": true,
    "created_at": "2026-09-06T20:38:16.841Z",
    "host_name": "Demo Host",
    "host_email": "host@vistora.com",
    "host_mobile": "9000000001",
    "images": [
      {
        "id": 1,
        "url": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
      },
      {
        "id": 2,
        "url": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750"
      }
    ],
    "amenities": [
      {
        "id": 1,
        "name": "WiFi"
      },
      {
        "id": 2,
        "name": "Air Conditioning"
      },
      {
        "id": 3,
        "name": "Swimming Pool"
      }
    ]
  }
}
```

- **Error `400 Bad Request` (Invalid ID):**
```json
{
  "message": "Invalid property ID. It must be a positive integer"
}
```

- **Error `404 Not Found` (Non-existent Property):**
```json
{
  "message": "Property not found"
}
```

---

### 3.3 Create New Property Listing (`POST /api/properties`)
Used by Hosts to list a new property with multiple image URLs and selected amenities.

- **Method:** `POST`
- **URL:** `/api/properties`
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <HOST_ACCESS_TOKEN>
  ```
- **Request Body:**
```json
{
  "title": "Sunset Beach Villa",
  "description": "Spectacular sea view villa with private pool",
  "location": "Goa",
  "price_per_night": 8500,
  "max_guests": 6,
  "images": [
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750"
  ],
  "amenity_ids": [1, 2, 3]
}
```

- **Validation Rules (Zod enforced):**
  - `title`: String, min 3, max 150 chars (Required)
  - `description`: String, max 2000 chars (Optional)
  - `location`: String, min 2, max 150 chars (Required)
  - `price_per_night`: Number > 0 (Required)
  - `max_guests`: Integer >= 1 (Required)
  - `images`: Array of valid URL strings (Optional, default `[]`)
  - `amenity_ids`: Array of integer IDs (Optional, default `[]`)

- **Response `201 Created`:**
```json
{
  "message": "Property created successfully",
  "property": {
    "id": 1,
    "host_id": 7,
    "title": "Sunset Beach Villa",
    "description": "Spectacular sea view villa with private pool",
    "location": "Goa",
    "price_per_night": "8500.00",
    "max_guests": 6,
    "is_active": true,
    "created_at": "2026-09-06T20:38:16.841Z",
    "images": [
      {
        "id": 1,
        "url": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
      }
    ],
    "amenities": [
      {
        "id": 1,
        "name": "WiFi"
      }
    ]
  }
}
```

- **Error `403 Forbidden` (If Guest tries to create):**
```json
{
  "message": "Forbidden: Access restricted to [HOST]"
}
```

---

### 3.4 Host's Own Listings (`GET /api/properties/my-properties`)
Used on the Host Dashboard to manage their properties.

- **Method:** `GET`
- **URL:** `/api/properties/my-properties`
- **Headers:**
  ```http
  Authorization: Bearer <HOST_ACCESS_TOKEN>
  ```
- **Response `200 OK`:**
```json
{
  "count": 2,
  "properties": [
    {
      "id": 1,
      "host_id": 7,
      "title": "Sunset Beach Villa",
      "description": "Spectacular sea view villa with private pool",
      "location": "Goa",
      "price_per_night": "8500.00",
      "max_guests": 6,
      "is_active": true,
      "created_at": "2026-09-06T20:38:16.841Z",
      "images": [
        {
          "id": 1,
          "url": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
        }
      ]
    }
  ]
}
```

---

## 🪝 4. TanStack Query Frontend Hooks Example

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'; // or '@tanstack/react-query'
import api from '../api/client';
import type { 
  PropertyListResponse, 
  SinglePropertyResponse, 
  CreatePropertyPayload,
  CreatePropertyResponse 
} from '../types/property.types';

// 1. Fetch All Properties (Public Browse)
export function usePropertiesQuery() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data } = await api.get<PropertyListResponse>('/properties');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

// 2. Fetch Single Property Details
export function usePropertyDetailQuery(propertyId: () => number) {
  return useQuery({
    queryKey: ['properties', propertyId],
    queryFn: async () => {
      const { data } = await api.get<SinglePropertyResponse>(`/properties/${propertyId()}`);
      return data.property;
    },
    enabled: () => !!propertyId() && propertyId() > 0,
  });
}

// 3. Fetch Host's Listings
export function useHostPropertiesQuery() {
  return useQuery({
    queryKey: ['properties', 'my-properties'],
    queryFn: async () => {
      const { data } = await api.get<PropertyListResponse>('/properties/my-properties');
      return data.properties;
    },
  });
}

// 4. Create Property Mutation
export function useCreatePropertyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePropertyPayload) => {
      const { data } = await api.post<CreatePropertyResponse>('/properties', payload);
      return data;
    },
    onSuccess: () => {
      // Invalidate queries so listings update automatically
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties', 'my-properties'] });
    },
  });
}
```

---

## 🏷️ 5. Pre-Seeded Starter Amenities
For frontend checkboxes or select dropdowns, these standard amenity IDs are pre-seeded in the database:

| ID | Amenity Name |
|---|---|
| `1` | WiFi |
| `2` | Air Conditioning |
| `3` | Swimming Pool |
| `4` | Free Parking |
| `5` | Kitchen |
| `6` | TV |
| `7` | Dedicated Workspace |
| `8` | Washing Machine |
