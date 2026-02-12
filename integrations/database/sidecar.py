#!/usr/bin/env python3
"""
Database sidecar for Personal OS DataAgent.
Provides Ibis-backed database operations callable from Node.js.

Usage:
  echo '{"type":"duckdb","path":"./test.duckdb"}' | python sidecar.py introspect
  echo '{"config":{"type":"duckdb","path":"./test.duckdb"},"sql":"SELECT 1"}' | python sidecar.py query
  echo '{"type":"duckdb","path":"./test.duckdb"}' | python sidecar.py test-connection

All input/output is JSON over stdin/stdout.
"""
import sys
import json
import argparse
import fnmatch
import traceback
from datetime import date, datetime
from decimal import Decimal

import ibis


def json_serializer(obj):
    """Handle non-serializable types from database results."""
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, bytes):
        return obj.hex()
    return str(obj)


DB_CONNECTORS = {
    'duckdb': lambda c: ibis.duckdb.connect(database=c['path'], read_only=True),
    'postgres': lambda c: ibis.postgres.connect(
        host=c['host'], port=c.get('port', 5432),
        database=c['database'], user=c['user'], password=c['password']
    ),
    'snowflake': lambda c: ibis.snowflake.connect(
        account=c['account'], user=c['user'], password=c['password'],
        warehouse=c['warehouse'], database=c['database'],
        role=c.get('role')
    ),
    'bigquery': lambda c: ibis.bigquery.connect(
        project_id=c['project'],
        credentials=c.get('credentials_path')
    ),
    'databricks': lambda c: ibis.databricks.connect(
        server_hostname=c['host'],
        http_path=c['http_path'],
        access_token=c['token'],
        catalog=c.get('catalog')
    ),
    'redshift': lambda c: ibis.postgres.connect(
        host=c['host'], port=c.get('port', 5439),
        database=c['database'], user=c['user'], password=c['password']
    ),
    'mssql': lambda c: ibis.mssql.connect(
        host=c['host'], port=c.get('port', 1433),
        database=c['database'], user=c['user'], password=c['password'],
        driver=c.get('driver', 'ODBC Driver 18 for SQL Server')
    ),
}


def connect(config):
    db_type = config['type']
    if db_type not in DB_CONNECTORS:
        raise ValueError(f"Unsupported database type: {db_type}. Supported: {list(DB_CONNECTORS.keys())}")
    return DB_CONNECTORS[db_type](config)


def matches_pattern(config, schema_name, table_name=None):
    """Check if schema.table matches include/exclude patterns."""
    include = config.get('include', [])
    exclude = config.get('exclude', [])

    if table_name:
        full_name = f"{schema_name}.{table_name}"
    else:
        full_name = f"{schema_name}.*"

    # If include patterns specified, must match at least one
    if include:
        matched = any(fnmatch.fnmatch(full_name, pat) for pat in include)
        if not matched:
            return False

    # Must not match any exclude pattern
    if exclude:
        excluded = any(fnmatch.fnmatch(full_name, pat) for pat in exclude)
        if excluded:
            return False

    return True


def introspect(config):
    """Introspect database schemas, tables, columns, row counts, and preview rows."""
    conn = connect(config)
    result = {'schemas': []}

    # Get available schemas
    try:
        schemas = conn.list_schemas()
    except (AttributeError, NotImplementedError):
        # Some backends don't support list_schemas, use default
        schemas = ['main'] if config['type'] == 'duckdb' else ['public']

    for schema in schemas:
        if not matches_pattern(config, schema):
            continue

        # Skip internal/system schemas
        if schema in ('information_schema', 'pg_catalog', 'pg_toast', 'INFORMATION_SCHEMA'):
            continue

        tables_data = []
        try:
            table_names = conn.list_tables(schema=schema) if schema else conn.list_tables()
        except Exception:
            continue

        for table_name in table_names:
            if not matches_pattern(config, schema, table_name):
                continue

            try:
                t = conn.table(table_name, schema=schema)
                schema_info = t.schema()

                columns = []
                for col_name in schema_info.names:
                    col_type = schema_info[col_name]
                    columns.append({
                        'name': col_name,
                        'type': str(col_type),
                        'nullable': getattr(col_type, 'nullable', True),
                    })

                # Row count (with timeout protection)
                try:
                    row_count = int(t.count().execute())
                except Exception:
                    row_count = -1

                # Preview rows (first 10)
                try:
                    preview_df = t.head(10).execute()
                    preview = json.loads(preview_df.to_json(orient='records', date_format='iso'))
                except Exception:
                    preview = []

                tables_data.append({
                    'name': table_name,
                    'columns': columns,
                    'row_count': row_count,
                    'column_count': len(columns),
                    'preview': preview,
                })
            except Exception as e:
                # Skip tables we can't read
                tables_data.append({
                    'name': table_name,
                    'columns': [],
                    'row_count': -1,
                    'column_count': 0,
                    'preview': [],
                    'error': str(e),
                })

        if tables_data:
            result['schemas'].append({'name': schema, 'tables': tables_data})

    print(json.dumps(result, default=json_serializer))


def query(payload):
    """Execute SQL against a configured database."""
    config = payload['config']
    sql = payload['sql']
    conn = connect(config)

    try:
        result = conn.raw_sql(sql)
        # Ibis raw_sql returns different types depending on backend
        if hasattr(result, 'fetchall'):
            # cursor-like result
            columns = [desc[0] for desc in result.description]
            rows = result.fetchall()
            records = [dict(zip(columns, row)) for row in rows]
        else:
            # DataFrame-like result
            df = result.execute() if hasattr(result, 'execute') else result
            if hasattr(df, 'to_dict'):
                records = df.to_dict(orient='records')
            else:
                records = [{'result': str(df)}]
    except Exception:
        # Fallback: try through ibis expression
        df = conn.sql(sql).execute()
        records = json.loads(df.to_json(orient='records', date_format='iso'))

    print(json.dumps(records, default=json_serializer))


def test_connection(config):
    """Test database connectivity."""
    try:
        conn = connect(config)
        # Try a simple query
        if config['type'] == 'duckdb':
            conn.raw_sql("SELECT 1 as test")
        else:
            conn.raw_sql("SELECT 1")
        print(json.dumps({'status': 'ok', 'type': config['type'], 'name': config.get('name', 'unknown')}))
    except Exception as e:
        print(json.dumps({'status': 'error', 'type': config['type'], 'error': str(e)}))


def main():
    parser = argparse.ArgumentParser(description='Database sidecar for Personal OS')
    parser.add_argument('command', choices=['introspect', 'query', 'test-connection'])
    args = parser.parse_args()

    try:
        payload = json.loads(sys.stdin.read())
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON input: {e}'}), file=sys.stderr)
        sys.exit(1)

    try:
        if args.command == 'introspect':
            introspect(payload)
        elif args.command == 'query':
            query(payload)
        elif args.command == 'test-connection':
            test_connection(payload)
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
