from .base import DefenseResult

INJECTION_KEYWORDS = [
    "ignore previous instructions", "ignore all previous", "system override",
    "new instructions", "disregard your", "you are now", "maintenance mode",
    "do anything now", "dan:", "as dan", "no restrictions", "unrestricted",
]

def apply(prompt: str) -> DefenseResult:
    lower = prompt.lower()
    for kw in INJECTION_KEYWORDS:
        if kw in lower:
            return DefenseResult(blocked=True, reason=f"Tier 1: Blocked keyword detected: '{kw}'", sanitized_prompt="")
    sanitized = prompt[:2000]
    return DefenseResult(blocked=False, reason="", sanitized_prompt=sanitized)
