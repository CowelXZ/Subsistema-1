USE CTIRECEPDB;
GO

-- Tabla para historial de escaneos del kiosco
-- (UsuariosSistema y BitacoraAccesos ya existen, no se tocan)
CREATE TABLE HistorialAccesos (
    idAcceso        BIGINT IDENTITY(1,1) PRIMARY KEY,

    -- DATOS DEL USUARIO QUE ENTRÓ
    matricula       VARCHAR(50)  NOT NULL,
    nombreCompleto  VARCHAR(150) NOT NULL,
    tipoUsuario     VARCHAR(20)  NOT NULL,

    -- "SNAPSHOT" DE LA CLASE A LA QUE IBA (NULL si entró en hora libre)
    materiaDestino  VARCHAR(100) NULL,
    grupoDestino    VARCHAR(50)  NULL,
    maestroAsignado VARCHAR(150) NULL,
    aulaDestino     VARCHAR(50)  NULL,

    -- METADATOS DEL ACCESO
    estatusAcceso   VARCHAR(20)  NOT NULL,   -- 'PERMITIDO' o 'DENEGADO'
    fechaHora       DATETIME     NOT NULL DEFAULT GETDATE()
);
GO

-- Índices para búsquedas rápidas en reportes
CREATE NONCLUSTERED INDEX IX_HistorialAccesos_Fecha     ON HistorialAccesos(fechaHora);
CREATE NONCLUSTERED INDEX IX_HistorialAccesos_Matricula ON HistorialAccesos(matricula);
CREATE NONCLUSTERED INDEX IX_HistorialAccesos_Grupo     ON HistorialAccesos(grupoDestino);
GO

PRINT '✅ Tabla HistorialAccesos creada correctamente.';
