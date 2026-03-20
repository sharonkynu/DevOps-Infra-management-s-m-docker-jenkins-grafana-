package docker

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/gorilla/mux"
)

func ListContainers(w http.ResponseWriter, r *http.Request) {
	cli, _ := client.NewClientWithOpts(client.FromEnv)

	containers, _ := cli.ContainerList(context.Background(), container.ListOptions{
		All: true,
	})

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
