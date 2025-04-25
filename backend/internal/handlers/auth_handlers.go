package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shadowjumper3000/garden_planner/backend/config"
	"github.com/shadowjumper3000/garden_planner/backend/internal/middleware"
	"github.com/shadowjumper3000/garden_planner/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AuthHandler handles authentication-related routes
type AuthHandler struct {
	DB     *gorm.DB
	Config *config.Config
}

// RegisterRequest holds data for user registration
type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginRequest holds data for user login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse holds the response for authentication operations
type AuthResponse struct {
	User  models.User `json:"user"`
	Token string      `json:"token"`
}

// Register handles user registration
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if email is already registered
	var existingUser models.User
	if result := h.DB.Where("email = ?", req.Email).First(&existingUser); result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		return
	} else if result.Error != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not hash password"})
		return
	}

	// Create new user
	user := models.User{
		ID:       uuid.New(),
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
	}

	// Save user to database
	if err := h.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create user"})
		return
	}

	// Generate JWT token
	token, err := middleware.GenerateJWT(user.ID, user.Email, &h.Config.JWT)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
		return
	}

	// Prepare response (don't include password)
	resp := AuthResponse{
		User:  user,
		Token: token,
	}

	c.JSON(http.StatusCreated, resp)
}

// Login handles user login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user by email
	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Load user's gardens for the response
	var gardens []models.Garden
	if err := h.DB.Where("user_id = ?", user.ID).Find(&gardens).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not load user gardens"})
		return
	}

	// Populate garden IDs for the response
	user.GardenIDs = make([]string, len(gardens))
	for i, garden := range gardens {
		user.GardenIDs[i] = garden.ID.String()
	}

	// Generate JWT token
	token, err := middleware.GenerateJWT(user.ID, user.Email, &h.Config.JWT)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
		return
	}

	// Prepare response
	resp := AuthResponse{
		User:  user,
		Token: token,
	}

	c.JSON(http.StatusOK, resp)
}

// GetCurrentUser returns the currently authenticated user
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Find user by ID
	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not find user"})
		return
	}

	// Load user's gardens for the response
	var gardens []models.Garden
	if err := h.DB.Where("user_id = ?", user.ID).Find(&gardens).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not load user gardens"})
		return
	}

	// Populate garden IDs for the response
	user.GardenIDs = make([]string, len(gardens))
	for i, garden := range gardens {
		user.GardenIDs[i] = garden.ID.String()
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}