#!/bin/bash
# Runs automatically on first container start (mounted into
# /docker-entrypoint-initdb.d/ — see docker-compose.yml's postgres service).
# The official postgres image only creates ONE database from
# POSTGRES_DB; this creates the rest of them so the "one Postgres
# container, one database per service" architecture decision
# (MICROSERVICES_PLAN.md §1, confirmed decision #3) actually holds without
# 11 separate Postgres containers.
set -e
set -u

function create_database() {
	local database=$1
	echo "  Creating database '$database'"
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
	    SELECT 'CREATE DATABASE "$database"'
	    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$database')\gexec
EOSQL
}

if [ -n "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
	echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
	for db in $(echo "$POSTGRES_MULTIPLE_DATABASES" | tr ',' ' '); do
		create_database "$db"
	done
	echo "Multiple databases created"
fi
