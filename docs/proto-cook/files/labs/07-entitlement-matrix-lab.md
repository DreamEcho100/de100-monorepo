# Files Labs 07 - Entitlement Matrix

Use this lab to verify that file playback and signed reads follow the same access model the product will use for paid or private vertical modules.

Route:

```txt
http://127.0.0.1:3000/en/files-lab/entitlements
```

## What This Lab Proves

```txt
requester
  |
  | asks for a file, variant, or HLS playback session
  v
entitlement policy
  |
  | preview? enrolled? owner? admin? expired token?
  v
delivery decision
  |
  | allow -> signed URL/session/provider path
  | deny  -> explicit denial reason
```

Expected rules:

- Preview content is readable by policy.
- Private content is denied for anonymous users.
- Private content is allowed for enrolled users.
- Private content is allowed for admins.
- Expired signed sessions are denied for manifests and segments.
- A denied private read must fail before storage keys are exposed.

## Setup

Run the shared setup first:

```sh
pnpm -F @de100/apps-proto-cook-infra minio:up
pnpm -F @de100/apps-proto-cook-infra minio:smoke
pnpm -F @de100/apps-proto-cook-db db:migrate
pnpm -F @de100/apps-proto-cook-web db:seed
pnpm dev
```

Open two browser contexts:

- One signed-in seeded admin or owner session.
- One signed-out private/incognito session.

## Preview Lesson Check

1. In the signed-out session, open the entitlement lab.
2. Select a preview lesson or preview asset.
3. Request playback or read access.

Expected:

- The decision is `allowed`.
- The reason mentions preview policy.
- If a playback token is created, the manifest request succeeds.

Failure notes:

- If preview access is denied, check the seeded lesson policy.
- If access succeeds but no reason is displayed, the lab is not explaining the decision clearly enough.

## Private Anonymous Check

1. In the signed-out session, select a private lesson or private file.
2. Request direct read, signed read, and HLS playback where available.

Expected:

- The decision is `denied`.
- No private storage key or provider URL is exposed.
- HLS manifest and segment URLs fail when requested without a valid session.

Failure notes:

- Any anonymous private allow is a security bug.
- A generated token for an anonymous private lesson is also a security bug, even if a later segment request fails.

## Private Enrolled Check

1. In the signed-in non-admin enrolled user session, select a private lesson.
2. Request playback access.
3. Open the manifest and at least one segment.

Expected:

- The decision is `allowed`.
- The reason mentions enrollment or equivalent course access.
- The manifest and segment requests succeed until the token expires.

Failure notes:

- If the manifest succeeds but segments fail immediately, inspect token path binding.
- If enrollment is ignored, inspect the app-injected entitlement adapter.

## Admin Bypass Check

1. In the signed-in admin session, select a private lesson where the admin is not the owner.
2. Request playback access.

Expected:

- The decision is `allowed`.
- The reason mentions admin role.
- The response still uses scoped signed access, not a raw private bucket URL.

## Expiration Check

1. Create a playback session.
2. Wait until the lab reports or simulates expiration.
3. Retry the manifest and segment requests.

Expected:

- Both requests fail after expiration.
- The error is explicit enough to distinguish expiration from missing object.
- Creating a new allowed session restores access.

## Record Feedback

Capture this table for each run:

| Scenario | User | Asset | Decision | Expected | Actual | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Preview | Anonymous |  | Allow |  |  |  |
| Private | Anonymous |  | Deny |  |  |  |
| Private | Enrolled |  | Allow |  |  |  |
| Private | Admin |  | Allow |  |  |  |
| Expired token | Enrolled |  | Deny |  |  |  |

## QA Checklist

| Check | Pass condition |
| --- | --- |
| Preview anonymous | Allowed only because preview policy allows it |
| Private anonymous | Denied before private storage keys or provider URLs are exposed |
| Private enrolled | Allowed through enrollment policy and scoped signed access |
| Private admin | Allowed through admin policy without raw private bucket exposure |
| Expired token | Manifest and segment requests both fail after expiry |
| Error clarity | Denial reason distinguishes auth, entitlement, token expiry, and missing object |
