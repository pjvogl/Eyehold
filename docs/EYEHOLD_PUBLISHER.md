# Eyehold publisher and update feed

`eyehold.host.json` is the only place the base domain is chosen. Everything else has to match it.

| Field | Value |
| --- | --- |
| Base domain | `eyehold.babelbook.net` |
| Publisher | Eyehold |
| App id | `net.babelbook.eyehold` |
| Update feed | `https://eyehold.babelbook.net/updates/latest.json` |
| Release notes | `https://eyehold.babelbook.net/download` |

The desktop data directory stays `ai.skynet.harness` so existing stations keep their files. That identifier is not the public app id.

The feed is this fork's own host. It is not `starnetos.com`, not `github.com/androoAGI`, and not a route on `babelbook.net`. Hosting is a separate Eyehold Worker with the custom domain `eyehold.babelbook.net`. Do not attach it to the babelbook-staging Worker.

`bundle.createUpdaterArtifacts` stays false, and `EYEHOLD_UPDATES_ENABLED` stays false. The app will not check for updates until the signing key below is replaced.

## Signing key (not done)

The public key in `src-tauri/tauri.conf.json` is still the key that shipped with this tree. Do not publish an update signed by it.

On a machine you control, generate a new minisign key and keep the private key out of git:

```
minisign -G -p eyehold.pub -s eyehold.key
```

Put only the public key into `plugins.updater.pubkey`. Store `eyehold.key` as a deployment secret. After that, set `createUpdaterArtifacts` and `EYEHOLD_UPDATES_ENABLED` to true in the same change. Do not commit `eyehold.key`.
