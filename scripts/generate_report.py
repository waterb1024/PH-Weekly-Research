"""Weekly research report generator.

Runs the source-specific prompt via Anthropic API (with web_search tool),
extracts the JSON payload from the model's response, and POSTs it to the
Render ingest endpoint.

Usage:
    python scripts/generate_report.py <source>

Where <source> is one of: product_hunt, indie_hackers, hacker_news, reddit.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

import anthropic
import requests


PROMPT_FILE_BY_SOURCE = {
    "product_hunt": "product-hunt-research-prompt.md",
    "indie_hackers": "indie-hackers-research-prompt.md",
    "hacker_news": "hacker-news-research-prompt.md",
    "reddit": "reddit-research-prompt.md",
}

MODEL = "claude-sonnet-4-6"
INGEST_URL = "https://notepad-dvf7.onrender.com/api/reports/ingest"


def load_prompt(source: str) -> str:
    """Read the source-specific md file and return only the prompt section.

    The md files start with a meta preamble (rendered as documentation). The
    actual prompt lives after the `## 프롬프트` heading — that's the piece we
    pass to the model.
    """
    fname = PROMPT_FILE_BY_SOURCE[source]
    path = Path(__file__).parent / "prompts" / fname
    lines = path.read_text(encoding="utf-8").splitlines()
    for i, line in enumerate(lines):
        if line.strip() == "## 프롬프트":
            return "\n".join(lines[i + 1 :]).strip()
    raise ValueError(f"'## 프롬프트' heading missing in {fname}")


def extract_json(text: str) -> dict:
    """Find the largest top-level JSON object in text and parse it."""
    # Prefer fenced ```json blocks
    fenced = re.findall(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    candidates = fenced[:]
    if not candidates:
        # Fallback: brute-force balance-scan for the outermost object
        start = text.find("{")
        while start != -1:
            depth = 0
            for i in range(start, len(text)):
                c = text[i]
                if c == "{":
                    depth += 1
                elif c == "}":
                    depth -= 1
                    if depth == 0:
                        candidates.append(text[start : i + 1])
                        break
            start = text.find("{", start + 1)

    # Try candidates by size (largest first — likely the full report)
    candidates.sort(key=len, reverse=True)
    for raw in candidates:
        try:
            data = json.loads(raw)
            if isinstance(data, dict) and "source" in data and "top5Opportunities" in data:
                return data
        except json.JSONDecodeError:
            continue
    raise ValueError("No parseable ResearchData JSON found in model response")


def run(source: str) -> None:
    if source not in PROMPT_FILE_BY_SOURCE:
        raise SystemExit(f"unknown source: {source}")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise SystemExit("ANTHROPIC_API_KEY not set")

    ingest_key = os.environ.get("INGEST_API_KEY")
    if not ingest_key:
        raise SystemExit("INGEST_API_KEY not set")

    prompt = load_prompt(source)
    client = anthropic.Anthropic(api_key=api_key)

    print(f"[{source}] calling Anthropic API with web_search tool...", flush=True)
    response = client.messages.create(
        model=MODEL,
        max_tokens=32000,
        tools=[
            {
                "type": "web_search_20250305",
                "name": "web_search",
                "max_uses": 30,
            }
        ],
        messages=[{"role": "user", "content": prompt}],
    )

    text = "".join(
        block.text for block in response.content if getattr(block, "type", None) == "text"
    )
    print(f"[{source}] model response text length: {len(text)}", flush=True)

    report = extract_json(text)
    report["source"] = source  # enforce source id

    print(f"[{source}] extracted JSON. themes={len(report.get('themes', []))}, "
          f"opportunities={len(report.get('top5Opportunities', []))}", flush=True)

    print(f"[{source}] POSTing to {INGEST_URL}...", flush=True)
    resp = requests.post(
        INGEST_URL,
        headers={
            "Authorization": f"Bearer {ingest_key}",
            "Content-Type": "application/json",
        },
        json=report,
        timeout=60,
    )
    resp.raise_for_status()
    print(f"[{source}] ingested: {resp.json()}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", choices=list(PROMPT_FILE_BY_SOURCE.keys()))
    args = parser.parse_args()
    run(args.source)


if __name__ == "__main__":
    main()
