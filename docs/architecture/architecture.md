# System Architecture & Diagrams

The diagrams below are written in Mermaid. They render on GitHub, in VS Code (with a Mermaid preview extension)
and at https://mermaid.live, where they can also be exported as PNG/SVG for the report.

## 1. System architecture

```mermaid
flowchart LR
  subgraph Client["Browser: React + Vite"]
    UI[Pages: Landing · Games · Predict · Results · Analytics · History · Methodology]
    SVC[services/api.js · Axios]
    UI --> SVC
  end
  subgraph Server["FastAPI backend (Uvicorn)"]
    R[API routes /api/*]
    V[Validation: Pydantic schema + cross-field rules]
    P[Predictor: build_features → model → SHAP]
    REG[(Model registry: loaded once at startup)]
    DB[(SQLite: predictions)]
    R --> V --> P --> REG
    R --> DB
  end
  subgraph Offline["Offline ML pipeline (Python)"]
    RAW[(data/raw/*.csv)] --> PRE[preprocessing.py] --> FE[feature_engineering.py]
    FE --> TR[trainer: group split · 5 models · CV · SHAP]
    TR --> ART[(ml/artifacts/game: model.joblib, schema/metrics/analytics.json)]
  end
  SVC -- HTTP JSON --> R
  ART --> REG
  FE -. same build_features code .-> P
```

## 2. Data flow diagram

**Level 0 (context)**

```mermaid
flowchart LR
  U([User]) -- match statistics --> S[[Esports Performance Predictor]]
  S -- prediction, interpretation, explanation, analytics --> U
  D[(Public datasets)] -- training data --> S
```

**Level 1**

```mermaid
flowchart TB
  U([User]) -->|selects game| P1[1.0 Load game schema]
  P1 -->|form fields| U
  U -->|inputs| P2[2.0 Validate inputs]
  P2 -->|errors| U
  P2 -->|valid inputs| P3[3.0 Engineer features]
  P3 --> P4[4.0 Predict with game model]
  P4 --> P5[5.0 Explain with SHAP and interpret]
  P5 -->|result| U
  P5 --> D2[(D2 Prediction history)]
  D1[(D1 Model artifacts)] --> P1 & P4 & P5
  D3[(D3 Raw datasets)] --> P6[6.0 Offline training] --> D1
  D1 --> P7[7.0 Serve analytics] -->|charts| U
```

## 3. Use-case diagram

```mermaid
flowchart LR
  User((User / Player))
  Examiner((Examiner / Analyst))
  Dev((Developer))
  subgraph System
    UC1([Choose game])
    UC2([Enter match statistics])
    UC3([Get prediction])
    UC4([View explanation])
    UC5([View prediction history])
    UC6([View model analytics])
    UC7([Read methodology])
    UC8([Train / retrain models])
    UC9([Run tests])
  end
  User --> UC1 --> UC2 --> UC3
  UC3 -. includes .-> UC4
  User --> UC5
  Examiner --> UC6 & UC7
  Dev --> UC8 & UC9
```

## 4. Activity diagram: making a prediction

```mermaid
flowchart TD
  A([Start]) --> B[Open Games page]
  B --> C{Model ready?}
  C -- No --> C1[Show 'Unavailable' + reason] --> Z([End])
  C -- Yes --> D[Open game-specific form]
  D --> E[Enter stats / fill medians]
  E --> F{Client validation OK?}
  F -- No --> F1[Show inline errors] --> E
  F -- Yes --> G[POST /api/predict/game]
  G --> H{Server validation OK?}
  H -- No: 422 --> H1[Show server messages] --> E
  H -- Yes --> I[Build features → predict → SHAP]
  I --> J[Save to SQLite history]
  J --> K[Show result, percentile, explanation]
  K --> L{Another prediction?}
  L -- Yes --> D
  L -- No --> Z
```

## 5. Sequence diagram

```mermaid
sequenceDiagram
  actor U as User
  participant FE as React UI
  participant API as FastAPI
  participant REG as Model registry
  participant DB as SQLite
  U->>FE: fill form, click Submit
  FE->>FE: client-side validation
  FE->>API: POST /api/predict/csgo {inputs}
  API->>API: Pydantic + cross-field validation
  API->>REG: build_features → model.predict
  REG-->>API: prediction + SHAP values
  API->>DB: INSERT prediction
  API-->>FE: 200 JSON (prediction, interpretation, explanation, id)
  FE-->>U: Results page with chart
```

## 6. ER diagram (database)

Authentication is not implemented and no personal data is stored, so the database has one table.

```mermaid
erDiagram
  PREDICTIONS {
    int id PK
    string game "csgo | pubg | valorant | dota2"
    string target_name
    string model_name
    json inputs "submitted gameplay statistics"
    float prediction
    json result "interpretation + explanation"
    datetime created_at
  }
```

A future `USERS` table would relate one-to-many to `PREDICTIONS` (`user_id` FK). Switching to MySQL only
requires changing `DATABASE_URL`.

## 7. Backend module layout

| Module | Responsibility |
|---|---|
| `app/main.py` | App factory, CORS, lifespan (init DB + load models), global error handlers |
| `app/core/config.py` | Settings from environment / `.env`; makes `ml/` importable |
| `app/services/registry.py` | Loads artifacts for each game; marks a game unavailable with a reason if files are missing |
| `app/services/predictor.py` | Dynamic Pydantic validation, feature building, prediction, SHAP, interpretation, warnings |
| `app/models/database.py` | SQLAlchemy model and repository functions |
| `app/schemas/api.py` | Request/response models |
| `app/api/routes.py` | HTTP endpoints |
