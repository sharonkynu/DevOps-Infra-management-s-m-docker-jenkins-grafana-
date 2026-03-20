package main

import (
	"log"
	"net/http"
	"strings"

	"infra-dashboard/alerts"
	"infra-dashboard/auth"
	"infra-dashboard/docker"
	"infra-dashboard/jenkins"
	"infra-dashboard/system"
	"infra-dashboard/websocket"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	auth.InitDB()

	r := mux.NewRouter()

	// Universal Authentication Middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == "OPTIONS" || r.URL.Path == "/auth/login" || r.URL.Path == "/alerts" || r.URL.Path == "/ws" {
				next.ServeHTTP(w, r)
				return
			}
			authHeader := r.Header.Get("Authorization")
			token := strings.TrimPrefix(authHeader, "Bearer ")
			if !auth.IsValidSession(token) {
				http.Error(w, "Unauthorized", 401)
				return
			}
			next.ServeHTTP(w, r)
		})
	})

	go system.StartMetricsCollector()

	hub := websocket.NewHub()
	go hub.Run()

	// Docker APIs
	r.HandleFunc("/containers", docker.ListContainers).Methods("GET")
	r.HandleFunc("/containers/restart/{id}", docker.RestartContainer).Methods("POST")
	r.HandleFunc("/containers/logs/{id}", docker.GetContainerLogs).Methods("GET")

	// Auth APIs
	r.HandleFunc("/auth/login", auth.Login).Methods("POST")
	r.HandleFunc("/auth/users", auth.GetUsers).Methods("GET")
	r.HandleFunc("/auth/users", auth.CreateUser).Methods("POST")
	r.HandleFunc("/auth/users", auth.DeleteUser).Methods("DELETE")

	// System APIs
	r.HandleFunc("/system/metrics", system.GetMetrics).Methods("GET")

	// Jenkins APIs
	r.HandleFunc("/jenkins/jobs", jenkins.GetJobs).Methods("GET")
	r.HandleFunc("/jenkins/build/{name}", jenkins.TriggerBuild).Methods("POST")
	r.HandleFunc("/jenkins/stop", jenkins.StopBuild).Methods("POST")
	r.HandleFunc("/jenkins/logs", jenkins.GetJobLogs).Methods("GET")

	// Alerts
	r.HandleFunc("/alerts", alerts.HandleAlert(hub)).Methods("POST")

	// WebSocket
	r.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.ServeWs(hub, w, r)
	})

	// CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
	})

	log.Println("Server running on :8889")
	log.Fatal(http.ListenAndServe(":8889", c.Handler(r)))
}
