# Cloud Service Classification — ShopSphere

**Student ID:** 30903180103559
**Project:** ShopSphere Enterprise Production and Cloud Modernization

Three cloud services are in use in the production deployment. Each is
classified by its service model, with the reason for that classification.

| Service | Role in ShopSphere | Service model | Reason |
|---|---|---|---|
| **Vercel — frontend hosting** | Serves the React storefront at `shopsphere-storefront.vercel.app` | **PaaS** | Vercel builds and hosts code that I deploy, while it owns the servers, the runtime, and the scaling. |
| **Vercel — backend hosting** | Runs the Express API at `shopsphere-store-api.vercel.app` | **PaaS** | The API is deployed as application code onto a managed runtime; no operating system or server instance is provisioned or patched by me. |
| **Supabase — PostgreSQL** | Production database holding users, products, carts, and orders | **PaaS** | Supabase supplies a managed Postgres platform that I build a schema on, rather than finished software I merely use. |

## Why not IaaS

Infrastructure as a Service supplies raw compute, storage, and networking, and
leaves the operating system, runtime, patching, and scaling to the customer —
AWS EC2 is the standard example. None of the three services works that way
here. No virtual machine was provisioned for ShopSphere, no operating system is
maintained, and no server is scaled by hand. Vercel and Supabase each present a
platform that accepts application code or a schema and runs it.

## Why not SaaS

Software as a Service supplies finished application software that the customer
consumes as an end user and does not build on — Gmail or Google Docs. All three
services here are built on rather than consumed. Vercel runs software I wrote;
Supabase holds a schema I designed and migrated. The application is mine in
both cases, which is what places all three at the platform layer.

## The distinction that decides all three

The classification follows from where the boundary of responsibility falls.

- **IaaS** — the provider gives you a machine; you bring everything above it.
- **PaaS** — the provider gives you a runtime; you bring the application.
- **SaaS** — the provider gives you the application; you bring only your data.

For ShopSphere, I bring the application to Vercel and the schema to Supabase,
and neither provider asks me to manage a machine. All three services therefore
sit at the platform layer.
