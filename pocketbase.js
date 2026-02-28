/**
 * PocketBase Integration for Vales de Amor
 * 
 * Este módulo maneja la sincronización de vales con PocketBase.
 * Funciona como capa de persistencia remota complementando localStorage.
 * 
 * CONFIGURACIÓN:
 * 1. Descarga PocketBase desde https://pocketbase.io/
 * 2. Ejecuta: pocketbase serve
 * 3. Crea la colección "vales" con los campos indicados abajo
 * 4. Actualiza POCKETBASE_URL con tu URL (por defecto localhost:8090)
 */

// ===== CONFIGURACIÓN =====
const POCKETBASE_URL = 'http://127.0.0.1:8090'; // Cambia esto a tu URL de PocketBase

// Estado del cliente
let pb = null;
let realtimeSubscription = null;

/**
 * Inicializa el cliente de PocketBase
 */
async function initPocketBase() {
    try {
        // Cargar el SDK de PocketBase desde CDN
        if (typeof PocketBase === 'undefined') {
            await loadPocketBaseSDK();
        }
        
        pb = new PocketBase(POCKETBASE_URL);
        
        // Intentar conexión
        const health = await pb.health.check();
        console.log('✅ PocketBase conectado:', health);
        
        return true;
    } catch (error) {
        console.warn('⚠️ PocketBase no disponible, usando solo localStorage:', error.message);
        pb = null;
        return false;
    }
}

/**
 * Carga el SDK de PocketBase dinámicamente
 */
function loadPocketBaseSDK() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/pocketbase@0.21.1/dist/pocketbase.umd.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('No se pudo cargar el SDK de PocketBase'));
        document.head.appendChild(script);
    });
}

// ===== OPERACIONES CRUD =====

/**
 * Guarda un vale en PocketBase
 * @param {Object} vale - El vale a guardar
 * @returns {Object|null} - El vale guardado o null si falla
 */
async function pbSaveVale(vale) {
    if (!pb) return null;
    
    try {
        // Verificar si el vale ya existe (por serial)
        const existing = await pbFindBySerial(vale.serial);
        
        if (existing) {
            // Actualizar si ya existe
            const updated = await pb.collection('vales').update(existing.id, {
                concept: vale.concept,
                from_user: vale.from,
                to_user: vale.to,
                serial: vale.serial,
                caduca: vale.caduca,
                emitido: vale.emitido,
                local_id: vale.id
            });
            console.log('📝 Vale actualizado en PocketBase:', updated.id);
            return updated;
        } else {
            // Crear nuevo
            const created = await pb.collection('vales').create({
                concept: vale.concept,
                from_user: vale.from,
                to_user: vale.to,
                serial: vale.serial,
                caduca: vale.caduca,
                emitido: vale.emitido,
                local_id: vale.id
            });
            console.log('💾 Vale guardado en PocketBase:', created.id);
            return created;
        }
    } catch (error) {
        console.error('❌ Error guardando vale en PocketBase:', error);
        return null;
    }
}

/**
 * Busca un vale por su serial
 * @param {string} serial - El número de serie del vale
 * @returns {Object|null}
 */
async function pbFindBySerial(serial) {
    if (!pb) return null;
    
    try {
        const result = await pb.collection('vales').getFirstListItem(`serial="${serial}"`);
        return result;
    } catch (error) {
        // No encontrado no es un error
        if (error.status === 404) return null;
        console.error('Error buscando vale:', error);
        return null;
    }
}

/**
 * Obtiene todos los vales RECIBIDOS por un usuario (donde es destinatario)
 * @param {string} owner - "Florecilla" o "Chiquitín"
 * @returns {Array} - Lista de vales recibidos
 */
async function pbGetValesForUser(owner) {
    if (!pb) return [];
    
    try {
        // Solo obtener vales donde el usuario es el DESTINATARIO (to_user)
        const result = await pb.collection('vales').getList(1, 100, {
            filter: `to_user="${owner}"`,
            sort: '-created'
        });
        
        // Convertir al formato de la app
        return result.items.map(item => ({
            id: item.local_id || Date.now(),
            concept: item.concept,
            from: item.from_user,
            to: item.to_user,
            serial: item.serial,
            caduca: item.caduca,
            emitido: item.emitido,
            canje_status: item.canje_status || null,
            canje_fecha: item.canje_fecha || null,
            canje_aceptado: item.canje_aceptado || null,
            _pbId: item.id // Guardar referencia de PocketBase
        }));
    } catch (error) {
        console.error('❌ Error obteniendo vales de PocketBase:', error);
        return [];
    }
}

/**
 * Obtiene todos los vales EMITIDOS por un usuario (donde es emisor)
 * @param {string} emisor - "Florecilla" o "Chiquitín"
 * @returns {Array} - Lista de vales emitidos
 */
async function pbGetEmitidos(emisor) {
    if (!pb) return [];
    
    try {
        // Solo obtener vales donde el usuario es el EMISOR (from_user)
        const result = await pb.collection('vales').getList(1, 100, {
            filter: `from_user="${emisor}"`,
            sort: '-created'
        });
        
        // Convertir al formato de la app
        return result.items.map(item => ({
            id: item.local_id || Date.now(),
            concept: item.concept,
            from: item.from_user,
            to: item.to_user,
            serial: item.serial,
            caduca: item.caduca,
            emitido: item.emitido,
            canje_status: item.canje_status || null,
            canje_fecha: item.canje_fecha || null,
            canje_aceptado: item.canje_aceptado || null,
            _pbId: item.id
        }));
    } catch (error) {
        console.error('❌ Error obteniendo vales emitidos de PocketBase:', error);
        return [];
    }
}

/**
 * Elimina un vale de PocketBase
 * @param {string} serial - El número de serie del vale a eliminar
 */
async function pbDeleteVale(serial) {
    if (!pb) return false;
    
    try {
        const existing = await pbFindBySerial(serial);
        if (existing) {
            await pb.collection('vales').delete(existing.id);
            console.log('🗑️ Vale eliminado de PocketBase:', serial);
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Error eliminando vale de PocketBase:', error);
        return false;
    }
}

// ===== SINCRONIZACIÓN =====

/**
 * Sincroniza los vales locales con PocketBase
 * - Sube vales locales que no existen en PocketBase
 * - Descarga vales de PocketBase que no existen localmente
 * - Solo sincroniza vales RECIBIDOS (donde el usuario es destinatario)
 * @param {string} owner - Usuario a sincronizar
 */
async function pbSyncVales(owner) {
    if (!pb) return;
    
    console.log('🔄 Sincronizando vales recibidos para', owner);
    
    try {
        // Obtener vales locales (filtrar solo los recibidos)
        const localVales = await loadWalletData(owner);
        const localReceivedVales = localVales.filter(v => v.to === owner);
        const localSerials = new Set(localReceivedVales.map(v => v.serial));
        
        // Obtener vales de PocketBase (ya filtrados por to_user)
        const remoteVales = await pbGetValesForUser(owner);
        const remoteSerials = new Set(remoteVales.map(v => v.serial));
        
        // Subir vales locales recibidos que no existen en remoto
        for (const vale of localReceivedVales) {
            if (!remoteSerials.has(vale.serial)) {
                await pbSaveVale(vale);
            }
        }
        
        // Descargar vales remotos que no existen localmente
        const newVales = remoteVales.filter(v => !localSerials.has(v.serial));
        if (newVales.length > 0) {
            const merged = [...localVales];
            for (const vale of newVales) {
                // Solo añadir si el vale es para este usuario (destinatario)
                if (vale.to === owner && !merged.find(v => v.serial === vale.serial)) {
                    merged.unshift(vale);
                }
            }
            await saveWalletData(owner, merged);
            console.log(`📥 ${newVales.length} vales nuevos descargados de PocketBase`);
        }
        
        console.log('✅ Sincronización completa');
    } catch (error) {
        console.error('❌ Error en sincronización:', error);
    }
}

// ===== REALTIME =====

/**
 * Suscribirse a cambios en tiempo real
 * Solo procesa vales donde el usuario es el DESTINATARIO
 * @param {string} owner - Usuario actual
 * @param {Function} onNewVale - Callback cuando llega un vale nuevo
 */
async function pbSubscribeToChanges(owner, onNewVale) {
    if (!pb) return;
    
    try {
        // Cancelar suscripción anterior si existe
        if (realtimeSubscription) {
            pb.collection('vales').unsubscribe(realtimeSubscription);
        }
        
        realtimeSubscription = await pb.collection('vales').subscribe('*', async (e) => {
            console.log('📡 Evento realtime:', e.action, e.record);
            
            const vale = {
                id: e.record.local_id || Date.now(),
                concept: e.record.concept,
                from: e.record.from_user,
                to: e.record.to_user,
                serial: e.record.serial,
                caduca: e.record.caduca,
                emitido: e.record.emitido
            };
            
            // Solo procesar si el vale es PARA el usuario actual (es destinatario)
            if (vale.to !== owner) return;
            
            if (e.action === 'create') {
                // Vale nuevo - guardar localmente
                const localData = await loadWalletData(owner);
                if (!localData.find(v => v.serial === vale.serial)) {
                    localData.unshift(vale);
                    await saveWalletData(owner, localData);
                    
                    // Notificar que llegó un vale nuevo
                    if (onNewVale) {
                        onNewVale(vale);
                    }
                }
            } else if (e.action === 'delete') {
                // Vale eliminado - quitar localmente
                const localData = await loadWalletData(owner);
                const filtered = localData.filter(v => v.serial !== vale.serial);
                if (filtered.length !== localData.length) {
                    await saveWalletData(owner, filtered);
                }
            }
            
            // Refrescar la wallet
            if (typeof renderWallet === 'function') {
                renderWallet();
            }
        });
        
        console.log('📡 Suscripción realtime activa');
    } catch (error) {
        console.error('❌ Error en suscripción realtime:', error);
    }
}

/**
 * Cancelar suscripción realtime
 */
function pbUnsubscribe() {
    if (pb && realtimeSubscription) {
        pb.collection('vales').unsubscribe(realtimeSubscription);
        realtimeSubscription = null;
    }
}

// ===== CANJE SYSTEM =====

/**
 * Actualiza el estado de canje de un vale
 * @param {string} serial - El número de serie del vale
 * @param {string|null} status - 'pendiente', 'canjeado', o null
 * @param {string|null} fecha - Fecha de solicitud de canje
 * @returns {boolean}
 */
async function pbUpdateCanjeStatus(serial, status, fecha) {
    if (!pb) return false;
    
    try {
        const existing = await pbFindBySerial(serial);
        if (existing) {
            const updateData = {
                canje_status: status,
                canje_fecha: fecha
            };
            
            // Si se acepta el canje, añadir la fecha de aceptación
            if (status === 'canjeado') {
                updateData.canje_aceptado = new Date().toLocaleDateString('es-ES');
            }
            
            await pb.collection('vales').update(existing.id, updateData);
            console.log('🎁 Estado de canje actualizado:', serial, status);
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Error actualizando estado de canje:', error);
        return false;
    }
}

/**
 * Obtiene vales con solicitudes de canje pendientes donde el usuario es el emisor
 * @param {string} emisor - El usuario que emitió los vales
 * @returns {Array}
 */
async function pbGetPendingCanjes(emisor) {
    if (!pb) return [];
    
    try {
        const result = await pb.collection('vales').getList(1, 100, {
            filter: `from_user="${emisor}" && canje_status="pendiente"`,
            sort: '-updated'
        });
        
        return result.items.map(item => ({
            id: item.local_id || Date.now(),
            concept: item.concept,
            from: item.from_user,
            to: item.to_user,
            serial: item.serial,
            caduca: item.caduca,
            emitido: item.emitido,
            canje_status: item.canje_status,
            canje_fecha: item.canje_fecha,
            _pbId: item.id
        }));
    } catch (error) {
        console.error('❌ Error obteniendo canjes pendientes:', error);
        return [];
    }
}

// ===== HELPERS =====

/**
 * Verifica si PocketBase está disponible
 */
function isPocketBaseConnected() {
    return pb !== null;
}

/**
 * Obtiene la URL de PocketBase configurada
 */
function getPocketBaseURL() {
    return POCKETBASE_URL;
}

// Exportar para uso global
window.PB = {
    init: initPocketBase,
    save: pbSaveVale,
    getVales: pbGetValesForUser,
    getEmitidos: pbGetEmitidos,
    delete: pbDeleteVale,
    sync: pbSyncVales,
    subscribe: pbSubscribeToChanges,
    unsubscribe: pbUnsubscribe,
    isConnected: isPocketBaseConnected,
    getURL: getPocketBaseURL,
    updateCanjeStatus: pbUpdateCanjeStatus,
    getPendingCanjes: pbGetPendingCanjes
};

console.log('📦 Módulo PocketBase cargado. Usa window.PB para acceder a las funciones.');
