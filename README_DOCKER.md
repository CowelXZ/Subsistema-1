# README Docker — Subsistema 1

Guía operativa para desplegar Subsistema 1 con Docker Desktop en Windows (CMD).
No requiere instalar Node.js, SQL Server ni dependencias locales.

---

## Requisitos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Docker Desktop | 4.x | Con WSL2 o Hyper-V habilitado |
| Docker Compose | v2 (incluido en Docker Desktop) | Usar `docker compose` (sin guión) |
| Windows CMD / PowerShell | Cualquiera | Los comandos de esta guía usan CMD |

> **No se necesita** Node.js, npm, SQL Server ni ninguna otra herramienta instalada localmente.

---

## Arquitectura Docker

```
┌─────────────────────────────────────────────────────────┐
│  Docker Desktop                                         │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │ react_        │    │ node_        │    │ sql_     │  │
│  │ frontend_uat  │───▶│ backend_uat  │───▶│ server_  │  │
│  │ Nginx :80     │    │ Express :3000│    │ uat :1433│  │
│  └──────────────┘    └──────────────┘    └──────────┘  │
│         │                                      │        │
└─────────┼──────────────────────────────────────┼────────┘
          ▼                                      ▼
   localhost:80                          localhost:1434
   (navegador)                        (SQL Server externo)
```

**Usuario del backend:** `admin_bd` (solo acceso a `CTIRECEPDB`, no es sysadmin)
**Usuario de inicialización:** `sa` (solo para ejecutar scripts en primer despliegue)

---

## Primer Despliegue — Volumen Limpio

Sigue estos pasos en orden. Solo es necesario hacerlo **una vez** por máquina o cuando el volumen de datos se borra.

### Paso 1 — Levantar solo SQL Server

```cmd
docker compose up -d sql_server_uat
```

Espera 30–60 segundos para que SQL Server inicialice internamente.

### Paso 2 — Verificar que SQL Server está listo

```cmd
docker logs sql_server_uat --tail 20
```

Busca la línea:
```
SQL Server is now ready for client connections.
```

También puedes verificar con una consulta rápida:

```cmd
docker exec sql_server_uat /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Servicio@2024" -C -Q "SELECT @@VERSION"
```

### Paso 3 — Copiar y ejecutar `MegaScript.sql`

Este es el **script oficial de inicialización**. Crea la base de datos `CTIRECEPDB`, el login
`admin_bd`, todas las tablas, stored procedures y los datos de producción.

> ⚠️ El script pesa ~220 MB y puede tardar varios minutos en ejecutarse.

```cmd
docker cp MegaScript.sql sql_server_uat:/tmp/mega.sql

docker exec sql_server_uat /opt/mssql-tools18/bin/sqlcmd ^
  -S localhost -U sa -P "Servicio@2024" -C ^
  -i /tmp/mega.sql
```

> Si el script genera advertencias pero termina sin error fatal, es normal.

### Paso 4 — Levantar backend y frontend

```cmd
docker compose up --build -d
```

El backend espera automáticamente a que SQL Server esté completamente listo (healthcheck).

### Paso 5 — Verificar que todo funciona

```cmd
REM Ver estado de los contenedores
docker compose ps

REM Verificar conexión del backend a la BD
curl http://localhost:3000/api/health

REM Respuesta esperada:
REM {"status":"OK","db":"Connected"}
```

Abre el navegador en: **http://localhost**

---

## Reinicio Normal

Cuando la BD ya está inicializada (volumen existente), simplemente:

```cmd
docker compose up -d
```

No se necesita volver a ejecutar los scripts SQL.

---

## Rebuild Completo (Después de Cambios en Código)

```cmd
REM Detener contenedores
docker compose down

REM Reconstruir imágenes y levantar
docker compose up --build -d
```

> El volumen `sqlserver_data` **no se borra** con `docker compose down`. Los datos de BD persisten.

### Borrar TODO (incluyendo datos de BD)

```cmd
docker compose down -v
```

> ⚠️ Esto borra el volumen. Necesitarás repetir el Primer Despliegue desde el Paso 1.

---

## Verificar Logs

```cmd
REM Todos los contenedores a la vez
docker compose logs -f

REM Solo SQL Server
docker logs sql_server_uat -f

REM Solo backend
docker logs node_backend_uat -f

REM Solo frontend
docker logs react_frontend_uat -f

REM Últimas 50 líneas del backend
docker logs node_backend_uat --tail 50
```

---

## Credenciales de Referencia

| Componente | Usuario | Contraseña | Uso |
|---|---|---|---|
| SQL Server SA | `sa` | `Servicio@2024` | Solo inicialización de BD (scripts, primer despliegue) |
| Backend → BD | `admin_bd` | `servicio` | Conexión en producción (db_owner de CTIRECEPDB) |

> **Estas credenciales están en `docker-compose.yml`.** No usar `sa` como usuario permanente del backend.

---

## Errores Comunes y Soluciones

### ❌ `sqlcmd: command not found` o ruta `/opt/mssql-tools/bin/sqlcmd` no existe

**Causa:** Las imágenes de SQL Server 2022 movieron `sqlcmd` a `mssql-tools18`.

**Solución:** Usar siempre:
```
/opt/mssql-tools18/bin/sqlcmd
```

---

### ❌ `SSL Provider: [error:1416F086]` o error de certificado SSL

**Causa:** `sqlcmd` en versiones nuevas requiere confiar explícitamente en el certificado autofirmado.

**Solución:** Agregar `-C` al comando:
```cmd
docker exec sql_server_uat /opt/mssql-tools18/bin/sqlcmd ^
  -S localhost -U sa -P "Servicio@2024" -C -Q "SELECT 1"
```

---

### ❌ `Login failed for user 'sa'`

**Causas posibles:**
1. Contraseña incorrecta — la contraseña de `sa` es `Servicio@2024` (verificar en `docker-compose.yml`)
2. SQL Server aún no terminó de inicializar — esperar más tiempo y reintentar
3. Autenticación de Windows activa — en Docker siempre usar autenticación SQL (`-U sa`)

**Verificar la contraseña real del contenedor:**
```cmd
docker inspect sql_server_uat --format "{{range .Config.Env}}{{println .}}{{end}}"
```

---

### ❌ `Login failed for user 'admin_bd'` (Error 500 en el frontend)

**Causa:** El login `admin_bd` no existe en SQL Server. `MegaScript.sql` aún no ha sido ejecutado en este volumen.

**Solución:** Ejecutar el Paso 3 del Primer Despliegue:
```cmd
docker cp MegaScript.sql sql_server_uat:/tmp/mega.sql
docker exec sql_server_uat /opt/mssql-tools18/bin/sqlcmd ^
  -S localhost -U sa -P "Servicio@2024" -C ^
  -i /tmp/mega.sql
```

Luego reiniciar el backend para que reintente la conexión:
```cmd
docker compose restart node_backend_uat
```

---

### ❌ El frontend carga pero todas las peticiones fallan (red local, otra PC)

**Causa:** `VITE_API_URL` está hardcodeado a `http://localhost:3000` en tiempo de build. Cuando el navegador está en **otra computadora**, `localhost` apunta a esa PC, no al servidor Docker.

**Solución:** Rebuilding con la IP real de la máquina host:
```cmd
REM Ejemplo con IP 192.168.1.100
docker compose build --build-arg VITE_API_URL=http://192.168.1.100:3000 react_frontend_uat
docker compose up -d react_frontend_uat
```

---

### ❌ `lookup registry-1.docker.io: connection refused` al hacer `docker compose up --build`

**Causa:** Docker Desktop no puede conectar a Docker Hub para descargar imágenes.

**Solución:**
1. Reiniciar Docker Desktop
2. Reiniciar WSL: `wsl --shutdown` en CMD, luego reabrir Docker Desktop
3. Verificar proxy o firewall corporativo
4. Si las imágenes ya están descargadas localmente, el problema no afecta el build

---

### ❌ El backend levanta antes de que SQL Server esté listo

**Causa:** Esto ya está resuelto en la configuración actual con `healthcheck` + `condition: service_healthy`.

**Si persiste:** Verificar que el `docker-compose.yml` tenga la sección `healthcheck` en `sql_server_uat`. Revisar:
```cmd
docker inspect sql_server_uat --format "{{json .State.Health}}"
```

---

## Estructura de Archivos Docker

```
Subsistema-1/
├── docker-compose.yml        ← Orquestación de servicios
├── Dockerfile.backend        ← Imagen Node.js/Express
├── Dockerfile.frontend       ← Imagen React/Vite → Nginx
├── nginx.conf                ← Configuración Nginx para SPA
├── .dockerignore             ← Excluye node_modules, dist, .env, MegaScript.sql
├── MegaScript.sql            ← Script oficial: crea BD, login admin_bd, tablas, SPs e inserts
└── Para Docker BD.txt        ← Referencia de análisis únicamente (NO usar como script de despliegue)
```

---

## Puertos Expuestos

| Servicio | Puerto Host | Puerto Contenedor | URL |
|---|---|---|---|
| Frontend (Nginx) | 80 | 80 | http://localhost |
| Backend (Express) | 3000 | 3000 | http://localhost:3000 |
| SQL Server | 1434 | 1433 | localhost,1434 (SSMS/Azure Data Studio) |

> Para conectar desde SSMS: servidor `localhost,1434`, autenticación SQL, usuario `sa`.
