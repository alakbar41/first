
# ADA University Voting System - Entity Relationship Diagram

```mermaid
erDiagram
    users {
        serial id PK
        text email
        text password
        text faculty
        boolean isAdmin
    }
    
    pending_users {
        text email PK
        text password
        text faculty
        text otp
        timestamp created_at
        boolean isAdmin
        text type
    }
    
    elections {
        serial id PK
        text name
        text position
        text description
        timestamp start_date
        timestamp end_date
        text[] eligible_faculties
        text status
        integer created_by FK
        timestamp created_at
        text blockchain_id
    }
    
    candidates {
        serial id PK
        text full_name
        text student_id
        text faculty
        text position
        text status
        text picture_url
        timestamp created_at
        timestamp updated_at
        text blockchain_hash
    }
    
    election_candidates {
        serial id PK
        integer election_id FK
        integer candidate_id FK
        integer running_mate_id FK
        timestamp created_at
    }
    
    voting_tokens {
        serial id PK
        integer user_id FK
        integer election_id FK
        text token
        boolean used
        timestamp expires_at
        timestamp created_at
    }
    
    tickets {
        serial id PK
        integer user_id FK
        text title
        text description
        text type
        text status
        timestamp created_at
        timestamp updated_at
    }
    
    blockchain_transactions {
        serial id PK
        integer election_id FK
        text tx_hash
        text tx_type
        integer user_id FK
        boolean success
        text error_message
        timestamp created_at
    }
    
    vote_participation {
        serial id PK
        integer user_id FK
        integer election_id FK
        timestamp created_at
    }
    
    users ||--o{ elections : "creates"
    users ||--o{ voting_tokens : "receives"
    users ||--o{ tickets : "submits"
    users ||--o{ blockchain_transactions : "initiates"
    users ||--o{ vote_participation : "participates"
    
    elections ||--o{ election_candidates : "contains"
    elections ||--o{ voting_tokens : "generates"
    elections ||--o{ blockchain_transactions : "records"
    elections ||--o{ vote_participation : "tracks"
    
    candidates ||--o{ election_candidates : "participates"
    candidates ||--o{ election_candidates : "running_mate"
```

This ERD shows the following relationships:

1. Users can create multiple elections (admin users)
2. Users receive voting tokens for elections
3. Users can submit multiple tickets
4. Users can initiate multiple blockchain transactions
5. Users can participate in multiple elections
6. Elections contain multiple candidates through election_candidates
7. Elections generate multiple voting tokens
8. Elections record multiple blockchain transactions
9. Elections track multiple vote participations
10. Candidates can participate in multiple elections
11. Candidates can be running mates in multiple elections

Key Features:
- Full audit trail through blockchain_transactions
- Secure voting token system
- Support for president/VP paired candidacies
- Comprehensive user feedback system through tickets
- Faculty-based access control
- Multi-stage election lifecycle management
