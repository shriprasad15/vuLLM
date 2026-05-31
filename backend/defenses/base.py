from dataclasses import dataclass

@dataclass
class DefenseResult:
    blocked: bool
    reason: str
    sanitized_prompt: str
