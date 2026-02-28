# 🌙 Vales de Amor - Integración con PocketBase

## ¿Qué es PocketBase?

PocketBase es una base de datos backend ligera que permite sincronizar los vales entre dispositivos. Es gratuito, fácil de usar y puedes ejecutarlo localmente o en un servidor.

## 📦 Instalación de PocketBase

### Opción 1: Ejecutar localmente (para desarrollo)

1. **Descarga PocketBase** desde [pocketbase.io/docs](https://pocketbase.io/docs/)
   - Elige tu sistema operativo (Windows, Mac, Linux)

2. **Descomprime** el archivo descargado

3. **Ejecuta PocketBase**:
   ```bash
   # En Windows (PowerShell o CMD):
   .\pocketbase.exe serve

   # En Mac/Linux:
   ./pocketbase serve
   ```

4. Abre el **Admin Panel** en: `http://127.0.0.1:8090/_/`

### Opción 2: Desplegar en un servidor gratuito

Puedes usar servicios como:
- [PocketHost.io](https://pockethost.io/) - Hosting gratuito específico para PocketBase
- [Fly.io](https://fly.io/) - Con capa gratuita
- [Railway](https://railway.app/) - Con capa gratuita

## 🗄️ Configuración de la Base de Datos

### 1. Crea una cuenta de administrador

La primera vez que accedas a `http://127.0.0.1:8090/_/`, te pedirá crear una cuenta de administrador.

### 2. Crea la colección "vales"

En el Admin Panel:

1. Ve a **Collections** → **New collection**
2. Nombre: `vales`
3. Tipo: `Base`

### 3. Añade los campos

Añade estos campos a la colección:

| Campo       | Tipo   | Opciones               |
|-------------|--------|------------------------|
| `concept`   | Text   | Required               |
| `from_user` | Text   | Required               |
| `to_user`   | Text   | Required               |
| `serial`    | Text   | Required, Unique       |
| `caduca`    | Text   |                        |
| `emitido`   | Text   |                        |
| `local_id`  | Number |                        |

### 4. Configura las reglas de acceso (API Rules)

Para que funcione sin autenticación (para apps sencillas como esta):

En la colección `vales`, ve a **Settings** → **API Rules** y configura:

- **List/Search rule**: (dejar vacío = público)
- **View rule**: (dejar vacío = público)  
- **Create rule**: (dejar vacío = público)
- **Update rule**: (dejar vacío = público)
- **Delete rule**: (dejar vacío = público)

> ⚠️ **Nota de seguridad**: Esto es adecuado para una app personal/privada. Para producción con múltiples usuarios, deberías implementar autenticación.

## 🔧 Configuración en la App

### Cambiar la URL de PocketBase

Si usas un servidor diferente a localhost, edita `pocketbase.js`:

```javascript
// Línea 13 aproximadamente
const POCKETBASE_URL = 'http://127.0.0.1:8090'; // Cambia esto

// Ejemplos:
// Local: 'http://127.0.0.1:8090'
// PocketHost: 'https://tu-app.pockethost.io'
// Tu servidor: 'https://api.tudominio.com'
```

## ✅ Verificar que funciona

1. Abre la app de Vales de Amor
2. Abre la consola del navegador (F12 → Console)
3. Deberías ver:
   ```
   ✅ PocketBase conectado: {code: 200, ...}
   🔗 PocketBase integrado correctamente
   ```

4. Al crear un vale y guardarlo, verás:
   ```
   💾 Vale guardado en PocketBase: abc123...
   ```

## 🔄 Sincronización

La app sincroniza automáticamente:
- ✅ Al iniciar (descarga vales del servidor)
- ✅ Al guardar un vale (lo sube al servidor)
- ✅ Al eliminar un vale (lo elimina del servidor)
- ✅ En tiempo real (si otro dispositivo crea un vale)

## 🚫 Si PocketBase no está disponible

No te preocupes, la app sigue funcionando:
- Los vales se guardan en localStorage
- La próxima vez que PocketBase esté disponible, se sincronizarán

## 🐛 Solución de problemas

### "PocketBase no disponible"
- Verifica que PocketBase está ejecutándose
- Verifica la URL en `pocketbase.js`
- Verifica que no hay bloqueo de CORS

### Los vales no se sincronizan
- Verifica que la colección `vales` existe
- Verifica que los campos tienen los nombres correctos
- Revisa las API Rules

### Error de CORS
Si la app está en un dominio diferente a PocketBase, necesitas configurar CORS. En PocketBase:

1. Ve a **Settings** → **Application**
2. En **Allowed origins** añade: `*` o tu dominio específico

---

## 📱 Alternativa sin servidor: Solo enlaces

Si no quieres configurar PocketBase, la app sigue funcionando:
- Los vales se guardan en el dispositivo (localStorage)
- Puedes compartir vales por WhatsApp con el enlace mágico 💌
- El destinatario importa el vale en su dispositivo

¡Disfruta enviando vales de amor! 🌹💜
