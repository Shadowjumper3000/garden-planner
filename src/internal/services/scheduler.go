package services

import (
	"log"

	"github.com/robfig/cron/v3"
)

// Scheduler wraps a cron runner for garden notification jobs.
type Scheduler struct {
	cron  *cron.Cron
	notif *NotificationService
}

// NewScheduler creates a new Scheduler.
func NewScheduler(notif *NotificationService) *Scheduler {
	return &Scheduler{
		cron:  cron.New(),
		notif: notif,
	}
}

// Start begins all scheduled jobs.
func (s *Scheduler) Start() {
	// Every hour: mark due notifications as sent
	s.cron.AddFunc("0 * * * *", func() {
		log.Println("Scheduler: marking due notifications...")
		s.notif.MarkDueNotificationsSent()
	})

	// Every morning at 7am: generate watering reminders
	s.cron.AddFunc("0 7 * * *", func() {
		log.Println("Scheduler: generating watering reminders...")
		s.notif.GenerateWateringReminders()
	})

	// Every morning at 7:05am: generate harvest reminders
	s.cron.AddFunc("5 7 * * *", func() {
		log.Println("Scheduler: generating harvest reminders...")
		s.notif.GenerateHarvestReminders()
	})

	s.cron.Start()
	log.Println("Scheduler started")
}

// Stop shuts down the scheduler.
func (s *Scheduler) Stop() {
	s.cron.Stop()
	log.Println("Scheduler stopped")
}
