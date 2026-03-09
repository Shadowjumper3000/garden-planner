package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type registerRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	Token string         `json:"token"`
	User  map[string]any `json:"user"`
}

// Register creates a new user account.
func Register(db *sql.DB, jwtSecret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req registerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Name == "" || req.Email == "" || req.Password == "" {
			respondError(w, http.StatusBadRequest, "name, email and password are required")
			return
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "could not hash password")
			return
		}

		var userID int
		err = db.QueryRow(
			`INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'user') RETURNING id`,
			req.Name, req.Email, string(hash),
		).Scan(&userID)
		if err != nil {
			respondError(w, http.StatusConflict, "email already registered")
			return
		}

		token, err := generateToken(userID, req.Name, "user", jwtSecret)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "could not generate token")
			return
		}

		respondJSON(w, http.StatusCreated, authResponse{
			Token: token,
			User:  map[string]any{"id": userID, "name": req.Name, "email": req.Email, "role": "user", "gardens": []string{}},
		})
	}
}

// Login authenticates a user and returns a JWT.
func Login(db *sql.DB, jwtSecret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		var id int
		var name, email, passwordHash, role string
		err := db.QueryRow(
			`SELECT id, name, email, password_hash, role FROM users WHERE email=$1`,
			req.Email,
		).Scan(&id, &name, &email, &passwordHash, &role)
		if err == sql.ErrNoRows {
			respondError(w, http.StatusUnauthorized, "invalid credentials")
			return
		} else if err != nil {
			respondError(w, http.StatusInternalServerError, "database error")
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
			respondError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}

		token, err := generateToken(id, name, role, jwtSecret)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "could not generate token")
			return
		}

		respondJSON(w, http.StatusOK, authResponse{
			Token: token,
			User:  map[string]any{"id": id, "name": name, "email": email, "role": role, "gardens": []string{}},
		})
	}
}

func generateToken(userID int, name, role, secret string) (string, error) {
	expHours := 24
	if v := os.Getenv("JWT_EXPIRATION_HOURS"); v != "" {
		fmt.Sscan(v, &expHours)
	}

	claims := jwt.MapClaims{
		"sub":  float64(userID),
		"name": name,
		"role": role,
		"exp":  time.Now().Add(time.Duration(expHours) * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// respondJSON writes a JSON response.
func respondJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

// respondError writes an error JSON response.
func respondError(w http.ResponseWriter, code int, msg string) {
	respondJSON(w, code, map[string]string{"error": msg})
}
