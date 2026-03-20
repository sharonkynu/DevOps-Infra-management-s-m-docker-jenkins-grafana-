package auth

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

var db *sql.DB
var sessions = make(map[string]time.Time)
var mu sync.Mutex

func InitDB() {
	var err error
	db, err = sql.Open("sqlite", "./kynu.db")
	if err != nil {
		log.Printf("Failed to open SQLite DB: %v", err)
		return
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE,
		password TEXT
	)`)
	if err != nil {
		log.Println("SQLite Migrations Failed:", err)
		return
	}

	// Seed default admin account
	db.Exec(`INSERT OR IGNORE INTO users (username, password) VALUES ('admin', 'admin')`)
	log.Println("SQLite Authentication DB Ready -> Loaded!")
}

func generateToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func Login(w http.ResponseWriter, r *http.Request) {
	var creds struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
        http.Error(w, "Bad Request", 400)
        return
    }

	var id int
	err := db.QueryRow("SELECT id FROM users WHERE username=? AND password=?", creds.Username, creds.Password).Scan(&id)
	if err != nil {
		http.Error(w, "Invalid credentials", 401)
		return
	}

	token := generateToken()
	mu.Lock()
	sessions[token] = time.Now().Add(24 * time.Hour)
	mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func IsValidSession(token string) bool {
	mu.Lock()
	defer mu.Unlock()
	exp, ok := sessions[token]
	return ok && time.Now().Before(exp)
}

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
}

func GetUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, username FROM users")
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username); err == nil {
			users = append(users, u)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func CreateUser(w http.ResponseWriter, r *http.Request) {
	var creds struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Bad Request", 400)
		return
	}

	if strings.TrimSpace(creds.Username) == "" || strings.TrimSpace(creds.Password) == "" {
		http.Error(w, "Username and password cannot be empty", 400)
		return
	}

	_, err := db.Exec("INSERT INTO users (username, password) VALUES (?, ?)", creds.Username, creds.Password)
	if err != nil {
		http.Error(w, "Failed to create user (username may already exist)", 400)
		return
	}
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("User created"))
}

func DeleteUser(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Error(w, "Missing ID", 400)
		return
	}

	res, err := db.Exec("DELETE FROM users WHERE id=? AND username != 'admin'", idStr)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		http.Error(w, "Cannot delete admin or user not found", 400)
		return
	}
	w.Write([]byte("User deleted"))
}
