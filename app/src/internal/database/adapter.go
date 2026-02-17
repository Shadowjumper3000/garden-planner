package database
package database























}	return sql.Open("postgres", dsn)	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, dbname)	if dbname == "" { dbname = "garden" }	dbname := os.Getenv("POSTGRES_DB")	if password == "" { password = "garden" }	password := os.Getenv("POSTGRES_PASSWORD")	if user == "" { user = "garden" }	user := os.Getenv("POSTGRES_USER")	if port == "" { port = "5432" }	port := os.Getenv("POSTGRES_PORT")	if host == "" { host = "db" }	host := os.Getenv("POSTGRES_HOST")func Connect() (*sql.DB, error) {)	"fmt"	"os"	_ "github.com/lib/pq"	"database/sql"import (