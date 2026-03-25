package docker

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/gorilla/mux"
)

func ListContainers(w http.ResponseWriter, r *http.Request) {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		log.Printf("Docker Client Error: %v", err)
		http.Error(w, "Docker Engine Unreachable", 500)
		return
	}

	containers, err := cli.ContainerList(context.Background(), container.ListOptions{
		All: true,
	})
	if err != nil {
		log.Printf("Docker List Error: %v", err)
		http.Error(w, "Failed to list containers", 500)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(containers)
}

func ExecuteRestart(id string) error {
	cli, _ := client.NewClientWithOpts(client.FromEnv)
	return cli.ContainerRestart(context.Background(), id, container.StopOptions{})
}

func RestartContainer(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	err := ExecuteRestart(id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	w.Write([]byte("restarted"))
}

func GetContainerLogs(w http.ResponseWriter, r *http.Request) {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	id := mux.Vars(r)["id"]

	out, err := cli.ContainerLogs(context.Background(), id, container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       "100",
	})
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer out.Close()

	io.Copy(w, out)
}
