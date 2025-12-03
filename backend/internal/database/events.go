package database

import (
	"context"
	"database/sql"
	"time"
)

type EventModel struct {
	DB *sql.DB
}

// Event represents an event record in the database.
type Event struct {
	Id          int       `json:"id"`
	OwnerId     int       `json:"ownerId"`
	Name        string    `json:"name" binding:"required,min=3"`
	Description string    `json:"description" binding:"required,min=10"`
	Date        time.Time `json:"date" binding:"required"`
	Location    string    `json:"location" binding:"required,min=3"`
}

// Insert creates a new event record in the database.
func (m *EventModel) Insert(event *Event) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := "INSERT INTO events (owner_id, name, description, date, location) VALUES ($1, $2, $3, $4, $5) RETURNING id"

	return m.DB.QueryRowContext(ctx, query, event.OwnerId, event.Name, event.Description, event.Date, event.Location).Scan(&event.Id)
}

// GetAll retrieves all events from the database with better error handling
func (m *EventModel) GetAll() ([]*Event, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, "SELECT id, owner_id, name, description, date, location FROM events")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*Event
	for rows.Next() {
		var event Event
		if err := rows.Scan(&event.Id, &event.OwnerId, &event.Name, &event.Description, &event.Date, &event.Location); err != nil {
			return nil, err
		}
		events = append(events, &event)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return events, nil
}

// GetAllByOwner retrieves events filtered by owner ID.
func (m *EventModel) GetAllByOwner(ownerId int) ([]*Event, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, "SELECT id, owner_id, name, description, date, location FROM events WHERE owner_id = $1", ownerId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*Event
	for rows.Next() {
		var event Event
		if err := rows.Scan(&event.Id, &event.OwnerId, &event.Name, &event.Description, &event.Date, &event.Location); err != nil {
			return nil, err
		}
		events = append(events, &event)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return events, nil
}

// Get retrieves a single event by its ID with better date handling
func (m *EventModel) Get(id int) (*Event, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var event Event
	err := m.DB.QueryRowContext(ctx, "SELECT id, owner_id, name, description, date, location FROM events WHERE id = $1", id).
		Scan(&event.Id, &event.OwnerId, &event.Name, &event.Description, &event.Date, &event.Location)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &event, nil
}

func (m *EventModel) Update(event *Event) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := "UPDATE events SET owner_id = $1, name = $2, description = $3, date = $4, location = $5 WHERE id = $6"

	_, err := m.DB.ExecContext(ctx, query, event.OwnerId, event.Name, event.Description, event.Date, event.Location, event.Id)
	if err != nil {
		return err
	}

	return nil
}

func (m *EventModel) Delete(id int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := "DELETE FROM events WHERE id = $1"

	_, err := m.DB.ExecContext(ctx, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}
	return nil
}
