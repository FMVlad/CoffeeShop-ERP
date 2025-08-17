from fastapi import Depends, HTTPException, Request


def get_request_role(request: Request) -> str | None:
    """Extract a simple role from headers (temporary scheme for MVP).

    Frontend may pass header `X-Role: admin|manager|user` or Authorization in the future.
    If header is missing we return None (do not block to keep backwards compatibility).
    """
    role = request.headers.get("X-Role") or request.headers.get("X-ROLE")
    if role:
        return role.strip().lower()
    return None


def require_roles(allowed: list[str]):
    """Dependency that allows request only for specific roles.

    If role header is missing we currently ALLOW (MVP). If present and not in allowed -> 403.
    Later this can be replaced with JWT decoding and strict enforcement.
    """

    def _dependency(role: str | None = Depends(get_request_role)):
        if role is None:
            return True
        normalized = role.lower()
        if normalized not in [r.lower() for r in allowed]:
            raise HTTPException(status_code=403, detail="Недостатньо прав для виконання операції")
        return True

    return _dependency


