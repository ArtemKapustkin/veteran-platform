# Veteran Platform

Платформа подій для ветеранів — реєстрація на події, спільноти, верифікація через AI vision.

## Repository layout

```
backend/   — Go API service (fasthttp + bun + fx)
frontend/  — UI (TBD)
```

## Roles

- **veteran** — phone+OTP auth. Browses/creates communities, registers for events
  (solo or group of up to 4), submits event proposals for admin approval.
- **admin** — single bootstrapped account (email+password). Approves veteran-submitted
  events, creates events directly, moderates verifications and communities.

## API contract

The OpenAPI 3.0 spec is the source of truth: [`backend/openapi.yaml`](backend/openapi.yaml).
It is updated on every contract change before code follows.

## Deployment target

Containerised — designed to be portable for the Ministry of Veterans to deploy
on any platform (Docker Compose for trial, Kubernetes/Helm for production).
