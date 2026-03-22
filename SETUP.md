# 🚀 ShiftSync Project Setup Guide

Welcome to the **ShiftSync** project! Follow these steps to get the application running on your local machine after cloning the repository.

---

## 🛠️ Step 1: Backend Setup (Python & FastAPI)

1.  **Open a terminal** in the `Shiftmanagementbackend` folder.
2.  **Create a Virtual Environment**:
    ```bash
    python -m venv venv
    ```
3.  **Activate the Virtual Environment**:
    - **Windows**: `venv\Scripts\activate`
    - **Mac/Linux**: `source venv/bin/activate`
4.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
5.  **Create `.env` file**: Create a new file named `.env` inside `Shiftmanagementbackend/` and paste this (use your own keys!):
    ```env
    NEO4J_URI=bolt://localhost:7687
    NEO4J_USER=neo4j
    NEO4J_PASSWORD=your_password_here
    NEO4J_DATABASE=ShiftSyncDB
    USER_DATABASE=neo4j
    SECRET_KEY=98b90f73ba8e6f3991bfc8399959bcf60dcc3f0f0ff43324c075fe5ccb88f0fe
    ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    OPENAI_API_KEY=your_openai_key_here
    ```

---

## 💻 Step 2: Frontend Setup (React & Vite)

1.  **Open a terminal** in the `Shiftmanagementfrontend` folder.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Create `.env` file**: Create a new file named `.env` inside `Shiftmanagementfrontend/` and paste this:
    ```env
    VITE_OPENAI_API_KEY=your_openai_key_here
    ```

---

## 🗄️ Step 3: Database Setup (Neo4j)

1.  **Download and install** [Neo4j Desktop](https://neo4j.com/download-center/#desktop).
2.  **Start a new DBMS** (Default user is `neo4j`).
3.  **Click "Start"** on the database.
4.  **Open Neo4j Browser** (http://localhost:7474) and run this command to create the logs database:
    ```cypher
    CREATE DATABASE ShiftSyncDB IF NOT EXISTS
    ```

---

## 🚀 Step 4: Running the App

1.  **Start Backend**: In the backend folder (with venv active), run:
    ```bash
    python -m uvicorn main:app --reload --port 8000
    ```
2.  **Start Frontend**: In the frontend folder, run:
    ```bash
    npm run dev
    ```
3.  Open [http://localhost:5173](http://localhost:5173) in your browser! 🏁
