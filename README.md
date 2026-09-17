# logsGrafanaFirefox

Extensión Firefox WebExtension para generar consultas LogQL con los datos de `logsGrafanaSGA` y abrir Grafana Explore en una pestaña nueva.

## Instalación local

1. Abre `about:debugging#/runtime/this-firefox`.
2. Pulsa **Cargar complemento temporal**.
3. Selecciona el archivo `manifest.json` de esta carpeta.

La extensión no consulta Loki ni Grafana y no guarda credenciales. Solo genera la URL localmente y usa la sesión que el usuario tenga abierta al abrir la pestaña.
