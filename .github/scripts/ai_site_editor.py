import json
import os
import re
from pathlib import Path
from urllib import request
from urllib.error import HTTPError


ALLOWED_FILES = {
    "index.html",
    "services.html",
    "projects.html",
    "contact.html",
    "book.html",
    "_data/site.yml",
    "_layouts/default.html",
    "assets/css/style.css",
    "_config.yml",
}


def _read_json(path: Path):
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _strip_code_fences(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\\s*", "", cleaned)
    cleaned = re.sub(r"\\s*```$", "", cleaned)
    return cleaned.strip()


def _safe_rel_path(path: str) -> str:
    rel = path.replace("\\", "/").strip().lstrip("/")
    return rel


def _read_allowed_files(repo_root: Path):
    snapshot = {}
    for rel in sorted(ALLOWED_FILES):
        file_path = repo_root / rel
        if file_path.exists() and file_path.is_file():
            snapshot[rel] = file_path.read_text(encoding="utf-8")
    return snapshot


def _build_request_text(event_name: str, event: dict) -> str:
    issue = event.get("issue", {})
    issue_title = issue.get("title", "")
    issue_body = issue.get("body", "") or ""
    comment_body = ""

    if event_name == "issue_comment":
        comment_body = (event.get("comment", {}) or {}).get("body", "") or ""

    if comment_body.strip().startswith("/ai"):
        comment_body = comment_body.strip()[3:].strip()

    combined = [
        f"Issue title: {issue_title}",
        "Issue body:",
        issue_body,
    ]

    if comment_body.strip():
        combined.extend(["Latest comment:", comment_body])

    return "\n\n".join(combined).strip()


def _json_schema():
    return {
        "name": "site_edit",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "summary": {"type": "string"},
                "pr_title": {"type": "string"},
                "commit_message": {"type": "string"},
                "changes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "path": {"type": "string"},
                            "content": {"type": "string"},
                        },
                        "required": ["path", "content"],
                    },
                },
            },
            "required": ["summary", "pr_title", "commit_message", "changes"],
        },
    }


def _call_openai(api_key: str, model: str, system_prompt: str, user_prompt: str) -> dict:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": _json_schema(),
        },
        "temperature": 0.2,
    }

    req = request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(req) as response:
            body = response.read().decode("utf-8")
            data = json.loads(body)
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI API error ({error.code}): {detail}") from error

    content = data["choices"][0]["message"]["content"]
    if isinstance(content, list):
        content = "\n".join(part.get("text", "") for part in content if isinstance(part, dict))

    parsed = json.loads(_strip_code_fences(content))
    return parsed


def _write_output(name: str, value: str):
    output_file = os.getenv("GITHUB_OUTPUT")
    if not output_file:
        return
    with open(output_file, "a", encoding="utf-8") as file:
        file.write(f"{name}<<EOF\n{value}\nEOF\n")


def main():
    workspace = Path(os.environ["GITHUB_WORKSPACE"])
    event_name = os.environ["GITHUB_EVENT_NAME"]
    event_path = Path(os.environ["GITHUB_EVENT_PATH"])
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("OPENAI_MODEL", "gpt-5-mini").strip()

    if not api_key:
        raise RuntimeError("Missing OPENAI_API_KEY secret.")

    event = _read_json(event_path)
    request_text = _build_request_text(event_name, event)
    files_snapshot = _read_allowed_files(workspace)

    system_prompt = (
        "You edit a Jekyll marketing website. "
        "Return only structured JSON matching the schema. "
        "Only change files when requested and keep changes minimal, valid, and production-ready. "
        "Do not invent paths, do not alter tooling/workflows/scripts, and do not add files."
    )

    user_prompt = (
        "User request:\n"
        f"{request_text}\n\n"
        "Allowed files (existing content only):\n"
        + "\n".join(sorted(ALLOWED_FILES))
        + "\n\nCurrent file contents:\n"
        + json.dumps(files_snapshot, ensure_ascii=False)
    )

    result = _call_openai(api_key=api_key, model=model, system_prompt=system_prompt, user_prompt=user_prompt)

    raw_changes = result.get("changes", [])
    applied = []
    for change in raw_changes:
        rel = _safe_rel_path(change.get("path", ""))
        if rel not in ALLOWED_FILES:
            continue

        target = workspace / rel
        if not target.exists() or not target.is_file():
            continue

        new_content = change.get("content", "")
        old_content = target.read_text(encoding="utf-8")
        if new_content != old_content:
            target.write_text(new_content, encoding="utf-8")
            applied.append(rel)

    no_changes = len(applied) == 0

    summary = result.get("summary", "AI update prepared.")
    commit_message = result.get("commit_message", "chore: apply ai site updates")
    pr_title = result.get("pr_title", "AI site update")

    if len(commit_message) > 120:
        commit_message = commit_message[:120]
    if len(pr_title) > 120:
        pr_title = pr_title[:120]

    if not no_changes:
        summary = f"{summary}\n\nChanged files: {', '.join(applied)}"

    _write_output("ai_noop", "true" if no_changes else "false")
    _write_output("ai_summary", summary)
    _write_output("ai_commit_message", commit_message)
    _write_output("ai_pr_title", pr_title)


if __name__ == "__main__":
    main()