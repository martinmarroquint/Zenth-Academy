# app/core/ratelimit.py
# RATE LIMITING EN MEMORIA (ventana deslizante por IP)
# ⚠️ Adecuado para instancia única. Para múltiples workers/procesos usar Redis.

import time
import threading
from collections import defaultdict, deque
from fastapi import HTTPException, Request, status

_lock = threading.Lock()
_hits = defaultdict(lambda: deque())


def rate_limit(max_requests: int, window_seconds: int):
    """
    Factory de dependencia FastAPI. Limita las peticiones por IP
    a `max_requests` por ventana de `window_seconds` segundos.
    """
    def dependency(request: Request):
        ip = request.client.host if request.client else "unknown"
        key = f"{request.url.path}:{ip}"
        now = time.time()
        with _lock:
            dq = _hits[key]
            while dq and now - dq[0] > window_seconds:
                dq.popleft()
            if len(dq) >= max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Demasiadas peticiones. Intente nuevamente en unos segundos."
                )
            dq.append(now)
        return request
    return dependency