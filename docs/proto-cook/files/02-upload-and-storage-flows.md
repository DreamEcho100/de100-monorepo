# Upload And Storage Flows

The platform separates terms that are easy to mix up:

```txt
API approach       hybrid | http-native
storage backend    local-fs | minio-s3 | r2-s3 | aws-s3 | custom-s3
upload protocol    orpc-direct | xhr | tus | s3-put | s3-multipart | custom
delivery strategy  orpc-blob | public-url | signed-url | private-http-route | provider-url | range-http
integration        companion | transloadit
processing mode    none | local-pipeline | transloadit-assembly | custom
```

Default planning:

```txt
local-fs
  small first-party file -> orpc-direct
  normal app-server upload -> xhr
  playback/seek -> range-http

minio-s3 / r2-s3
  small object -> s3-put
  large object -> s3-multipart
  private read -> signed-url or private-http-route
  video playback -> signed HLS session + range/http artifact delivery
```

Hybrid sequence:

```txt
browser -> oRPC upload plan -> selected executor -> route/provider bytes
        -> completeUpload -> file/session/job state -> worker queue
```

HTTP-native sequence:

```txt
browser -> /api/files/targets -> route/provider bytes
        -> /api/files/{id}/complete -> file/session/job state
```

Explicit limits are tracked per byte strategy:

- `orpc-direct` and `xhr`: app-server body limits and memory pressure.
- `s3-put`: provider single-object limits.
- `s3-multipart`: provider part count, part size, and session expiration.
- `tus`: configured Tus server chunk/session expiration.
- `transloadit`: vendor template/account limits.
- `range-http`: delivery policy, not upload policy.
