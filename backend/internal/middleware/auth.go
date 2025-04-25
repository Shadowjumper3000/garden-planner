package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/shadowjumper3000/garden_planner/backend/config"
)

// JWTClaims defines the claims in our JWT tokens
type JWTClaims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// AuthMiddleware creates a middleware for JWT authentication
func AuthMiddleware(config *config.JWTConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Check the format of the token
		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
			c.Abort()
			return
		}

		// Extract the token from the header
		tokenString := parts[1]

		// Parse and validate the token
		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			// Validate the signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			// Return the secret key used for signing
			return []byte(config.Secret), nil
		})

		// Check for token parsing errors
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("Invalid token: %v", err)})
			c.Abort()
			return
		}

		// Check if the token is valid
		if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
			// Store the claims in the context
			c.Set("userId", claims.UserID)
			c.Set("email", claims.Email)
			c.Next()
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}
	}
}

// GenerateJWT generates a JWT token for a user
func GenerateJWT(userID uuid.UUID, email string, config *config.JWTConfig) (string, error) {
	// Create the claims
	claims := &JWTClaims{
		UserID: userID.String(),
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(config.Expiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "garden-planner-api",
		},
	}

	// Create the token with the claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign the token with the secret key
	return token.SignedString([]byte(config.Secret))
}