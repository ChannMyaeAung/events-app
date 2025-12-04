package main

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func (app *application) routes() http.Handler {
	g := gin.Default()

	g.Static("/uploads", app.uploadDir) // serve uploaded avatars

	g.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173", "http://localhost:3001", "https://events-app-omega-two.vercel.app/", "https://events-app-git-main-channmyaeaungs-projects.vercel.app/", "https://events-ldwp02dpu-channmyaeaungs-projects.vercel.app/"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	g.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Welcome to the Event Management API", "docs": "/swagger/index.html"})
	})
	// Health + auth (public)
	v1 := g.Group("/api/v1")
	{
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})
		v1.POST("/auth/register", app.registerUser)
		v1.POST("/auth/login", app.login)
	}

	// Protected group (requires JWT). Use an empty path segment so
	// downstream handlers generate clean /api/v1/... routes instead of //.
	auth := v1.Group("")
	auth.Use(app.AuthMiddleware())
	{
		// User management
		auth.GET("/auth/me", app.getCurrentUser)
		auth.PUT("/auth/me", app.updateCurrentUser)
		auth.DELETE("/auth/me", app.deleteCurrentUser)
		auth.GET("/users/:id", app.getUserByID)
		auth.POST("/auth/me/avatar", app.uploadProfilePicture)

		// Event queries
		auth.GET("/events", app.getAllEvents)
		auth.GET("/events/:id", app.getEventByID)

		// Attendee management
		auth.GET("/events/:id/attendees", app.getAttendeesForEvent)
		auth.GET("/events/:id/attendees/:userId", app.getEventsByAttendee)
		auth.POST("/events/:id/attendees/:userId", app.addAttendeeToEvent)
		auth.DELETE("/events/:id/attendees/:userId", app.deleteAttendeeFromEvent)

		// Event mutations
		auth.POST("/events", app.createEvent)
		auth.PUT("/events/:id", app.updateEvent)
		auth.DELETE("/events/:id", app.deleteEvent)
	}

	// Swagger documentation
	g.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	return g
}
