package metrics

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/shadowjumper3000/garden_planner/backend/internal/models"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// MetricsService handles the collection and processing of user metrics
type MetricsService struct {
	db         *gorm.DB
	mutex      sync.Mutex
	bufferedActivities []models.UserActivity
	flushInterval time.Duration
}

// NewMetricsService creates a new metrics service
func NewMetricsService(db *gorm.DB) *MetricsService {
	service := &MetricsService{
		db:           db,
		bufferedActivities: make([]models.UserActivity, 0, 100),
		flushInterval: 1 * time.Minute,
	}

	// Start periodic flush in background
	go service.startPeriodicFlush()

	// Initialize system stats if they don't exist
	service.initializeSystemStats()

	return service
}

// DB returns the database connection used by the metrics service
func (s *MetricsService) DB() *gorm.DB {
	return s.db
}

// initializeSystemStats creates the basic system stats if they don't exist yet
func (s *MetricsService) initializeSystemStats() {
	stats := []string{"TOTAL_USERS", "TOTAL_GARDENS", "TOTAL_PLANTS", "ACTIVE_USERS_LAST_30_DAYS"}

	for _, statName := range stats {
		var count int64
		var existingStat models.SystemStat
		
		// Check if the stat already exists
		if err := s.db.Where("name = ?", statName).First(&existingStat).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				// Calculate the initial value
				switch statName {
				case "TOTAL_USERS":
					s.db.Model(&models.User{}).Count(&count)
				case "TOTAL_GARDENS":
					s.db.Model(&models.Garden{}).Count(&count)
				case "TOTAL_PLANTS":
					s.db.Model(&models.Plant{}).Count(&count)
				case "ACTIVE_USERS_LAST_30_DAYS":
					thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
					s.db.Model(&models.User{}).Where("last_login > ?", thirtyDaysAgo).Count(&count)
				}

				// Create the stat
				s.db.Create(&models.SystemStat{
					ID:          uuid.New(),
					Name:        statName,
					Value:       int(count),
					LastUpdated: time.Now(),
				})
			}
		}
	}
}

// RecordActivity records a user activity
func (s *MetricsService) RecordActivity(userID uuid.UUID, activityType string, resourceID *uuid.UUID, resourceType string, details interface{}) {
	// Create JSON from details if provided
	var detailsJSON datatypes.JSON
	if details != nil {
		bytes, err := json.Marshal(details)
		if err == nil {
			detailsJSON = bytes
		}
	}

	// Create activity record
	activity := models.UserActivity{
		ID:           uuid.New(),
		UserID:       userID,
		ActivityType: activityType,
		ResourceID:   resourceID,
		ResourceType: resourceType,
		Timestamp:    time.Now(),
		Details:      detailsJSON,
	}

	// Buffer the activity to reduce database pressure
	s.bufferActivity(activity)

	// If it's a login activity, update the user's last login time
	if activityType == "LOGIN" {
		s.db.Model(&models.User{}).Where("id = ?", userID).Update("last_login", time.Now())
	}

	// Increment relevant system stats immediately for important activities
	switch activityType {
	case "REGISTER":
		s.incrementSystemStat("TOTAL_USERS")
	case "CREATE_GARDEN":
		s.incrementSystemStat("TOTAL_GARDENS")
	}
}

// bufferActivity adds an activity to the buffer
func (s *MetricsService) bufferActivity(activity models.UserActivity) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.bufferedActivities = append(s.bufferedActivities, activity)

	// If buffer gets too large, flush immediately
	if len(s.bufferedActivities) >= 100 {
		go s.flushActivities()
	}
}

// flushActivities writes all buffered activities to the database
func (s *MetricsService) flushActivities() {
	s.mutex.Lock()
	if len(s.bufferedActivities) == 0 {
		s.mutex.Unlock()
		return
	}

	// Copy the buffer and reset it
	activitiesToFlush := make([]models.UserActivity, len(s.bufferedActivities))
	copy(activitiesToFlush, s.bufferedActivities)
	s.bufferedActivities = s.bufferedActivities[:0]
	s.mutex.Unlock()

	// Write to database
	if len(activitiesToFlush) > 0 {
		s.db.CreateInBatches(activitiesToFlush, 50)
	}
}

// startPeriodicFlush periodically flushes the activity buffer to the database
func (s *MetricsService) startPeriodicFlush() {
	ticker := time.NewTicker(s.flushInterval)
	defer ticker.Stop()

	for {
		<-ticker.C
		s.flushActivities()
	}
}

// incrementSystemStat increments a system stat by 1
func (s *MetricsService) incrementSystemStat(name string) {
	s.db.Exec("UPDATE system_stats SET value = value + 1, last_updated = ? WHERE name = ?", time.Now(), name)
}

// GenerateDailyMetrics runs daily to aggregate metrics
// This should be called by a scheduled task or cron job
func (s *MetricsService) GenerateDailyMetrics() error {
	// Flush any pending activities first
	s.flushActivities()
	
	// Get the yesterday's date
	yesterday := time.Now().AddDate(0, 0, -1).Truncate(24 * time.Hour)
	
	// Count active users for yesterday
	var activeUsers int64
	yesterdayStart := yesterday
	yesterdayEnd := yesterday.Add(24 * time.Hour)
	
	err := s.db.Model(&models.UserActivity{}).
		Select("COUNT(DISTINCT user_id)").
		Where("timestamp BETWEEN ? AND ?", yesterdayStart, yesterdayEnd).
		Count(&activeUsers).Error
	if err != nil {
		return fmt.Errorf("failed to count active users: %w", err)
	}

	// Save daily active users metric
	err = s.db.Create(&models.MetricDailySummary{
		ID:         uuid.New(),
		Date:       yesterday,
		MetricType: "ACTIVE_USERS",
		Count:      int(activeUsers),
	}).Error
	if err != nil {
		return fmt.Errorf("failed to save active users metric: %w", err)
	}

	// Count new gardens created yesterday
	var newGardens int64
	err = s.db.Model(&models.Garden{}).
		Where("created_at BETWEEN ? AND ?", yesterdayStart, yesterdayEnd).
		Count(&newGardens).Error
	if err != nil {
		return fmt.Errorf("failed to count new gardens: %w", err)
	}

	// Save new gardens metric
	err = s.db.Create(&models.MetricDailySummary{
		ID:         uuid.New(),
		Date:       yesterday,
		MetricType: "NEW_GARDENS",
		Count:      int(newGardens),
	}).Error
	if err != nil {
		return fmt.Errorf("failed to save new gardens metric: %w", err)
	}

	// Count new users registered yesterday
	var newUsers int64
	err = s.db.Model(&models.User{}).
		Where("created_at BETWEEN ? AND ?", yesterdayStart, yesterdayEnd).
		Count(&newUsers).Error
	if err != nil {
		return fmt.Errorf("failed to count new users: %w", err)
	}

	// Save new users metric
	err = s.db.Create(&models.MetricDailySummary{
		ID:         uuid.New(),
		Date:       yesterday,
		MetricType: "NEW_USERS",
		Count:      int(newUsers),
	}).Error
	if err != nil {
		return fmt.Errorf("failed to save new users metric: %w", err)
	}

	// Update active users in last 30 days
	var activeUsersLast30Days int64
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	err = s.db.Model(&models.User{}).
		Where("last_login > ?", thirtyDaysAgo).
		Count(&activeUsersLast30Days).Error
	if err != nil {
		return fmt.Errorf("failed to count active users in last 30 days: %w", err)
	}

	// Update system stat
	err = s.db.Model(&models.SystemStat{}).
		Where("name = ?", "ACTIVE_USERS_LAST_30_DAYS").
		Updates(map[string]interface{}{
			"value":        int(activeUsersLast30Days),
			"last_updated": time.Now(),
		}).Error
	if err != nil {
		return fmt.Errorf("failed to update active users system stat: %w", err)
	}

	return nil
}

// GetDailyMetrics retrieves daily metrics for a specific date range
func (s *MetricsService) GetDailyMetrics(startDate, endDate time.Time, metricTypes []string) ([]models.MetricDailySummary, error) {
	var metrics []models.MetricDailySummary
	
	query := s.db.Model(&models.MetricDailySummary{}).
		Where("date BETWEEN ? AND ?", startDate, endDate)
		
	if len(metricTypes) > 0 {
		query = query.Where("metric_type IN ?", metricTypes)
	}
	
	err := query.Order("date, metric_type").Find(&metrics).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get daily metrics: %w", err)
	}
	
	return metrics, nil
}

// GetSystemStats retrieves all system stats
func (s *MetricsService) GetSystemStats() ([]models.SystemStat, error) {
	var stats []models.SystemStat
	
	err := s.db.Model(&models.SystemStat{}).Find(&stats).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get system stats: %w", err)
	}
	
	return stats, nil
}