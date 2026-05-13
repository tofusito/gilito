# Gilito

Aplicación sencilla para gestionar una colección personal de monedas euro. Está pensada para correr en un homelab detrás de Cloudflare Tunnel y Cloudflare Access.

## Desarrollo local

Este proyecto usa `pnpm` fijado en `package.json`.

```bash
corepack enable
pnpm install
pnpm dev
```

La app queda disponible en `http://localhost:3000`.

## Despliegue homelab

El despliegue principal es `compose.yaml`. No publica el puerto de la app: el acceso externo debe pasar por el servicio `cloudflare` y por una política de Cloudflare Access.

Variables necesarias:

- `TUNNEL_TOKEN`: token del túnel de Cloudflare.
- `GEMINI_API_KEY`: clave de Google AI Studio para el escaneo de monedas.
- `AI_MODEL`: modelo Gemini. Por defecto, `gemini-2.0-flash-lite`.

Variables opcionales de seguridad:

- `SCAN_MAX_BYTES`: tamaño máximo de imagen para escaneo. Por defecto, `6291456`.
- `GEMINI_TIMEOUT_MS`: timeout de Gemini. Por defecto, `15000`.
- `MAX_IMPORT_COINS`: máximo de monedas aceptadas en un backup importado. Por defecto, `10000`.

`docker-compose.yml` es solo para desarrollo/local: construye la imagen y publica `3030:3000`.

## Datos y backups

La base de datos SQLite vive en `/app/data/gilito.db` dentro del contenedor. En homelab se monta en `/home/tofu/docker/gilito/data`.

La pantalla principal permite exportar e importar un backup JSON. La importación valida estructura, límites y campos antes de escribir, y aplica los cambios en una transacción para evitar restauraciones a medias.

## Seguridad

- Cloudflare Access es la barrera de autenticación. La app no incluye login propio.
- Los endpoints de escritura validan `Content-Type`, tamaño de payload y campos esperados.
- El escaneo con IA limita MIME, tamaño de imagen y tiempo máximo de respuesta.
- No expongas el contenedor directamente a internet. Si necesitas acceso local, usa el compose local o una red privada.

## Dependencias

Se usa `pnpm` v10 para bloquear scripts de instalación por defecto y aprobar solo los necesarios.

Reglas del repo:

- No mezclar lockfiles: el lock válido es `pnpm-lock.yaml`.
- No añadir dependencias nuevas sin revisar nombre, mantenedor, necesidad real y scripts de instalación.
- Si una dependencia nueva necesita scripts de build, añadirla explícitamente en `pnpm.onlyBuiltDependencies`.
- Si una dependencia declara scripts irrelevantes para este proyecto, añadirla en `pnpm.ignoredBuiltDependencies`.

Comandos de verificación:

```bash
pnpm lint
pnpm build
pnpm audit --prod
```
