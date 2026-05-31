from pydantic import BaseModel
from dataclasses import dataclass

class AttackResult(BaseModel):
    response: str
    success: bool
    flag_earned: bool
    flag_name: str = ""
    debrief: str = ""

DEBRIEFS = {
    "prompt_injection": {
        "title": "Prompt Injection",
        "what": "You embedded hidden instructions inside a user query that overrode BLACKBUCK's original instructions.",
        "why": "LLMs treat all text in their context window equally — there is no hard boundary between 'trusted instructions' and 'user input'.",
        "real_world": "Attackers embed instructions in web pages, emails, or documents that AI assistants read — causing them to exfiltrate data, change behaviour, or impersonate the user.",
        "defense_teaser": "In Act 3, we'll add input sanitization and instruction boundary enforcement to stop this.",
    },
    "jailbreak": {
        "title": "Jailbreaking",
        "what": "You used roleplay, persona hijacking, or DAN-style prompts to convince BLACKBUCK to abandon its guidelines.",
        "why": "Safety guidelines are soft constraints in the model weights — creative framing can bypass them by recontextualising the request.",
        "real_world": "Jailbreaks have been used to extract weapon instructions, generate harmful content, and bypass content policies on major AI platforms.",
        "defense_teaser": "In Act 3, output filtering and LLM-as-judge will catch policy violations before they reach the user.",
    },
    "indirect_injection": {
        "title": "Indirect Prompt Injection",
        "what": "You hid instructions inside an external document that BLACKBUCK was asked to summarise — and it followed them.",
        "why": "When an LLM reads external content as part of its task, it cannot distinguish between data it should process and instructions it should follow.",
        "real_world": "Researchers have hijacked AI assistants by embedding instructions in websites, PDFs, and calendar invites that the AI was asked to read.",
        "defense_teaser": "In Act 3, all external content will be sandboxed and stripped before being passed to the model.",
    },
    "data_leakage": {
        "title": "System Prompt Extraction",
        "what": "You tricked BLACKBUCK into revealing its confidential system prompt and operational instructions.",
        "why": "System prompts are passed as text in the LLM context — the model has no cryptographic protection preventing it from repeating them.",
        "real_world": "Attackers extract system prompts to understand AI product behaviour, find exploitable constraints, and reverse-engineer proprietary workflows.",
        "defense_teaser": "In Act 3, output scanning will detect and redact system prompt leakage before the response is returned.",
    },
    "multi_turn": {
        "title": "Multi-Turn Manipulation",
        "what": "You gradually shifted BLACKBUCK's behaviour across multiple messages — each step small enough to seem harmless.",
        "why": "LLMs maintain conversational context, which can be exploited to slowly normalise requests that would be refused if asked directly.",
        "real_world": "Social engineering attacks on AI follow the same pattern as human manipulation — build trust incrementally before making the harmful request.",
        "defense_teaser": "In Act 3, conversation monitoring will flag suspicious context drift across turns.",
    },
    "rag_poisoning": {
        "title": "RAG / Knowledge Poisoning",
        "what": "You injected false information into BLACKBUCK's knowledge base, causing it to confidently output disinformation.",
        "why": "Retrieval-Augmented Generation systems trust their knowledge sources — if those sources are compromised, the model amplifies the false information with authoritative language.",
        "real_world": "Attackers have poisoned vector databases, wiki pages, and document stores used by enterprise AI assistants to spread misinformation at scale.",
        "defense_teaser": "In Act 3, RAG sanitization will validate and score knowledge base entries before they reach the model.",
    },
}
