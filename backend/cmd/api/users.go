package main

import (
	"database/sql"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"rest-api-in-gin/internal/database"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// demoEmails lists accounts that are kept intact for public demos.
// Changes to their email or password are rejected so recruiters always
// have working credentials.
var demoEmails = map[string]bool{
	"johndoe@example.com": true,
	"user@example.com":    true,
}

// updateCurrentUserInput captures the optional fields the user can change.
// Every field is a pointer so we can distinguish between "missing" and
// "present but empty" which keeps PATCH semantics predictable.
// CurrentPassword is required when Password is provided.
type updateCurrentUserInput struct {
	Name            *string `json:"name" binding:"omitempty,min=2,max=100"`
	Email           *string `json:"email" binding:"omitempty,email"`
	CurrentPassword *string `json:"current_password" binding:"omitempty"`
	Password        *string `json:"password" binding:"omitempty,min=8"`
	ProfilePicture  *string `json:"profile_picture" binding:"omitempty,url"`
}

// getUserByID handles GET /users/:id requests to retrieve a specific user by ID.
// Returns user information excluding the password field for security.
//
// @Summary Get user by ID
// @Description Retrieve a specific user's information by their ID
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 200 {object} database.User "User information"
// @Failure 400 {object} gin.H "Invalid user ID"
// @Failure 404 {object} gin.H "User not found"
// @Router /api/v1/users/{id} [get]
func (app *application) getUserByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	user, err := app.models.Users.GetUserByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (app *application) getCurrentUser(c *gin.Context) {
	user := app.getUserFromContext(c)
	if user == nil || user.Id == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// updateCurrentUser lets an authenticated user change profile attributes
// without exposing a public user-update surface. We only touch the fields the
// client sent to avoid unintentionally overwriting other data.
func (app *application) updateCurrentUser(c *gin.Context) {
	user := app.getUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var input updateCurrentUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Demo accounts are read-only for email and password so that public
	// credentials always remain valid for recruiters testing the app.
	if demoEmails[user.Email] {
		if input.Email != nil || input.Password != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "demo accounts cannot change email or password"})
			return
		}
	}

	params := database.UpdateUserParams{}
	if input.Name != nil {
		params.Name = input.Name
	}
	if input.Email != nil {
		params.Email = input.Email
	}
	if input.Password != nil {
		// Require the current password before accepting a new one to prevent
		// silent account takeover via a stolen or long-lived JWT.
		if input.CurrentPassword == nil || strings.TrimSpace(*input.CurrentPassword) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "current password is required to set a new password"})
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(*input.CurrentPassword)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "current password is incorrect"})
			return
		}
		hashed, err := bcrypt.GenerateFromPassword([]byte(strings.TrimSpace(*input.Password)), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
			return
		}
		params.PasswordHash = hashed
	}

	if input.ProfilePicture != nil {
		params.ProfilePicture = input.ProfilePicture
	}

	updatedUser, err := app.models.Users.Update(c.Request.Context(), user.Id, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	c.JSON(http.StatusOK, updatedUser)
}

// uploadProfilePicture accepts multipart file uploads, enforces basic limits,
// stores the file on disk, and returns a fully-qualified URL the frontend can
// persist via updateCurrentUser.
func (app *application) uploadProfilePicture(c *gin.Context) {
	user := app.getUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	const maxSize = 5 << 20 // 5 MB
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxSize)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read file"})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported file type"})
		return
	}

	if err := os.MkdirAll(app.uploadDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create upload directory"})
		return
	}

	filename := fmt.Sprintf("avatar_%d_%d%s", user.Id, time.Now().UnixNano(), ext)
	path := filepath.Join(app.uploadDir, filename)

	out, err := os.Create(path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create file"})
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	baseURL := fmt.Sprintf("%s://%s", scheme, c.Request.Host)
	url := fmt.Sprintf("%s/uploads/%s", baseURL, filename)

	// We only return the canonical URL here. The client will call PUT /auth/me
	// with this URL once the user confirms the change, so we avoid touching the
	// database twice and side-step schema drift if profile_picture is optional.
	c.JSON(http.StatusCreated, gin.H{"url": url})

}

func (app *application) deleteCurrentUser(c *gin.Context) {
	user := app.getUserFromContext(c)
	if user == nil || user.Id == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if err := app.models.Users.Delete(c.Request.Context(), user.Id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.Status(http.StatusNoContent)
}
