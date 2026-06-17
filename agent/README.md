# Clinic Management Agent

## Overview
Clinic Management Agent is a specialized AI agent designed to handle the day-to-day operations of a clinic. It serves as an intelligent assistant for patients, doctors, and staff, managing appointments, patient queries, and administrative tasks.

## Features

- **Appointment Management**: Patients can book, reschedule, and cancel appointments through the chat interface.
- **Doctor Search**: The agent can recommend appropriate specialists based on patient symptoms.
- **Patient Triage**: Provides preliminary assessment and pre-visit guidance.
- **Role-based Interaction**: Supports distinct workflows for patients, doctors, and staff.

## Technology Stack

- **Backend Framework**: FastAPI
- **LLM**: Groq API 

## Components and Modules

- **Orchestrator**: The brain of the agent. The job of the orchestrator is to figure out what the user wants to do (understanding user intent) and maintain the conversation memory. Based on the user intent, it will call appropriate subagents.
    -  `session.py`: Contains the class to manage session's memory. It uses an in-memory store with a unique `session_id` and stores conversation history in messages array and agent_state like which doctor selected so far.
    -  `router.py`: When a new message arrives, the classify_intent function constructs a prompt using the user's role (patient/doctor/staff) and their message. It asks the LLM to output a strict JSON classification into exactly one category:
        - booking_symptom ("My chest hurts")
        - booking_name ("Book with Dr. Smith")
        - cancel / reschedule
        - search
        - advisory
    -  **server.py**: When the frontend sends a chat message to POST /api/agent/chat
        - It gets the session from session_store.
        - It calls classify_intent from router.py to classify the user's intent.
        - Based on the intent, it calls the appropriate subagent.
        - The subagent processes the request and updates the session.
        - The orchestrator returns the response to the frontend.

### SubAgents



