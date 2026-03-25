package jenkins

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
)

var jenkinsURL = "http://localhost:8081"
var username = "ajesh"
var token = "1115bae7177b7496bccf3cf2586757d7ec"

// ========================
// 🔹 STRUCTS
// ========================

type Job struct {
	Name  string `json:"name"`
	URL   string `json:"url"`
	Class string `json:"_class"`
	Color string `json:"color"`
}

type JenkinsResponse struct {
	Jobs []Job `json:"jobs"`
}

type JobDetail struct {
	LastBuild *struct {
		Number int    `json:"number"`
		Result string `json:"result"`
	} `json:"lastBuild"`
}

type SimpleJob struct {
	Folder     string `json:"folder"`
	Name       string `json:"name"`
	URL        string `json:"url"`
	Status     string `json:"status"`
	LastBuild  int    `json:"lastBuild"`
}

// ========================
// 🔹 COMMON REQUEST
// ========================

func doRequest(method, url string) (*http.Response, error) {
	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		return nil, err
	}

	req.SetBasicAuth(username, token)

	client := &http.Client{}
	return client.Do(req)
}

// ========================
// 🔹 GET CRUMB
// ========================

func getCrumb() (string, string, error) {
	resp, err := doRequest("GET", jenkinsURL+"/crumbIssuer/api/json")
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	var data map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&data)

	return data["crumbRequestField"].(string), data["crumb"].(string), nil
}

// ========================
// 🔹 FETCH JOB STATUS
// ========================

func mapColorToStatus(color string) string {
	if strings.HasSuffix(color, "_anime") {
		return "RUNNING"
	}
	switch color {
	case "blue", "green":
		return "SUCCESS"
	case "red":
		return "FAILED"
	case "yellow":
		return "UNSTABLE"
	case "aborted":
		return "ABORTED"
	case "disabled":
		return "DISABLED"
	case "notbuilt":
		return "NO BUILDS"
	default:
		return "UNKNOWN"
	}
}

func getJobDetails(targetURL, color string) (string, int) {
	status := mapColorToStatus(color)

	resp, err := doRequest("GET", targetURL+"api/json")
	if err != nil {
		return status, 0
	}
	defer resp.Body.Close()

	var detail JobDetail
	json.NewDecoder(resp.Body).Decode(&detail)

	if detail.LastBuild == nil {
		return status, 0
	}

	return status, detail.LastBuild.Number
}

// ========================
// 🔹 RECURSIVE JOB FETCH
// ========================

func fetchJobs(url string, currentFolder string, result *[]SimpleJob) error {
	apiPath := url + "/api/json"
	if strings.HasSuffix(url, "/") {
		apiPath = url + "api/json"
	}

	resp, err := doRequest("GET", apiPath)
	if err != nil {
		log.Printf("Jenkins Fetch Error (%s): %v", apiPath, err)
		return err
	}
	defer resp.Body.Close()

	var data JenkinsResponse
	json.NewDecoder(resp.Body).Decode(&data)

	for _, job := range data.Jobs {
		// Use a flexible class check to recursively enter all known Jenkins folder types
		isFolder := strings.Contains(job.Class, "Folder") || strings.Contains(job.Class, "MultiBranch") || strings.Contains(job.Class, "GithubOrganization")
		
		if isFolder {
			nextFolder := job.Name
			if currentFolder != "" {
				nextFolder = currentFolder + "/" + job.Name
			}
			fetchJobs(job.URL, nextFolder, result)
			continue
		}

		// Get status
		status, build := getJobDetails(job.URL, job.Color)

		*result = append(*result, SimpleJob{
			Folder:    currentFolder,
			Name:      job.Name,
			URL:       job.URL,
			Status:    status,
			LastBuild: build,
		})
	}

	return nil
}

// ========================
// 🔹 GET ALL JOBS
// ========================

func GetJobs(w http.ResponseWriter, r *http.Request) {
	var jobs []SimpleJob

	err := fetchJobs(jenkinsURL, "", &jobs)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	json.NewEncoder(w).Encode(jobs)
}

// ========================
// 🔹 TRIGGER BUILD (URL BASED)
// ========================

func ExecuteBuild(jobURL, branch string) error {
	// Get crumb
	field, crumb, err := getCrumb()
	if err != nil {
		return err
	}

	buildPath := "build"
	if branch != "" {
		buildPath = "buildWithParameters?BRANCH_NAME=" + branch // Or just ?branch= depending on job config
	}

	req, err := http.NewRequest("POST", jobURL+buildPath, nil)
	if err != nil {
		return err
	}

	req.SetBasicAuth(username, token)
	req.Header.Set(field, crumb)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("failed to trigger build: %d", resp.StatusCode)
	}

	return nil
}

func TriggerBuild(w http.ResponseWriter, r *http.Request) {
	jobURL := r.URL.Query().Get("url")
	paramsStr := r.URL.Query().Get("params")

	if jobURL == "" {
		http.Error(w, "missing job url", 400)
		return
	}

	err := ExecuteBuild(jobURL, paramsStr)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	w.Write([]byte("build triggered"))
}

// ========================
// 🔹 STOP BUILD
// ========================

func StopBuild(w http.ResponseWriter, r *http.Request) {
	jobURL := r.URL.Query().Get("url")
	buildNum := r.URL.Query().Get("build")

	if jobURL == "" || buildNum == "" {
		http.Error(w, "missing job url or build number", 400)
		return
	}

	field, crumb, err := getCrumb()
	if err != nil && err.Error() != "EOF" {
		// ignore if disabled
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("%s%s/stop", jobURL, buildNum), nil)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	req.SetBasicAuth(username, token)
	req.Header.Set(field, crumb)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		http.Error(w, fmt.Sprintf("failed to stop build: %d", resp.StatusCode), resp.StatusCode)
		return
	}

	w.Write([]byte("build stopped"))
}

// ========================
// 🔹 GET JOB LOGS
// ========================

func GetJobLogs(w http.ResponseWriter, r *http.Request) {
	jobURL := r.URL.Query().Get("url")

	if jobURL == "" {
		http.Error(w, "missing job url", 400)
		return
	}

	req, err := http.NewRequest("GET", jobURL+"lastBuild/consoleText", nil)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	req.SetBasicAuth(username, token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		http.Error(w, fmt.Sprintf("failed to fetch logs: %d", resp.StatusCode), resp.StatusCode)
		return
	}

	io.Copy(w, resp.Body)
}