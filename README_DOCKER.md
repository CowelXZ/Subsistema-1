# README Docker — Subsistema 1

Guía operativa para desplegar Subsistema 1 con Docker Desktop en Windows (CMD).
No requiere instalar Node.js, SQL Server ni dependencias locales.

---

## Requisitos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Docker Desktop | 4.x | Con WSL2 o Hyper-V habilitado |
| Docker Compose | v2 (incluido en Docker Desktop) | Usar `docker compose` (sin guión) |
| Windows CMD | Cualquiera | Los comandos de esta guía usan CMD estándar |

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

**Usuario del backend:** `admin_bd` (solo acceso a `CTIRECEPDB`, rol db_owner)
**Usuario de inicialización:** `sa` (solo para ejecutar `MegaScript.sql` en primer despliegue)

`sa` existe desde la inicialización de SQL Server (no lo crea ningún script).
`admin_bd` es creado por `MegaScript.sql`.

---

## Credenciales de Referencia

| Componente | Usuario | Contraseña | Uso |
|---|---|---|---|
| SQL Server SA | `sa` | `Servicio@2024` | Solo inicialización (ejecutar `MegaScript.sql`) |
| Backend → BD | `admin_bd` | `servicio` | Conexión en producción (db_owner de CTIRECEPDB) |

> Estas credenciales están definidas en `docker-compose.yml`. No usar `sa` como usuario permanente del backend.

---

## Antes de Ejecutar Cualquier Comando

**CMD debe estar ubicado en la carpeta raíz del proyecto.** Todos los comandos de esta guía
asumen que estás parado ahí.

```cmd
cd c:\Users\cowel\Subsistem\Subsistema-1
```

> En otra computadora, reemplaza la ruta según dónde copiaste el proyecto. Ejemplo:
> `cd D:\Proyectos\Subsistema-1`

Verifica que ves los archivos del proyecto:
```cmd
dir docker-compose.yml
```
Debe mostrar el archivo. Si no aparece, no estás en la carpeta correcta.

---

## Primer Despliegue — Volumen Limpio

Sigue estos pasos **en orden**. Solo es necesario hacerlo una vez por máquina,
o cuando el volumen de datos se borra por completo.

---

### Paso 1 — Abrir CMD en la carpeta del proyecto

```cmd
cd c:\Users\cowel\Subsistem\Subsistema-1
```

Confirma que `MegaScript.sql` está presente:
```cmd
dir MegaScript.sql
```

Debe mostrar el archivo (~220 MB). Si no aparece, cópialo al directorio antes de continuar.

---

### Paso 2 — Levantar solo SQL Server

```cmd
docker compose up -d sql_server_uat
```

SQL Server tarda entre 30 y 60 segundos en inicializarse internamente.
El comando regresa al prompt de inmediato — eso es normal, el contenedor sigue iniciando en segundo plano.

Espera al menos 30 segundos antes de continuar al Paso 3.

---

### Paso 3 — Verificar que SQL Server está listo

Opción A — Revisar el log del contenedor:
```cmd
docker logs sql_server_uat --tail 20
```
Busca esta línea exacta:
```
SQL Server is now ready for client connections.
```

Opción B — Probar conexión directa:
```cmd
docker exec sql_server_uat /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Servicio@2024" -C -Q "SELECT @@VERSION"
```
Si muestra la versión de SQL Server, está listo. Si da error de conexión, espera más y reintenta.

Opción C — Ver estado del healthcheck:
```cmd
docker inspect sql_server_uat --format "{{.State.Health.Status}}"
```
Debe mostrar `healthy`. Mientras muestre `starting`, SQL Server aún no está listo.

---

### Paso 4 — Copiar y ejecutar MegaScript.sql

> ⚠️ Ejecutar **estando parado en la carpeta del proyecto** (donde está `MegaScript.sql`).
> El script pesa ~220 MB y puede tardar varios minutos. No cierres CMD mientras corre.

**Paso 4a — Copiar el script al contenedor:**
```cmd
docker cp MegaScript.sql sql_server_uat:/tmp/mega.sql
```

Debe terminar sin error. Si dice `no such file`, verifica que estás en la carpeta correcta:
```cmd
dir MegaScript.sql
```

**Paso 4b — Ejecutar el script:**
```cmd
docker exec sql_server_uat /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Servicio@2024" -C -i /tmp/mega.sql
```

> Es normal ver advertencias durante la ejecución. El script terminó correctamente si
> CMD regresa al prompt sin mostrar un error fatal como `Sqlcmd: Error` o `Login failed`.

**Verificar que la BD y el login se crearon:**
```cmd
docker exec sql_server_uat /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Servicio@2024" -C -Q "SELECT name FROM sys.databases WHERE name = 'CTIRECEPDB'"
```
Debe mostrar `CTIRECEPDB`.

```cmd
docker exec sql_server_uat /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Servicio@2024" -C -Q "SELECT name FROM sys.server_principals WHERE name = 'admin_bd'"
```
Debe mostrar `admin_bd`.

---

### Paso 5 — Levantar backend y frontend

Este es el primer build — Docker construye las imágenes desde cero. Puede tardar unos minutos.

```cmd
docker compose up --build -d
```

Usa `--build` en el primer despliegue para asegurar que las imágenes se construyan desde cero.
El backend esperará automáticamente a que SQL Server pase su healthcheck antes de arrancar.

---

### Paso 6 — Verificar que todo funciona

```cmd
docker compose ps
```
Los tres servicios deben aparecer con estado `running` (no `exited`):
```
NAME                  STATUS
react_frontend_uat    running
node_backend_uat      running
sql_server_uat        running (healthy)
```

Probar el healthcheck del backend:
```cmd
curl http://localhost:3000/api/health
```
Respuesta esperada:
```json
{"status":"OK","db":"Connected"}
```

Si `curl` no está disponible en tu CMD, abre el navegador en:
`http://localhost:3000/api/health`

> Si usas PowerShell y `curl` muestra una advertencia, usa:
> `Invoke-RestMethod http://localhost:3000/api/health`

Abrir la aplicación:
**http://localhost**

---

## Reinicio Normal

Cuando la BD ya está inicializada (volumen existente), solo necesitas:

```cmd
cd c:\Users\cowel\Subsistem\Subsistema-1
docker compose up -d
```

No se necesita `--build` ni volver a ejecutar `MegaScript.sql`. Los datos persisten en el volumen `sqlserver_data`.

Verifica que el backend conectó:
```cmd
curl http://localhost:3000/api/health
```

---

## Rebuild Completo (Después de Cambios en Código)

Usar cuando se modificó código del backend o frontend y hay que regenerar las imágenes.

```cmd
cd c:\Users\cowel\Subsistem\Subsistema-1

REM Detener contenedores (NO borra el volumen de BD)
docker compose down

REM Reconstruir imágenes y levantar
docker compose up --build -d
```

> El volumen `sqlserver_data` **no se borra** con `docker compose down`. Los datos de BD persisten.

---

## Borrar Todo (incluyendo datos de BD)

> ⚠️ Esto borra el volumen. Los datos de BD se pierden. Necesitarás repetir el Primer Despliegue completo.

```cmd
docker compose down -v
```

---

## Verificar Logs

Usar cuando algo no funciona. Ejecutar desde la carpeta del proyecto.

```cmd
REM Estado de todos los contenedores
docker compose ps

REM Log en tiempo real de todos los servicios
docker compose logs -f

REM Solo SQL Server (últimas 30 líneas)
docker logs sql_server_uat --tail 30

REM Solo backend (últimas 50 líneas)
docker logs node_backend_uat --tail 50

REM Solo frontend
docker logs react_frontend_uat --tail 20

REM Healthcheck detallado de SQL Server
docker inspect sql_server_uat --format "{{json .State.Health}}"
```

---

## Errores Comunes y Soluciones

### ❌ `The system cannot find the path specified` o `docker cp` falla

**Causa:** CMD no está en la carpeta del proyecto, por lo que `MegaScript.sql` no se encuentra.

**Solución:**
```cmd
cd c:\Users\cowel\Subsistem\Subsistema-1
dir MegaScript.sql
```
Debe mostrar el archivo. Si no, navega a donde está el proyecto antes de continuar.

---

### ❌ `sqlcmd: command not found` o ruta `/opt/mssql-tools/bin/sqlcmd` no existe

**Causa:** Las imágenes de SQL Server 2022 movieron `sqlcmd` a `mssql-tools18`.
La ruta antigua `/opt/mssql-tools/bin/sqlcmd` ya no existe.

**Solución:** Usar siempre:
```
/opt/mssql-tools18/bin/sqlcmd
```

---

### ❌ Error de certificado SSL al usar sqlcmd

**Causa:** `sqlcmd` en versiones nuevas requiere confiar explícitamente en el certificado autofirmado del contenedor.

**Solución:** Siempre incluir `-C` en los comandos `sqlcmd`:
```cmd
docker exec sql_server_uat /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Servicio@2024" -C -Q "SELECT 1"
```

---

### ❌ `Login failed for user 'sa'`

**Causas posibles:**
1. Contraseña incorrecta — la contraseña de `sa` está en `docker-compose.yml` como `SA_PASSWORD`
2. SQL Server aún no terminó de inicializar — esperar más y reintentar
3. El contenedor no está corriendo — verificar con `docker compose ps`

**Verificar la contraseña real del contenedor en ejecución:**
```cmd
docker inspect sql_server_uat --format "{{range .Config.Env}}{{println .}}{{end}}"
```
Busca la línea `SA_PASSWORD=...`

---

### ❌ `Login failed for user 'admin_bd'` — Error 500 en el frontend

**Causa:** El login `admin_bd` no existe en SQL Server porque `MegaScript.sql` no ha sido ejecutado en este volumen.

**Solución:** Ejecutar el Paso 4 del Primer Despliegue:
```cmd
cd c:\Users\cowel\Subsistem\Subsistema-1
docker cp MegaScript.sql sql_server_uat:/tmp/mega.sql
docker exec sql_server_uat /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Servicio@2024" -C -i /tmp/mega.sql
```

Luego reiniciar el backend para que reintente la conexión:
```cmd
docker compose restart node_backend_uat
```

Verificar:
```cmd
curl http://localhost:3000/api/health
```

---

### ❌ El frontend carga pero todas las peticiones fallan (acceso desde otra PC en red)

**Causa:** `VITE_API_URL` está hardcodeado a `http://localhost:3000` en tiempo de build.
Cuando el navegador está en **otra computadora**, `localhost` apunta a esa PC, no al servidor Docker.

**Solución:** Rebuild del frontend con la IP real de la máquina que corre Docker:
```cmd
REM Primero averigua la IP de la máquina con Docker:
ipconfig

REM Ejemplo con IP 192.168.1.100
docker compose build --build-arg VITE_API_URL=http://192.168.1.100:3000 react_frontend_uat
docker compose up -d react_frontend_uat
```

---

### ❌ `lookup registry-1.docker.io: connection refused` al hacer `docker compose up --build`

**Causa:** Docker Desktop no puede conectar a Docker Hub para descargar imágenes base.

**Solución:**
1. Reiniciar Docker Desktop (desde la barra de tareas)
2. Si persiste: `wsl --shutdown` en CMD, luego reabrir Docker Desktop
3. Verificar conexión a internet y proxy/firewall corporativo
4. Si las imágenes ya fueron descargadas antes, el problema no bloquea el build

---

### ❌ El backend aparece como `exited` justo después de `docker compose up`

**Causa:** El backend falló al iniciar. Ver el motivo en los logs:
```cmd
docker logs node_backend_uat --tail 30
```

Causas frecuentes:
- `Login failed for user 'admin_bd'` → ejecutar MegaScript.sql (ver error anterior)
- SQL Server no pasó el healthcheck a tiempo → reintentar con `docker compose up -d`

---

## Estructura de Archivos Docker

```
Subsistema-1/
├── docker-compose.yml        ← Orquestación de 3 servicios (SQL Server, backend, frontend)
├── Dockerfile.backend        ← Imagen Node.js 20 Alpine + Express (tsx en runtime)
├── Dockerfile.frontend       ← Imagen React/Vite → build estático servido por Nginx
├── nginx.conf                ← Configuración Nginx para SPA (React Router)
├── .dockerignore             ← Excluye node_modules, dist, .env, MegaScript.sql del build context
├── MegaScript.sql            ← Script oficial: crea CTIRECEPDB, admin_bd, tablas, SPs e inserts
└── Para Docker BD.txt        ← Referencia de análisis únicamente (NO usar como script de despliegue)
```

---

## Puertos Expuestos

| Servicio | Puerto Host | Puerto Contenedor | Acceso |
|---|---|---|---|
| Frontend (Nginx) | 80 | 80 | http://localhost |
| Backend (Express) | 3000 | 3000 | http://localhost:3000 |
| SQL Server | **1434** | 1433 | `localhost,1434` en SSMS / Azure Data Studio |

> ⚠️ SQL Server está en el puerto **1434** del host (no 1433). Al conectar desde SSMS,
> usar servidor `localhost,1434` con autenticación SQL y usuario `sa`.
