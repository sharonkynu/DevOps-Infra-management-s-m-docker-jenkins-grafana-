package alerts

import (
	"encoding/json"
	"fmt"
	"net/http"

	"infra-dashboard/docker"
	"infra-dashboard/jenkins"
	"infra-dashboard/websocket"
)

type Alert struct {
	Status string            `json:"status"`
	Labels map[string]string `json:"labels"`
}

type Payload struct {
	Alerts []Alert `json:"alerts"`
}

func HandleAlert(hub *websocket.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload Payload
		json.NewDecoder(r.Body).Decode(&payload)

		for _, alert := range payload.Alerts {
			alertName := alert.Labels["alertname"]
			// Broadcast alert to UI
			msg, _ := json.Marshal(map[string]interface{}{
				"type":   "alert",
				"name":   alertName,
				"labels": alert.Labels,
			})
			hub.Broadcast <- msg

			// Decision Engine Logic
			if alertName == "ContainerDown" {
				containerID := alert.Labels["container_id"]
				if containerID != "" {
					err := docker.ExecuteRestart(containerID)
					status := "success"
					if err != nil {
						status = fmt.Sprintf("failed: %v", err)
					}
					actionMsg, _ := json.Marshal(map[string]string{
						"type": "action",
						"msg":  fmt.Sprintf("Restarted container %s: %s", containerID, status),
					})
					hub.Broadcast <- actionMsg
				}
			} else if alertName == "BuildFailed" {
				jobURL := alert.Labels["job_url"]
				if jobURL != "" {
					err := jenkins.ExecuteBuild(jobURL, "")
					status := "success"
					if err != nil {
						status = fmt.Sprintf("failed: %v", err)
					}
					actionMsg, _ := json.Marshal(map[string]string{
						"type": "action",
						"msg":  fmt.Sprintf("Triggered build at %s: %s", jobURL, status),
					})
					hub.Broadcast <- actionMsg
				}
			}
		}

		w.Write([]byte("alert received"))
	}
}
