# Hevy Dash 🚀

Hevy Dash es un panel de control avanzado para visualizar tu progreso de entrenamiento de Hevy.com, con análisis muscular mediante gráficos de radar, seguimiento de medidas corporales y un Entrenador AI integrado.

## 🐳 Despliegue con Docker (Recomendado)

Para asegurar que tus datos sean persistentes y no se pierdan al actualizar la imagen o borrar el contenedor, se utiliza un sistema de volúmenes.

### 📋 Requisitos Previos
- Docker instalado.
- Docker Compose.

### 🚀 Instalación Rápida

1. **Clona el repositorio** o descarga los archivos `Dockerfile` y `docker-compose.yml`.
2. **Prepara la carpeta de datos**: Asegúrate de tener una carpeta llamada `data` en el mismo directorio que el archivo `docker-compose.yml`. El sistema la creará automáticamente si no existe.
3. **Levanta el contenedor**:
   ```bash
   docker-compose up -d --build
   ```

### 💾 Persistencia de Datos

El archivo `docker-compose.yml` está configurado para proteger tu información personal y registros:

- **Volumen**: Se mapea `./data` (local) a `/app/data` (contenedor).
- **Variable de Entorno**: `DATA_DIR=/app/data` indica a la aplicación dónde guardar la base de datos SQLite.

#### Uso en Synology NAS (Container Manager)
Si usas un NAS, configura el mapeo de la siguiente forma:
- **Carpeta del host**: `/volume1/docker/hevy_dash/data` (o tu ruta preferida)
- **Ruta del contenedor**: `/app/data`

### 🔄 Actualización de la Imagen

Cuando quieras actualizar a una nueva versión de Hevy Dash sin perder tus registros:

```bash
docker-compose pull
docker-compose up -d --build
```
*Tus registros de peso, medidas y ajustes de API se mantendrán intactos ya que residen en la carpeta de host vinculada.*

## ⚙️ Configuración Inicial
Una vez levantado el contenedor, accede a `http://localhost:3000` (o la IP de tu servidor) y ve a la sección de **Ajustes**:
1. Introduce tu **Hevy API Key**.
2. Introduce tu **OpenAI API Key** (para el Entrenador AI).
3. Configura tu altura y objetivo.

## 📊 Secciones Principales
- **Panel de Control**: Resumen total y enfoque muscular (Radar).
- **Progresión**: Análisis detallado por ejercicio (Volumen, 1RM, Reps).
- **Registro**: Seguimiento diario de peso y medidas corporales (Pecho, Cintura, etc.).
- **Entrenador AI**: Consultas personalizadas basadas en tus datos reales.

---
Desarrollado para optimizar tu rendimiento y salud física. 💪

## 🛠 Solución de Problemas (Troubleshooting)

### Error `ENOTFOUND` o problemas de conexión AI
Si el Entrenador AI falla con un error tipo `getaddrinfo ENOTFOUND`, es probable que tu contenedor no pueda resolver nombres de dominio (común en NAS).
**Solución**: En el `docker-compose.yml`, asegúrate de que la sección `dns` apunta a servidores públicos:
```yaml
dns:
  - 8.8.8.8
  - 1.1.1.1
```
