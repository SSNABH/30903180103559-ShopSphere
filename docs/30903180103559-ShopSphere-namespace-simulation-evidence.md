# Multi-Cloud Namespace Simulation — Evidence

**Student ID:** 30903180103559
**Cluster:** Docker Desktop, kubeadm provisioning, single node, Kubernetes v1.36.1

Criterion 2.3 carries four conditions that are read together. Each is shown
below with the command that produces it.

---

## 1. Both namespaces exist under the required names

```
$ kubectl get ns | grep simulation
aws-simulation    Active   27s
gcp-simulation    Active   27s
```

---

## 2. Each namespace runs a frontend pod and a backend pod, each behind a Service

```
$ kubectl get pods,svc -n aws-simulation
NAME                                       READY   STATUS    RESTARTS   AGE
pod/shopsphere-backend-579c8cd9bd-q5d4v    1/1     Running   0          35s
pod/shopsphere-frontend-767c9cb598-vchj4   1/1     Running   0          35s

NAME                          TYPE        CLUSTER-IP       PORT(S)    AGE
service/shopsphere-backend    ClusterIP   10.104.0.145     5000/TCP   35s
service/shopsphere-frontend   ClusterIP   10.100.235.195   80/TCP     35s
```

```
$ kubectl get pods,svc -n gcp-simulation
NAME                                       READY   STATUS    RESTARTS   AGE
pod/shopsphere-backend-579c8cd9bd-8hdmw    1/1     Running   0          36s
pod/shopsphere-frontend-767c9cb598-lh7ds   1/1     Running   0          36s

NAME                          TYPE        CLUSTER-IP     PORT(S)    AGE
service/shopsphere-backend    ClusterIP   10.108.68.83   5000/TCP   36s
service/shopsphere-frontend   ClusterIP   10.111.85.24   80/TCP     36s
```

The Services hold different cluster IPs in each namespace, so the two stacks
are genuinely separate rather than one stack listed twice.

---

## 3. The Services in both namespaces respond through `kubectl port-forward`

```
$ kubectl port-forward svc/shopsphere-frontend 8081:80   -n aws-simulation
$ kubectl port-forward svc/shopsphere-backend  8091:5000 -n aws-simulation
$ kubectl port-forward svc/shopsphere-frontend 8082:80   -n gcp-simulation
$ kubectl port-forward svc/shopsphere-backend  8092:5000 -n gcp-simulation
```

| Target | Response |
|---|---|
| aws-simulation frontend, `:8081` | `HTTP 200` |
| gcp-simulation frontend, `:8082` | `HTTP 200` |

```
$ curl http://localhost:8091/api/health        # aws-simulation
{"success":true,"status":"healthy","checks":{"api":true,"postgresql":true,"mongodb":true}}

$ curl http://localhost:8092/api/health        # gcp-simulation
{"success":true,"status":"healthy","checks":{"api":true,"postgresql":true,"mongodb":true}}
```

Both backends reach the production databases, so the pods serve real data
rather than only answering that they are alive:

```
$ curl "http://localhost:8091/api/products?limit=1"
{"success":true,"data":{"items":[{"name":"Workspace Hub 8","sku":"ACC-002", ...
```

---

## 4. Resources in one namespace are not visible from the other

Asking for a pod by name from the wrong namespace fails:

```
$ kubectl get pod shopsphere-backend-579c8cd9bd-q5d4v -n gcp-simulation
Error from server (NotFound): pods "shopsphere-backend-579c8cd9bd-q5d4v" not found

$ kubectl get pod shopsphere-backend-579c8cd9bd-8hdmw -n aws-simulation
Error from server (NotFound): pods "shopsphere-backend-579c8cd9bd-8hdmw" not found
```

Each namespace lists only its own pods:

```
$ kubectl get pods -n aws-simulation
shopsphere-backend-579c8cd9bd-q5d4v
shopsphere-frontend-767c9cb598-vchj4

$ kubectl get pods -n gcp-simulation
shopsphere-backend-579c8cd9bd-8hdmw
shopsphere-frontend-767c9cb598-lh7ds
```

Secrets are isolated in the same way. The same name in each namespace refers to
two distinct objects with different UIDs:

```
$ kubectl get secret shopsphere-secrets -n aws-simulation
shopsphere-secrets   aws-simulation   b3327072-a331-463e-a3c5-840581f00428

$ kubectl get secret shopsphere-secrets -n gcp-simulation
shopsphere-secrets   gcp-simulation   3a9878fa-4e7f-4fc9-81ad-74cce9efaa86
```

This is the property that makes the namespaces a reasonable stand-in for two
cloud providers: identical workloads, deployed from identical manifests, that
cannot see or reach one another's resources.

---

## Reproducing

```bash
bash k8s/deploy.sh
```

The script builds both images, creates the namespaces, builds each namespace's
Secret from the local `backend/.env`, and applies the same manifests into both.
No credential is written into any committed file.
