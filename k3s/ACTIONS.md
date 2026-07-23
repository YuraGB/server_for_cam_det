# Kubernetes Cheat Sheet (k3s)

## 🚀 Застосувати ресурси

```bash
kubectl apply -f <file-or-directory>
```

Приклади:

```bash
kubectl apply -f deployment.yaml
kubectl apply -f k8s/
```

---

## 🛑 Видалити ресурси

```bash
kubectl delete -f <file-or-directory>
```

Приклади:

```bash
kubectl delete -f deployment.yaml
kubectl delete -f k8s/
```

---

# Namespace

## Усі Namespace

```bash
kubectl get namespaces
```

або

```bash
kubectl get ns
```

## Детально

```bash
kubectl describe namespace <namespace>
```

## Видалити Namespace

```bash
kubectl delete namespace <namespace>
```

---

# Pods

## Усі Pod

```bash
kubectl get pods
```

## Pod у Namespace

```bash
kubectl get pods -n <namespace>
```

## Усі Pod у кластері

```bash
kubectl get pods -A
```

## Детально

```bash
kubectl describe pod <pod-name> -n <namespace>
```

## Логи

```bash
kubectl logs <pod-name> -n <namespace>
```

## Увійти всередину контейнера

```bash
kubectl exec -it <pod-name> -n <namespace> -- sh
```

або

```bash
kubectl exec -it <pod-name> -n <namespace> -- bash
```

---

# Deployment

## Усі Deployment

```bash
kubectl get deployments
```

або

```bash
kubectl get deploy
```

## Deployment у Namespace

```bash
kubectl get deployment -n <namespace>
```

## Детально

```bash
kubectl describe deployment <deployment-name> -n <namespace>
```

## Перезапустити

```bash
kubectl rollout restart deployment <deployment-name> -n <namespace>
```

## Масштабування

```bash
kubectl scale deployment <deployment-name> \
  --replicas=<count> \
  -n <namespace>
```

---

# Services

## Усі Service

```bash
kubectl get services
```

або

```bash
kubectl get svc
```

## У Namespace

```bash
kubectl get svc -n <namespace>
```

## Детально

```bash
kubectl describe service <service-name> -n <namespace>
```

---

# ConfigMap

## Список

```bash
kubectl get configmap
```

або

```bash
kubectl get cm
```

## У Namespace

```bash
kubectl get cm -n <namespace>
```

## Детально

```bash
kubectl describe configmap <configmap-name> -n <namespace>
```

---

# Secret

## Список

```bash
kubectl get secret
```

## У Namespace

```bash
kubectl get secret -n <namespace>
```

## Детально

```bash
kubectl describe secret <secret-name> -n <namespace>
```

---

# Persistent Storage

## PersistentVolumeClaim

```bash
kubectl get pvc
```

## PVC у Namespace

```bash
kubectl get pvc -n <namespace>
```

## Детально

```bash
kubectl describe pvc <pvc-name> -n <namespace>
```

---

## PersistentVolume

```bash
kubectl get pv
```

## Детально

```bash
kubectl describe pv <pv-name>
```

---

# ReplicaSet

```bash
kubectl get replicasets
```

або

```bash
kubectl get rs
```

---

# Events

## Події Namespace

```bash
kubectl get events -n <namespace>
```

## Усі події

```bash
kubectl get events -A
```

---

# Усі основні ресурси Namespace

```bash
kubectl get all -n <namespace>
```

> **Примітка:** `get all` не показує ConfigMap, Secret, PVC та деякі інші ресурси.

---

# Детальний опис ресурсу

```bash
kubectl describe <resource-type> <resource-name> -n <namespace>
```

Приклади:

```bash
kubectl describe pod my-pod -n production

kubectl describe deployment backend -n production

kubectl describe service api -n production
```

---

# Основні скорочення

| Повна назва            | Скорочення |
| ---------------------- | ---------- |
| pods                   | po         |
| services               | svc        |
| deployments            | deploy     |
| configmaps             | cm         |
| namespaces             | ns         |
| replicasets            | rs         |
| persistentvolumeclaims | pvc        |
| persistentvolumes      | pv         |

---

# Типовий процес діагностики

```bash
kubectl get all -n <namespace>

kubectl get pvc -n <namespace>

kubectl get cm -n <namespace>

kubectl describe pod <pod-name> -n <namespace>

kubectl logs <pod-name> -n <namespace>
```

# remove image from k3s list

```bash
sudo k3s crictl rmi docker.io/library/frontend-app:v1
```

# restart k3s

```bash
sudo systemctl restart k3s
sudo systemctl status k3s
sudo k3s kubectl get ns
```
