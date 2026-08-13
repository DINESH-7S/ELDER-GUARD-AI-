import os
import sys
import logging
from sqlalchemy import create_engine, text

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import LOCAL_POSTGRES_URL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("init_local_db")

MIGRATIONS_FILE = os.path.join(os.path.dirname(__file__), "supabase", "combined_migrations.sql")


def init_local_database():
    """
    Initializes local PostgreSQL schema using combined_migrations.sql.
    """
    logger.info(f"Connecting to Local PostgreSQL at: {LOCAL_POSTGRES_URL}")
    if not os.path.exists(MIGRATIONS_FILE):
        logger.error(f"Migration file not found at: {MIGRATIONS_FILE}")
        return False

    with open(MIGRATIONS_FILE, "r", encoding="utf-8") as f:
        sql_script = f.read()

    try:
        engine = create_engine(LOCAL_POSTGRES_URL, isolation_level="AUTOCOMMIT")
        with engine.connect() as conn:
            logger.info("Executing migrations on local PostgreSQL...")
            conn.execute(text(sql_script))
            logger.info("Successfully executed combined migrations on Local PostgreSQL!")
            
            # Verify tables created
            res = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public';
            """))
            tables = [row[0] for row in res.fetchall()]
            logger.info(f"Found {len(tables)} tables in Local PostgreSQL: {', '.join(tables)}")
            return True
    except Exception as e:
        logger.error(f"Error initializing local PostgreSQL database: {e}")
        return False


if __name__ == "__main__":
    success = init_local_database()
    if not success:
        sys.exit(1)
