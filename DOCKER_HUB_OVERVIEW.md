# 🏋️‍♂️ Hevy Dash - v9.0.0

**Hevy Dash** es una plataforma avanzada de análisis y visualización para tus entrenamientos de **Hevy.com**. Diseñada para atletas que buscan optimizar su rendimiento mediante datos precisos y recomendaciones inteligentes.

---

## 🌟 Características Principales

- **📊 Panel de Control Inteligente**: Visualiza tu volumen total, sesiones y enfoque muscular mediante gráficos de radar dinámicos.
- **🚀 Asesor de Sobrecarga Progresiva (NUEVO)**: En cada entrenamiento, el sistema analiza si estás estancado o evolucionando y te propone tácticas específicas (aumento de peso, repeticiones o cambios de ritmo) adaptadas a tu objetivo (Masa Muscular, Pérdida de Grasa o Tonificación).
- **📉 Gráficas de Progresión Avanzadas**: Seguimiento detallado de 1RM, volumen y repeticiones totales con lógica de arrastre de datos para sesiones incompletas.
- **📏 Registro de Medidas Corporales**: Monitoriza tu peso, cintura, pecho y más, con tendencias visuales que no dependen solo de la báscula.
- **🤖 Entrenador AI**: Un asistente integrado que conoce tus datos y te ayuda a planificar o resolver dudas sobre tu entrenamiento.
- **🌓 Modo Oscuro Premium**: Interfaz moderna, rápida y optimizada para uso en móviles y escritorio.

---

## 🏗️ Despliegue con Docker

La forma más rápida y segura de tener Hevy Dash funcionando es mediante Docker.

### 🚀 Instalación Rápida (Docker Compose)

1. Crea un archivo `docker-compose.yml`:

```yaml
version: '3.8'
services:
  hevy-dash:
    image: [TU_USUARIO]/hevy-dash:latest
    container_name: hevy-dash
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/server/data
    environment:
      - PORT=3000
      - DATA_DIR=/app/server/data
    restart: always
```

2. Levanta el servicio:
```bash
docker-compose up -d
```

### 💾 Persistencia de Datos
Es **CRÍTICO** mapear el volumen `/app/server/data` para que tus registros de peso, medidas y configuración de API no se borren al actualizar la imagen.

---

## ⚙️ Configuración Inicial

Una vez instalado, accede a `http://localhost:3000` y dirígete a **Ajustes**:

1. **Hevy API Key**: Necesaria para sincronizar tus entrenamientos.
2. **OpenAI API Key**: (Opcional) Para habilitar el Entrenador AI.
3. **Objetivo Fitness**: Configura si buscas volumen, definición o mantenimiento para que el **Asesor de Sobrecarga** te dé mejores consejos.

---

## 🔄 Actualización

Para actualizar a la última versión (v9.0.0+):

```bash
docker-compose pull
docker-compose up -d
```

---

## 🛠 Solución de Problemas

**¿Problemas con la conexión AI o Sincronización?**
Si el contenedor no puede conectar con servicios externos (común en algunos NAS), añade servidores DNS públicos a tu configuración:

```yaml
dns:
  - 8.8.8.8
  - 1.1.1.1
```

---
*Desarrollado para quienes no se conforman con entrenar, sino que quieren progresar.* 💪
