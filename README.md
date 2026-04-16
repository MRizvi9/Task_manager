# Task_manager
This is my University Web development project 
# Task Manager

A simple task manager web application built with:

- HTML, CSS, and JavaScript for the frontend
- Python Flask for the backend
- SQLite for task storage

This project was created as a university web development project.

## Features

- Add new tasks
- Edit existing tasks
- Mark tasks as completed or active
- Delete tasks
- Filter tasks by `All`, `Active`, and `Completed`
- Clear all completed tasks
- Store tasks in a SQLite database
- Open the app from your computer or your phone on the same Wi-Fi network

## Project Structure

```text
Task_manager/
|-- backend/
|   |-- app.py
|   |-- requirements.txt
|-- app.js
|-- index.html
|-- styles.css
|-- README.md
```

## Requirements

- Python 3 installed
- `pip` available in your terminal

## Installation

Install the backend dependency:

```bash
python -m pip install -r backend/requirements.txt
```

## Run The App

Start the Flask server:

```bash
python backend/app.py
```

Then open the app in your browser:

`http://localhost:8080/`

## Use On Your Phone

You can also open the app on your phone.

1. Make sure your phone and computer are connected to the same Wi-Fi network.
2. Start the server on your computer:
   - `python backend/app.py`
3. Open this address on your phone:
   - `http://192.168.178.26:8080/`

If it does not open, allow Python through the Windows Firewall when prompted.

## API Endpoints

The backend exposes these routes:

- `GET /api/tasks` - get all tasks
- `POST /api/tasks` - create a new task
- `PUT /api/tasks/<id>` - update task text
- `PATCH /api/tasks/<id>` - update task completion status
- `DELETE /api/tasks/<id>` - delete one task
- `DELETE /api/tasks/completed` - remove all completed tasks

## Notes

- The frontend is served by the Flask backend.
- Task data is stored in `backend/tasks.db`.
- The database file is ignored by Git through `.gitignore`.
