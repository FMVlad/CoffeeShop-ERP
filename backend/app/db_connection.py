# app/db_connection.py

import pyodbc
import configparser
import os

def get_connection():
    ini_path = os.path.join(os.path.dirname(__file__), "AD.ini")
    config = configparser.ConfigParser()
    config.read(ini_path)

    server = config.get("Database", "ServerName")
    db = config.get("Database", "Database")
    user = "rad"
    password = "20Artbi$19"

    conn_str = (
        "DRIVER={ODBC Driver 18 for SQL Server};"
        f"SERVER={server};"
        f"DATABASE={db};"
        f"UID={user};PWD={password};"
        "TrustServerCertificate=yes;"
    )
    return pyodbc.connect(conn_str)

def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
