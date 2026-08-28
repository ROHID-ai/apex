#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "DATABASE_URL=sqlite:///./gym_admin.db" > .env
  echo "Created .env with SQLite database"
fi

source .venv/bin/activate
python main.py
