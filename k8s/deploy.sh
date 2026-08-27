#!/usr/bin/env bash
# Builds the images, creates the two simulated-provider namespaces, and deploys
# an identical ShopSphere stack into each.
#
# Run from the repository root:  bash k8s/deploy.sh
set -euo pipefail

API_URL="${API_URL:-https://shopsphere-store-api.vercel.app/api}"
NAMESPACES=(aws-simulation gcp-simulation)
ENV_FILE="backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "error: $ENV_FILE not found. Credentials are read from it and are never committed." >&2
  exit 1
fi

echo "==> Building images into the local Docker daemon"
docker build -t shopsphere-backend:local ./backend
docker build -t shopsphere-frontend:local \
  --build-arg VITE_API_BASE_URL="$API_URL" ./frontend

echo "==> Creating namespaces"
kubectl apply -f k8s/namespaces.yaml

read_env() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2-; }

for ns in "${NAMESPACES[@]}"; do
  echo "==> Deploying into $ns"

  # The Secret is built from the local .env at apply time, so no credential is
  # ever written into a manifest or committed to the repository.
  kubectl create secret generic shopsphere-secrets \
    --namespace "$ns" \
    --from-literal=DATABASE_URL="$(read_env DATABASE_URL)" \
    --from-literal=MONGODB_URI="$(read_env MONGODB_URI)" \
    --from-literal=JWT_ACCESS_SECRET="$(read_env JWT_ACCESS_SECRET)" \
    --from-literal=JWT_REFRESH_SECRET="$(read_env JWT_REFRESH_SECRET)" \
    --dry-run=client -o yaml | kubectl apply -f -

  kubectl apply -f k8s/app/ --namespace "$ns"
done

echo "==> Waiting for pods to become ready"
for ns in "${NAMESPACES[@]}"; do
  kubectl wait --for=condition=available --timeout=180s \
    deployment/shopsphere-backend deployment/shopsphere-frontend --namespace "$ns"
done

echo
echo "Done. Both namespaces are running."
echo "  kubectl get pods,svc -n aws-simulation"
echo "  kubectl get pods,svc -n gcp-simulation"
