from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
user = os.getenv("NEO4J_USER", "neo4j")
password = os.getenv("NEO4J_PASSWORD")
database = os.getenv("NEO4J_DATABASE", "neo4j")

print(f"Attempting to connect to {uri} (DB: {database}) with user {user}...")

try:
    driver = GraphDatabase.driver(uri, auth=(user, password))
    with driver.session(database=database) as session:
        result = session.run("RETURN 1 as val")
        record = result.single()
        print(f"Successfully connected! Result: {record['val']}")
    driver.close()
except Exception as e:
    print(f"Detailed Error: {e}")
