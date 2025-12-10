import json
from pathlib import Path

# Define a few simple Code-Archaeologist-style examples
examples = [
    {
        "messages": [
            {
                "role": "user",
                "content": "Explain this git commit message in simple business terms: Initial commit",
            },
            {
                "role": "assistant",
                "content": (
                    "This commit creates the starting point of the project. "
                    "From a business perspective, it means work has officially begun on a new system "
                    "or feature to address a specific need. It does not deliver value yet but establishes "
                    "the foundation for future work."
                ),
            },
        ]
    },
    {
        "messages": [
            {
                "role": "user",
                "content": (
                    "Explain what this old function does and rewrite it safely: "
                    "import os; def get_secret(): return os.getenv('API_KEY')"
                ),
            },
            {
                "role": "assistant",
                "content": (
                    "The function returns the value of the API_KEY environment variable with no validation "
                    "or error handling. Any caller can read sensitive credentials. "
                    "A safer version checks for existence and fails loudly if the key is missing."
                ),
            },
        ]
    },
    {
        "messages": [
            {
                "role": "user",
                "content": (
                    "Review this function for hidden issues: "
                    "def send_email(address, msg): print(f'Email sent to {address}: {msg}')"
                ),
            },
            {
                "role": "assistant",
                "content": (
                    "This function only prints to stdout; it does not send an email. "
                    "It also leaks potentially sensitive contents into logs. In production you must call "
                    "a real email service and avoid logging message bodies."
                ),
            },
        ]
    },
    {
        "messages": [
            {
                "role": "user",
                "content": (
                    "What is wrong with this login function and how would you rewrite it? "
                    "function login(user, pass) { if (user == 'admin') return true; return false; }"
                ),
            },
            {
                "role": "assistant",
                "content": (
                    "It ignores the password entirely, hardcodes a single username, and has no hashing or "
                    "security. A proper login must verify a password hash from a data store and handle failures "
                    "securely."
                ),
            },
        ]
    },
    {
        "messages": [
            {
                "role": "user",
                "content": (
                    "Why is this delete_user function unsafe and how should it be fixed? "
                    "def delete_user(id): query = f'DELETE FROM users WHERE id = {id}'; db.execute(query)"
                ),
            },
            {
                "role": "assistant",
                "content": (
                    "It builds SQL with string interpolation, which is vulnerable to SQL injection if id "
                    "comes from user input. Use parameterized queries instead, for example: "
                    "\"DELETE FROM users WHERE id = ?\" with a bound parameter."
                ),
            },
        ]
    },
]

path = Path("data/training-data.jsonl")
path.parent.mkdir(parents=True, exist_ok=True)

with path.open("w", encoding="utf-8") as f:
    for ex in examples:
        f.write(json.dumps(ex, ensure_ascii=False) + "\n")

print("Wrote", len(examples), "examples to", path.resolve())

