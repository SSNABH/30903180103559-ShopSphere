# Multi-Cloud Namespace Simulation

Two Kubernetes namespaces stand in for two cloud providers. An identical
ShopSphere stack — a frontend pod and a backend pod, each behind its own
Service — runs in each, and neither namespace can see the other's resources.

| Namespace | Simulates |
|---|---|
| `aws-simulation` | Amazon Web Services |
| `gcp-simulation` | Google Cloud Platform |

## Layout

```
k8s/
├── namespaces.yaml     both namespaces (cluster-scoped)
├── app/
│   ├── backend.yaml    Deployment + Service for the API
│   └── frontend.yaml   Deployment + Service for the storefront
└── deploy.sh           builds images and deploys into both namespaces
```

The manifests in `app/` carry no namespace of their own, which is what lets the
same files be applied into both.

## Running it

Requires Docker Desktop with Kubernetes enabled. From the repository root:

```bash
bash k8s/deploy.sh
```

The script builds both images into the local Docker daemon — which Docker
Desktop's cluster shares, so `imagePullPolicy: Never` needs no registry —
creates the namespaces, builds a Secret from `backend/.env`, and applies the
stack into each namespace.

**No credential is written into any manifest.** The Secret is created at apply
time from the local `.env`, which is gitignored.

## Reaching the services

Each namespace is reached on its own local port:

```bash
kubectl port-forward svc/shopsphere-frontend 8081:80   -n aws-simulation
kubectl port-forward svc/shopsphere-backend  8091:5000 -n aws-simulation

kubectl port-forward svc/shopsphere-frontend 8082:80   -n gcp-simulation
kubectl port-forward svc/shopsphere-backend  8092:5000 -n gcp-simulation
```

Then:

| URL | Serves |
|---|---|
| http://localhost:8081 | storefront, AWS simulation |
| http://localhost:8082 | storefront, GCP simulation |
| http://localhost:8091/api/health | API health, AWS simulation |
| http://localhost:8092/api/health | API health, GCP simulation |

## Proving isolation

Each namespace lists only its own resources:

```bash
kubectl get pods,svc -n aws-simulation
kubectl get pods,svc -n gcp-simulation
```

A resource in one namespace is not addressable from the other, which is
demonstrated by asking for one by the wrong namespace:

```bash
kubectl get deployment shopsphere-backend -n aws-simulation   # found
kubectl get pod <aws-pod-name> -n gcp-simulation              # NotFound
```

The Secret is namespaced in the same way — `shopsphere-secrets` exists
separately in each, and neither copy is readable from the other.

## Cleaning up

```bash
kubectl delete namespace aws-simulation gcp-simulation
```
