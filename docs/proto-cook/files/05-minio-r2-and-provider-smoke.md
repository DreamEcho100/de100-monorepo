# MinIO, R2, And Provider Smoke

Storage profiles:

```txt
local-fs
  APP_PROTO_COOK_FILES_STORAGE_DRIVER=local
  simple offline mode

minio-s3
  APP_PROTO_COOK_FILES_STORAGE_DRIVER=s3
  APP_PROTO_COOK_FILES_S3_PROVIDER=minio
  local production-parity mode

r2-s3
  APP_PROTO_COOK_FILES_STORAGE_DRIVER=s3
  APP_PROTO_COOK_FILES_S3_PROVIDER=r2
  default remote production mode
```

Start local MinIO:

```sh
pnpm -F @de100/apps-proto-cook-infra minio:up
```

Smoke local MinIO:

```sh
pnpm -F @de100/apps-proto-cook-infra minio:smoke
```

Expected smoke output includes:

```json
{
  "status": "pass",
  "endpoint": "http://127.0.0.1:9000",
  "buckets": {
    "public": "public-files",
    "private": "private-files"
  }
}
```

R2 production shape:

```env
APP_PROTO_COOK_FILES_STORAGE_DRIVER=s3
APP_PROTO_COOK_FILES_S3_PROVIDER=r2
APP_PROTO_COOK_FILES_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
APP_PROTO_COOK_FILES_S3_REGION=auto
APP_PROTO_COOK_FILES_S3_ACCESS_KEY_ID=...
APP_PROTO_COOK_FILES_S3_SECRET_ACCESS_KEY=...
APP_PROTO_COOK_FILES_S3_PUBLIC_BUCKET=public-files
APP_PROTO_COOK_FILES_S3_PRIVATE_BUCKET=private-files
APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE=true
```

Do not mix public and private objects in one bucket unless a provider adapter explicitly enforces equivalent separation.
