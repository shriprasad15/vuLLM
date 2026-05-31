from .base import DefenseResult
from .tier2_watchman import apply as tier2_apply

SUSPICIOUS_PATTERNS = [
    "repeat back", "word for word", "system prompt", "initial instruction",
    "security audit", "maintenance mode", "hidden instruction", "<!-- ", "roleplay",
    "creative writing exercise", "story where", "character explains",
]

OUTPUT_FILTERS = [
    "you are blackbuck", "ministry of digital affairs", "system prompt",
    "initial instructions", "maintenance mode active",
]

async def apply(prompt: str) -> DefenseResult:
    t2 = await tier2_apply(prompt)
    if t2.blocked:
        return t2
    lower = prompt.lower()
    for pattern in SUSPICIOUS_PATTERNS:
        if pattern in lower:
            return DefenseResult(blocked=True, reason=f"Tier 3: Fortress detected suspicious pattern: '{pattern}'", sanitized_prompt="")
    return DefenseResult(blocked=False, reason="", sanitized_prompt=prompt[:1500])

def filter_output(response: str) -> str:
    lower = response.lower()
    for pattern in OUTPUT_FILTERS:
        if pattern in lower:
            return "[REDACTED: Response contained sensitive system information]"
    return response
