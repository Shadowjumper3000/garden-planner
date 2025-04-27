package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shadowjumper3000/garden_planner/backend/internal/models"
	"github.com/shadowjumper3000/garden_planner/backend/internal/services/metrics"
)

// MetricsHandler handles metrics-related routes
type MetricsHandler struct {
	MetricsService *metrics.MetricsService
}

// GetSystemStats returns high-level system statistics for admins
func (h *MetricsHandler) GetSystemStats(c *gin.Context) {
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
func (h *MetricsHandler) GetDailyMetrics(c *gin.Context) {
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
func (h *MetricsHandler) GetUserActivities(c *gin.Context) {
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
	query := h.MetricsService.DB().Model(&models.UserActivity{}).Order("timestamp DESC")
	
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
	if err := query.Limit(pageSize).Offset(offset).Preload("User", "SELECT id, name, email FROM users").Find(&activities).Error; err != nil {
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
func (h *MetricsHandler) TriggerDailyMetricsGeneration(c *gin.Context) {
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