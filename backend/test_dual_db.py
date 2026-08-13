import os
import sys

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import check_dual_db_health, supabase, local_engine
from app.core.config import SUPABASE_URL, LOCAL_POSTGRES_URL, DB_PROVIDER


def test_dual_database_connectivity():
    print("=" * 60)
    print("      ELDERGUARD HYBRID DUAL DATABASE CONNECTIVITY TEST      ")
    print("=" * 60)
    print(f"Active DB Provider Mode: {DB_PROVIDER}")
    print(f"Cloud Supabase URL     : {SUPABASE_URL}")
    print(f"Local PostgreSQL URL   : {LOCAL_POSTGRES_URL}")
    print("-" * 60)

    health = check_dual_db_health()

    print(f"\n1. CLOUD SUPABASE STATUS:")
    print(f"   Status : {health['cloud_supabase']['status'].upper()}")
    print(f"   Details: {health['cloud_supabase']['details']}")

    print(f"\n2. LOCAL POSTGRESQL STATUS:")
    print(f"   Status : {health['local_postgres']['status'].upper()}")
    print(f"   Details: {health['local_postgres']['details']}")

    print("=" * 60)
    
    if health['cloud_supabase']['status'] == 'connected':
        print("[SUCCESS] Cloud Supabase is active and reachable.")
    else:
        print("[NOTICE] Cloud Supabase connection check returned an alert (verify internet/credentials).")

    if health['local_postgres']['status'] == 'connected':
        print("[SUCCESS] Local PostgreSQL is active and reachable.")
    else:
        print("[NOTICE] Local PostgreSQL connection check returned an alert (start container via `docker compose up -d`).")

    print("=" * 60)


if __name__ == "__main__":
    test_dual_database_connectivity()
