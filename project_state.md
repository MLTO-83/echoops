# Feature: Project Status (State) Selection

## Purpose

Allow users to select and update the current status of a project via a dropdown menu on the project's page.

## User Story

As a user, I want to be able to select a project status from a predefined list so that it is clear to all stakeholders which phase the project is currently in.

## Functionality

- A dropdown menu is displayed on the project's page.
- Users can select one status from the predefined list.
- The selected status is saved and consistently shown on the project's page.
- Validation: only valid statuses can be selected.
- Changes to project status are logged via the `updatedAt` timestamp.
- New projects are assigned the default status `New`.

## Project Statuses (States)

| **ID**          | **Display Name** | **Description**                                                                    |
| --------------- | ---------------- | ---------------------------------------------------------------------------------- |
| `new`           | New              | The project is created but not yet approved.                                       |
| `approved`      | Approved         | The project is approved and ready to start.                                        |
| `in_progress`   | In Progress      | The project is active and ongoing.                                                 |
| `in_production` | In Production    | The project has been completed and the result is now live (e.g., a system in use). |
| `closed`        | Closed           | The project is officially closed and archived.                                     |
| `on_hold`       | On Hold          | The project is temporarily paused.                                                 |
| `cancelled`     | Cancelled        | The project has been stopped before completion.                                    |

## Prisma Data Model

```prisma
model Project {
  id        String   @id @default(cuid())
  name      String
  // other fields...

  stateId   String   @default("new")
  state     State    @relation(fields: [stateId], references: [id], onDelete: Restrict)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model State {
  id          String   @id            // e.g. "new", "approved", etc.
  name        String   @unique        // Display name shown in UI
  description String?

  projects    Project[]
}
```
