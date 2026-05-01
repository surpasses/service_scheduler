## Auth

Authentication is stubbed for this exercise due to the time-frame. 
The frontend lets the user pick an identity from a dropdown; the selected `user_id` is persisted in `localStorage`
and sent as `X-User-Id` on every API request. The backend loads the user from
that header and applies role-based authorisation:

## Conventions

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Resource created |
| 400  | Validation error |
| 403  | Not authorised |
| 404  | Resource not found |
| 409  | Conflict (overlap, invalid state transition) |

Errors return `{ "error": "<message>" }`.

---

## Users

### `POST /users`
Create a user.

**Body**
```json
{ "name": "Jane Smith", "role": "technician" }
```
**Response** `201` — `User`

### `GET /users/:id`
Get a user by id.

**Response** `200` — `User` · `404` if not found

### `GET /users?role=technician`
List users, optionally filtered by role.

**Query** `role` (optional): `manager` | `technician`
**Response** `200` — `User[]`

---

## Quotes

### `POST /quotes`
Create a quote. Manager only.

**Body**
```json
{ "description": "Replace kitchen tap", "customer_name": "Smith" }
```
**Response** `201` — `Quote` · `403` if caller is not a manager

### `GET /quotes/:id`
Get a quote by id.

**Response** `200` — `Quote` · `404` if not found

### `GET /quotes?status=unscheduled`
List quotes, optionally filtered by status.

**Query** `status` (optional): `unscheduled` | `scheduled` | `completed`
**Response** `200` — `Quote[]`

---

## Jobs

### `POST /jobs`
Assign a quote to a technician. Creates a job and a `job_assigned` notification
for the technician in a single transaction. Manager only.

**Body**
```json
{
  "quote_id": 1,
  "technician_id": 4,
  "start_time": "2026-05-02T09:00:00Z",
  "end_time":   "2026-05-02T11:00:00Z"
}
```

**Response**
- `201` — `Job`
- `400` — window is not exactly 2 hours, or end_time before start_time
- `403` — caller is not a manager
- `409` — technician has an overlapping scheduled job, or quote is already scheduled


### `GET /jobs/:id`
Get a job by id.

**Response** `200` — `Job` · `404` if not found

### `GET /jobs?technician_id=X`
List jobs. Used by technicians to view their schedule.

**Query**
- `technician_id` (optional)
- `status` (optional): `scheduled` | `completed`

**Response** `200` — `Job[]` ordered by `start_time` ascending

### `POST /jobs/:id/complete`
Mark a job completed. Updates the related quote to `completed` and creates a
`job_completed` notification for the assigning manager. All in one transaction.
Technician only; caller must own the job.

**Response**
- `200` — `Job`
- `403` — caller is not the assigned technician
- `404` — job not found
- `409` — job is not in `scheduled` state

---

<ins>Decisions and Tradeoffs:</ins>

- As authorisation and authentication is out of scope and is hard to implement given the time frame, the API trusts the caller to provide a valid X-User-Id.