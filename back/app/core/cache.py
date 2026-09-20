# app/core/cache.py
# =====================================================
# CACHÉ EN MEMORIA CON TTL
#
# ¿Por qué? Cada consulta a Supabase cuesta ~300-400 ms de latencia de red
# (medido). Para datos que cambian poco (catálogo de cursos, categorías, etc.)
# es un desperdicio ir a la base en cada petición.
#
# Esta caché guarda el resultado en memoria por N segundos.
# Se invalida explícitamente cuando los datos cambian.
#
# NOTA: es por proceso. Si algún día se escala a varios workers, migrar a Redis
# (ya está contemplado en config: REDIS_ENABLED).
# =====================================================

import logging
import threading
import time
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


class TTLCache:
    """Caché simple en memoria con expiración por tiempo (thread-safe)."""

    def __init__(self, ttl_por_defecto: int = 30):
        self._store: dict[str, tuple[Any, float]] = {}
        self._lock = threading.Lock()
        self._ttl = ttl_por_defecto
        self._hits = 0
        self._misses = 0

    # ---------- API básica ----------
    def get(self, clave: str) -> Optional[Any]:
        with self._lock:
            entrada = self._store.get(clave)
            if not entrada:
                self._misses += 1
                return None
            valor, expira = entrada
            if time.time() > expira:
                del self._store[clave]
                self._misses += 1
                return None
            self._hits += 1
            return valor

    def set(self, clave: str, valor: Any, ttl: Optional[int] = None) -> None:
        with self._lock:
            self._store[clave] = (valor, time.time() + (ttl if ttl is not None else self._ttl))

    def invalidar(self, prefijo: Optional[str] = None) -> int:
        """Invalida por prefijo (o todo si no se pasa nada). Devuelve cuántas entradas borró."""
        with self._lock:
            if prefijo is None:
                n = len(self._store)
                self._store.clear()
                return n
            claves = [k for k in self._store if k.startswith(prefijo)]
            for k in claves:
                del self._store[k]
            return len(claves)

    def obtener_o_calcular(
        self,
        clave: str,
        calcular: Callable[[], Any],
        ttl: Optional[int] = None,
    ) -> Any:
        """Devuelve el valor cacheado o lo calcula y guarda."""
        valor = self.get(clave)
        if valor is not None:
            return valor
        valor = calcular()
        self.set(clave, valor, ttl)
        return valor

    def estadisticas(self) -> dict:
        with self._lock:
            total = self._hits + self._misses
            return {
                "entradas": len(self._store),
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": round(self._hits / total * 100, 1) if total else 0.0,
            }

    def limpiar_expirados(self) -> int:
        with self._lock:
            ahora = time.time()
            vencidas = [k for k, (_, exp) in self._store.items() if ahora > exp]
            for k in vencidas:
                del self._store[k]
            return len(vencidas)


# Instancia global
cache = TTLCache(ttl_por_defecto=30)

# =====================================================
# CLAVES DE CACHÉ (centralizadas para evitar errores de tipeo)
# =====================================================
CLAVE_CATALOGO_CURSOS = "cursos:catalogo"
CLAVE_CURSOS_DOCENTE = "cursos:docente"      # + :{docente_id}
CLAVE_SOLICITUDES = "cursos:solicitudes"     # + :{docente_id}


def invalidar_cursos() -> None:
    """Llamar tras crear/editar/eliminar/publicar un curso o cambiar inscripciones."""
    n = cache.invalidar("cursos:")
    if n:
        logger.debug(f"Caché de cursos invalidada ({n} entradas)")


def invalidar_solicitudes() -> None:
    """Llamar tras aprobar/rechazar/crear una solicitud."""
    n = cache.invalidar("cursos:solicitudes")
    if n:
        logger.debug(f"Caché de solicitudes invalidada ({n} entradas)")
