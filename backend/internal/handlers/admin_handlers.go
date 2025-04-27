package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shadowjumper3000/garden_planner/backend/internal/models"
	"github.com/shadowjumper3000/garden_planner/backend/internal/services/metrics"
	"gorm.io/gorm"
)

// AdminHandler handles admin-related routes, including metrics
type AdminHandler struct {
	DB             *gorm.DB
	MetricsService *metrics.MetricsService
}

// GetMetrics returns system metrics and stats
func (h *AdminHandler) GetMetrics(c *gin.Context) {
	// Get user role from context (set by auth middleware)
	role, exists := c.Get("userRole")
	if !exists || role.(string) != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Get system stats
	stats, err := h.MetricsService.GetSystemStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch system stats"})
		return
	}

	// Get daily metrics from the last 30 days
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -30)
	
	metrics, err := h.MetricsService.GetDailyMetrics(startDate, endDate, []string{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch daily metrics"})
		return
	}

	// Return combined metrics data
	c.JSON(http.StatusOK, gin.H{
		"systemStats": stats,
		"dailyMetrics": metrics,
	})
}

// GetSystemStats returns high-level system statistics for admins
func (h *AdminHandler) GetSystemStats(c *gin.Context) {
	// Check if user is admin
	role, exists := c.Get("userRole")
	if !exists || role.(string) != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	stats, err := h.MetricsService.GetSystemStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch system stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetDailyMetrics returns daily metrics for a date range
func (h *AdminHandler) GetDailyMetrics(c *gin.Context) {
	// Check if user is admin
	role, exists := c.Get("userRole")
	if !exists || role.(string) != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Parse date range query parameters
	startDateStr := c.DefaultQuery("startDate", time.Now().AddDate(0, 0, -30).Format("2006-01-02"))
	endDateStr := c.DefaultQuery("endDate", time.Now().Format("2006-01-02"))

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format. Use YYYY-MM-DD"})
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format. Use YYYY-MM-DD"})
		return
	}

	// Parse metric types filter
	metricTypes := c.QueryArray("metricType")

	metrics, err := h.MetricsService.GetDailyMetrics(startDate, endDate, metricTypes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch daily metrics"})
		return
	}

	c.JSON(http.StatusOK, metrics)
}

// GetUserActivities returns recent user activities with pagination
func (h *AdminHandler) GetUserActivities(c *gin.Context) {
	// Check if user is admin
	role, exists := c.Get("userRole")
	if !exists || role.(string) != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	
	// Constrain page size for performance
	if pageSize > 100 {
		pageSize = 100
	}
	
	// Calculate offset
	offset := (page - 1) * pageSize
	
	// Get user activities with pagination
	var activities []models.UserActivity
	var count int64
	
	// Apply filters if provided
	query := h.DB.Model(&models.UserActivity{}).Order("timestamp DESC")
	
	// Filter by activity type if provided
	if activityType := c.Query("activityType"); activityType != "" {
		query = query.Where("activity_type = ?", activityType)
	}
	
	// Filter by user ID if provided
	if userIDStr := c.Query("userId"); userIDStr != "" {
		userID, err := uuid.Parse(userIDStr)
		if err == nil {
			query = query.Where("user_id = ?", userID)
		}
	}
	
	// Get total count for pagination
	query.Count(&count)
	
	// Get paginated results
	if err := query.Limit(pageSize).Offset(offset).Find(&activities).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user activities"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"total": count,
		"page": page,
		"pageSize": pageSize,
		"activities": activities,
	})
}

// TriggerDailyMetricsGeneration manually triggers the generation of daily metrics
func (h *AdminHandler) TriggerDailyMetricsGeneration(c *gin.Context) {
	// Check if user is admin
	role, exists := c.Get("userRole")
	if !exists || role.(string) != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}
	
	if err := h.MetricsService.GenerateDailyMetrics(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate daily metrics"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Daily metrics generated successfully"})
}

// GetUsers returns all users with pagination and filtering
func (h *AdminHandler) GetUsers(c *gin.Context) {
	// Check if user is admin
	role, exists := c.Get("userRole")
	if !exists || role.(string) != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	
	// Constrain page size for performance
	if pageSize > 100 {
		pageSize = 100
	}
	
	// Calculate offset
	offset := (page - 1) * pageSize
	
	// Get users with pagination
	var users []models.User
	var count int64
	
	// Apply filters if provided
	query := h.DB.Model(&models.User{})
	
	// Filter by search term if provided
	if search := c.Query("search"); search != "" {
		query = query.Where("name LIKE ? OR email LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	
	// Get total count for pagination
	query.Count(&count)
	
	// Get paginated results (excluding password)
	if err := query.Select("id, name, email, role, last_login, created_at").
		Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"total": count,
		"page": page,
		"pageSize": pageSize,
		"users": users,
	})
}

// SetUserRole allows the admin to change a user's role
func (h *AdminHandler) SetUserRole(c *gin.Context) {
	// Check if user is admin
	currentRole, exists := c.Get("userRole")
	if !exists || currentRole.(string) != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}
	
	// Parse user ID from URL
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	
	// Parse request body
	var req struct {
		Role string `json:"role" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Validate role
	if req.Role != "admin" && req.Role != "user" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role. Must be 'admin' or 'user'"})
		return
	}
	
	// Get current user ID from context
	currentUserIDStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User ID not found in context"})
		return
	}
	
	currentUserID, err := uuid.Parse(currentUserIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}
	
	// Prevent admin from changing their own role
	if currentUserID == userID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot change your own role"})
		return
	}
	
	// Update user role
	if err := h.DB.Model(&models.User{}).Where("id = ?", userID).Update("role", req.Role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "User role updated successfully"})
}