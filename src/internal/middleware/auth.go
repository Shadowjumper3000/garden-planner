package middleware

import (
	"context"
	"database/sql"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	UserIDKey   contextKey = "userID"
	UserRoleKey contextKey = "userRole"
)

// JWT validates the Bearer token and injects userID + role into context.
func JWT(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, `{"error":"invalid claims"}`, http.StatusUnauthorized)
				return
			}

			userID, _ := claims["sub"].(float64)
			role, _ := claims["role"].(string)

			ctx := context.WithValue(r.Context(), UserIDKey, int(userID))
			ctx = context.WithValue(ctx, UserRoleKey, role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAdmin rejects non-admin users.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, _ := r.Context().Value(UserRoleKey).(string)
		if role != "admin" {
			http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// GetUserID extracts the authenticated user ID from context.
func GetUserID(r *http.Request) (int, bool) {
	id, ok := r.Context().Value(UserIDKey).(int)
	return id, ok
}

// Unused DB parameter kept for future per-request DB lookups.
var _ = sql.ErrNoRows
