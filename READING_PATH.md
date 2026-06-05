# Booking App Codebase Reading Path

## Comprehensive Guide to Understanding the Project Structure

---

## PHASE 1: ENTRY POINTS & ARCHITECTURE

1. **README.md** or **Dockerfile** - Project overview
2. **package.json** - Root dependencies and scripts
3. **backend/package.json** - Backend dependencies
4. **frontend/package.json** - Frontend dependencies
5. **railway.json** - Railway deployment config

---

## PHASE 2: BACKEND INITIALIZATION

6. **backend/src/server.js** - Main Express server
7. **backend/src/config/db.js** - Database config
8. **backend/src/utils/initDatabase.js** - DB initialization
9. **backend/src/utils/runMigrations.js** - Migration runner

---

## PHASE 3: DATABASE SCHEMA

10. **backend/database/schema.sql** - Complete DB schema
11. **backend/database/migrations/** - All migration files (in order by date):
    - 2026-03-14-amenities-cards.sql
    - 2026-03-14-amenities-content.sql
    - 2026-03-14-homepage-slides.sql
    - 2026-03-14-landing-content.sql
    - 2026-04-28-booking-ops-upgrades.sql
    - 2026-05-15-inquiries.sql

---

## PHASE 4: MIDDLEWARE & UTILITIES

12. **backend/src/middlewares/auth.middleware.js** - Authentication
13. **backend/src/middlewares/csrf.middleware.js** - CSRF protection
14. **backend/src/middlewares/rateLimit.middleware.js** - Rate limiting
15. **backend/src/middlewares/accountLockout.middleware.js** - Account lockout
16. **backend/src/utils/enums.js** - Constants & enums
17. **backend/src/utils/validation.js** - Input validation
18. **backend/src/utils/activity.js** - Activity logging

---

## PHASE 5: CORE BUSINESS LOGIC UTILS

19. **backend/src/utils/booking.js** - Booking logic

---

## PHASE 6: ROUTES & CONTROLLERS (BY FEATURE)

### Admin & Auth:
- 20. **backend/src/routes/adminAuth.routes.js** → **backend/src/controllers/adminAuth.controller.js**
- 21. **backend/src/routes/adminOps.routes.js** → **backend/src/controllers/adminOps.controller.js**

### Room Management:
- 22. **backend/src/routes/adminRoom.routes.js** → **backend/src/controllers/adminRoom.controller.js**
- 23. **backend/src/routes/catalog.routes.js** → **backend/src/controllers/catalog.controller.js**
- 24. **backend/src/routes/availability.routes.js** → **backend/src/controllers/availability.controller.js**

### Bookings & Reservations:
- 25. **backend/src/routes/reservation.routes.js** → **backend/src/controllers/reservation.controller.js**
- 26. **backend/src/routes/guest.routes.js** → **backend/src/controllers/guest.controller.js**

### Payments & Requests:
- 27. **backend/src/routes/payment.routes.js** → **backend/src/controllers/payment.controller.js**
- 28. **backend/src/routes/request.routes.js** → **backend/src/controllers/request.controller.js**
- 29. **backend/src/routes/inquiry.routes.js** → **backend/src/controllers/inquiry.controller.js**

### Content Management:
- 30. **backend/src/routes/homepageSlide.routes.js** → **backend/src/controllers/homepageSlide.controller.js**
- 31. **backend/src/routes/landingContent.routes.js** → **backend/src/controllers/landingContent.controller.js**
- 32. **backend/src/routes/amenitiesContent.routes.js** → **backend/src/controllers/amenitiesContent.controller.js**
- 33. **backend/src/routes/amenitiesCard.routes.js** → **backend/src/controllers/amenitiesCard.controller.js**

### Reports & Uploads:
- 34. **backend/src/routes/report.routes.js** → **backend/src/controllers/report.controller.js**
- 35. **backend/src/routes/upload.routes.js** → **backend/src/controllers/upload.controller.js**

---

## PHASE 7: FRONTEND ENTRY & ROUTING

36. **frontend/src/main.jsx** - React entry point
37. **frontend/src/App.jsx** - App router & structure

---

## PHASE 8: API SERVICE LAYER

38. **frontend/src/services/api.js** - API client & HTTP calls

---

## PHASE 9: FRONTEND UTILITIES & HOOKS

39. **frontend/src/utils/** - All utility files
40. **frontend/src/hooks/** - All custom hooks

---

## PHASE 10: FRONTEND PAGES (BY FEATURE)

- 41. Guest booking pages
- 42. Admin pages (AdminLayout.jsx, AdminProtectedRoute.jsx)
- 43. Content management pages
- 44. Dashboard pages

---

## PHASE 11: FRONTEND COMPONENTS

45. **frontend/src/components/** - Reusable components

---

## PHASE 12: FRONTEND STYLING

46. **frontend/src/styles/** - Global styles

---

## Reading Strategy

**For optimal understanding, follow this data flow:**

1. **Backend Routes** → Defines API endpoints
2. **Controllers** → Contains business logic for each endpoint
3. **Database** → Stores and retrieves data
4. **Frontend Services** → Makes API calls to backend
5. **Frontend Pages** → Displays data and handles user interactions
6. **Components** → Reusable UI pieces

---

## Key Features to Focus On

### User Authentication
- Admin login flow (adminAuth routes/controller)
- JWT token management
- Account lockout protection

### Room & Availability Management
- Room catalog and details
- Real-time availability checking
- Booking hold management (24-hour expiration)

### Guest Booking Flow
- Reservation creation
- Payment processing
- Status tracking (pending → confirmed → checked_in)

### Admin Operations Dashboard
- Real-time metrics and KPIs
- Activity audit trail
- Bulk operations and reporting

### Content Management
- Homepage slides
- Landing content
- Amenities and amenities cards
- Landing section customization

---

## Project Architecture Overview

```
FRONTEND (Hostinger)
  ↓
BACKEND API (Railway)
  ↓
PostgreSQL Database (Railway)
  ↓
Real-time Data Updates
```

**Frontend:** React app hosted on Hostinger
**Backend:** Express.js API deployed on Railway
**Database:** PostgreSQL on Railway
**File Storage:** S3 or similar for uploads

---

## Deployment

- **Frontend:** Built and deployed to Hostinger's public_html
- **Backend:** Deployed via Railway with Docker
- **Database:** PostgreSQL instance on Railway

---

## Document Version
- **Last Updated:** June 5, 2026
- **Project:** Booking App Standalone
