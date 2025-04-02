# Law Analytics Server

## Descripción

Law Analytics Server es una aplicación backend diseñada para profesionales del derecho que ofrece servicios avanzados para la gestión y análisis de casos legales. Esta plataforma permite el seguimiento completo de expedientes, gestión de etapas procesales, análisis estadístico y automatización de tareas legales.

## Características Principales

### Gestión de Usuarios
- Autenticación mediante email/contraseña y OAuth con Google
- Verificación de cuenta por código
- Gestión de perfiles y preferencias
- Administración de sesiones activas
- Recuperación y cambio de contraseña

### Gestión de Expedientes
- Creación y seguimiento de casos legales
- Clasificación por estados (Nueva, En Proceso, Cerrada, Pendiente)
- Organización por fases procesales (prejudicial, judicial)
- Historial de cambios de estado
- Agrupación por cliente o tipo de caso

### Sistema de Tareas
- Asignación de tareas con fechas de vencimiento y prioridades
- Estados de progreso (pendiente, en_progreso, revision, completada, cancelada)
- Subtareas y comentarios
- Recordatorios automáticos
- Adjuntos y documentación

### Calculadoras Jurídicas
- Calculadoras especializadas para diferentes materias legales
- Almacenamiento de cálculos vinculados a expedientes
- Gestión de tasas e intereses

### Análisis Estadístico
- Dashboard interactivo con KPIs relevantes
- Distribución de estados de expedientes
- Tiempos promedio de resolución por tipo de caso
- Análisis financiero y de actividad
- Tendencias y pronósticos

### Colegios de Abogados
- Integración con información de colegios profesionales
- Validación de matrículas y credenciales
- Datos de contacto actualizados

### Notificaciones y Alertas
- Sistema de alertas personalizables
- Preferencias de notificación por canal
- Recordatorios de vencimientos y plazos

### Gestión Documental
- Almacenamiento de documentos en la nube mediante Cloudinary
- Organización por expediente y tipo
- Control de versiones

## Tecnologías

- **Backend**: Node.js, Express.js
- **Base de datos**: MongoDB con Mongoose
- **Autenticación**: JWT, OAuth2 (Google)
- **Almacenamiento**: AWS, Cloudinary
- **Notificaciones**: AWS SES
- **Logging**: Winston

## Requisitos

- Node.js (v16 o superior)
- MongoDB
- Cuenta AWS (para SecretsManager y SES)
- Cloudinary (para almacenamiento de documentos)

## Instalación

1. Clonar el repositorio:
   ```
   git clone [URL_DEL_REPOSITORIO]
   cd law-analytics-server
   ```

2. Instalar dependencias:
   ```
   npm install
   ```

3. Configurar variables de entorno (o AWS SecretsManager):
   - URLDB: URL de conexión a MongoDB
   - JWT_SECRET: Clave para firmar tokens
   - GOOGLE_CLIENT_ID: ID de cliente para OAuth
   - AWS_SES_KEY_ID y AWS_SES_ACCESS_KEY: Credenciales para AWS
   - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET: Credenciales para Cloudinary

## Ejecución

### Desarrollo:
```
npm run start:dev
```

### Producción:
```
npm run start:prod
```

## Arquitectura

La aplicación sigue una arquitectura MVC (Modelo-Vista-Controlador) con API RESTful:

- **Controllers**: Lógica de negocio para cada entidad
- **Models**: Esquemas de Mongoose que definen la estructura de datos
- **Routes**: Definición de endpoints de la API
- **Middlewares**: Funciones para autenticación y validación
- **Services**: Lógica reutilizable (email, tokens, análisis)
- **Utils**: Utilidades comunes

## API Endpoints

La API está organizada en los siguientes grupos principales:

- **/api/auth**: Autenticación y gestión de usuarios
- **/api/folders**: Gestión de expedientes
- **/api/tasks**: Administración de tareas
- **/api/contacts**: Gestión de contactos
- **/api/events**: Eventos y calendario
- **/api/movements**: Movimientos procesales
- **/api/calculators**: Calculadoras jurídicas
- **/api/stats**: Análisis estadístico
- **/api/stages**: Etapas procesales
- **/api/colleges**: Colegios de abogados
- **/cloudinary**: Gestión de documentos

## Licencia

ISC