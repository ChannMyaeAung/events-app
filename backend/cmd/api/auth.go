package main

import (
	"net/http"
	"rest-api-in-gin/internal/database"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"golang.org/x/crypto/bcrypt"
)

// registerRequest defines the expected JSON structure for user registration requests.
// All fields are required and validated using Gin's binding tags.
type registerRequest struct {
	Email    string `json:"email" binding:"required,email"`    // Must be valid email format
	Password string `json:"password" binding:"required,min=8"` // Minimum 8 characters for security
	Name     string `json:"name" binding:"required,min=2"`     // Minimum 2 characters for user display name
}

// loginRequest defines the expected JSON structure for user authentication requests.
// Contains credentials needed for user login validation.
type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`    // User's registered email address
	Password string `json:"password" binding:"required,min=8"` // User's plaintext password for verification
}

// loginResponse defines the JSON structure returned upon successful authentication.
// Contains the JWT token that clients should include in subsequent authenticated requests.
type loginResponse struct {
	Token string `json:"token"`
}

// login handles POST /auth/login requests for user authentication.
// It validates user credentials against the database and returns a JWT token upon success.
// The returned token should be included in the Authorization header for protected endpoints.
//
// @Summary User login
// @Description Authenticate user with email and password, returns JWT token
// @Tags Authentication
// @Accept json
// @Produce json
// @Param credentials body loginRequest true "Login credentials"
// @Success 200 {object} loginResponse "Login successful with JWT token"
// @Failure 400 {object} gin.H "Invalid request body"
// @Failure 401 {object} gin.H "Invalid credentials"
// @Failure 500 {object} gin.H "Internal server error"
// @Router /api/v1/auth/login [post]
func (app *application) login(c *gin.Context) {
	var auth loginRequest
	if err := c.ShouldBindJSON(&auth); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existingUser, err := app.models.Users.GetByEmail(auth.Email)
	if existingUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
		return
	}

	// Compare provided password with stored bcrypt hash
	// bcrypt.CompareHashAndPassword is constant-time to prevent timing attacks
	err = bcrypt.CompareHashAndPassword([]byte(existingUser.Password), []byte(auth.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Create JWT token with user ID and expiration claims
	// Token expires in 72 hours for reasonable session duration
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": existingUser.Id,
		"exp":    time.Now().Add(time.Hour * 72).Unix(),
	})

	// Sign the token with the application's secret key
	tokenString, err := token.SignedString([]byte(app.jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Return the signed JWT token for client-side storage and future requests
	c.JSON(http.StatusOK, loginResponse{Token: tokenString})
}

// registerUser handles POST /auth/register requests for new user account creation.
// It validates input data, hashes the password securely, and creates a new user record.
// Passwords are hashed using bcrypt before storage for security.
//
// @Summary User registration
// @Description Register a new user account with email, password, and name
// @Tags Authentication
// @Accept json
// @Produce json
// @Param user body registerRequest true "User registration data"
// @Success 201 {object} gin.H "User registered successfully"
// @Failure 400 {object} gin.H "Invalid request body or validation errors"
// @Failure 500 {object} gin.H "Internal server error"
// @Router /api/v1/auth/register [post]
func (app *application) registerUser(c *gin.Context) {
	var register registerRequest
	if err := c.ShouldBindJSON(&register); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash the plaintext password using bcrypt with default cost factor (10)
	// bcrypt is adaptive and includes salt generation automatically
	hashPassword, err := bcrypt.GenerateFromPassword([]byte(register.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := database.User{
		Email:    register.Email,
		Password: string(hashPassword),
		Name:     register.Name,
	}

	if err := app.models.Users.Insert(&user); err != nil {
		// Detect unique constraint / duplicate email errors and return a friendly message
		low := strings.ToLower(err.Error())
		if strings.Contains(low, "duplicate") || strings.Contains(low, "unique") || strings.Contains(low, "already exists") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User with that email already exists"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user"})
		return
	}

	// Generate JWT token for newly registered user using the persisted ID
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": user.Id,
		"exp":    time.Now().Add(time.Hour * 72).Unix(),
	})

	tokenString, err := token.SignedString([]byte(app.jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully", "user": user, "token": tokenString})
}
