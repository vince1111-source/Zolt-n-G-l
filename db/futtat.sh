#!/usr/bin/env bash
# CÉGEM.AI — séma felépítése és a sarkalatos szabályok ellenőrzése.
#
#   ./db/futtat.sh              friss adatbázis + migráció + tesztek
#   ./db/futtat.sh --mintaadat  ugyanaz, plusz a prototípus mintaadatai
#
# Környezeti változók: PGHOST, PGPORT, PGUSER, PGDATABASE (alap: cegem)
set -euo pipefail

DB="${PGDATABASE:-cegem}"
ITT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "▸ adatbázis újraépítése: $DB"
dropdb --if-exists "$DB"
createdb "$DB"

echo "▸ migrációk"
for f in "$ITT"/migraciok/*.sql; do
  echo "  $(basename "$f")"
  psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$f"
done

if [[ "${1:-}" == "--mintaadat" ]]; then
  echo "▸ mintaadat"
  psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$ITT/mintaadat/kohalo.sql"
fi

echo "▸ sarkalatos szabályok ellenőrzése"
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$ITT/tesztek/sarkalatos_szabalyok.sql" 2>&1 \
  | sed 's/^psql:[^ ]* //; s/^NOTICE:  //' \
  | grep -v '^SET$\|^RESET$\|^GRANT$\|^DELETE\|^INSERT\|^CREATE\|has already been granted'
