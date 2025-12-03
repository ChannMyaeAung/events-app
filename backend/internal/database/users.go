package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

type UserModel struct {
	DB *sql.DB
}

type User struct {
	Id    int    `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`

	// tells JSON library to always ignore this field when converting the struct back into JSON
	// to prevent from accidentally sending a user's password hash back to the client.
	Password       string    `json:"-"`
	ProfilePicture *string   `json:"profile_picture,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type UpdateUserParams struct {
	Name           *string
	Email          *string
	PasswordHash   []byte
	ProfilePicture *string
}

var defaultTimeout = 3 * time.Second

func (m *UserModel) Insert(user *User) error {
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()

	query := "INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id"

	return m.DB.QueryRowContext(ctx, query, user.Email, user.Password, user.Name).Scan(&user.Id)
}

func (m *UserModel) getUser(query string, args ...interface{}) (*User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()

	var user User
	var profile sql.NullString
	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&user.Id, &user.Email, &user.Name, &user.Password, &profile)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if profile.Valid {
		user.ProfilePicture = &profile.String
	} else {
		user.ProfilePicture = nil
	}
	return &user, nil
}

func (m *UserModel) GetUserByID(id int) (*User, error) {
	query := "SELECT id, email, name, password, profile_picture FROM users WHERE id = $1"
	return m.getUser(query, id)
}

func (m *UserModel) GetByEmail(email string) (*User, error) {
	query := "SELECT id, email, name, password, profile_picture FROM users WHERE email = $1"
	return m.getUser(query, email)
}

func (m *UserModel) Update(ctx context.Context, id int, params UpdateUserParams) (*User, error) {
	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	setClauses := []string{}
	args := make([]any, 0, 4)
	appendClause := func(column string, value any) {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", column, len(args)+1))
		args = append(args, value)
	}

	if params.Name != nil {
		appendClause("name", strings.TrimSpace(*params.Name))
	}
	if params.Email != nil {
		appendClause("email", strings.TrimSpace(*params.Email))
	}
	if len(params.PasswordHash) > 0 {
		appendClause("password", params.PasswordHash)
	}

	if params.ProfilePicture != nil {
		if strings.TrimSpace(*params.ProfilePicture) == "" {
			appendClause("profile_picture", nil)
		} else {
			appendClause("profile_picture", strings.TrimSpace(*params.ProfilePicture))
		}
	}

	if len(setClauses) == 0 {
		return m.GetUserByID(id)
	}

	query := fmt.Sprintf("UPDATE users SET %s WHERE id = $%d", strings.Join(setClauses, ", "), len(args)+1)
	args = append(args, id)
	if _, err := m.DB.ExecContext(ctx, query, args...); err != nil {
		return nil, err
	}

	return m.GetUserByID(id)
}

func (m *UserModel) Delete(ctx context.Context, id int) error {
	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM attendees WHERE event_id IN (SELECT id FROM events WHERE owner_id = $1)`, id); err != nil {
		tx.Rollback()
		return err
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM events WHERE owner_id = $1`, id); err != nil {
		tx.Rollback()
		return err
	}

	result, err := tx.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		tx.Rollback()
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		tx.Rollback()
		return err
	}

	if rowsAffected == 0 {
		tx.Rollback()
		return errors.New("not found")
	}
	return tx.Commit()
}
