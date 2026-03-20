package system

import (
	"bufio"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

type SystemMetrics struct {
	CPUUsage  float64 `json:"cpu"`
	RAMUsage  float64 `json:"ram"`
	RAMTotal  uint64  `json:"ramTotal"`
	DiskUsage float64 `json:"disk"`
	DiskTotal uint64  `json:"diskTotal"`
	NetSent   uint64  `json:"netSent"`
	NetRecv   uint64  `json:"netRecv"`
}

var latestMetrics SystemMetrics
var mu sync.Mutex

func readCPUTicks() (idle, total uint64) {
	file, err := os.Open("/proc/stat")
	if err != nil {
		return 0, 0
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	if scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) > 4 {
			for i := 1; i < len(fields); i++ {
				val, _ := strconv.ParseUint(fields[i], 10, 64)
				total += val
				if i == 4 { // index 4 is idle
					idle = val
				}
			}
		}
	}
	return
}

func readRAM() (usedPercent float64, total uint64) {
	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return 0, 0
	}
	defer file.Close()

	var memTotal, memAvailable uint64
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "MemTotal:") {
			fields := strings.Fields(line)
			val, _ := strconv.ParseUint(fields[1], 10, 64)
			memTotal = val * 1024
		} else if strings.HasPrefix(line, "MemAvailable:") {
			fields := strings.Fields(line)
			val, _ := strconv.ParseUint(fields[1], 10, 64)
			memAvailable = val * 1024
		}
	}
	if memTotal > 0 {
		usedPercent = float64(memTotal-memAvailable) / float64(memTotal) * 100.0
	}
	return usedPercent, memTotal
}

func readDisk() (usedPercent float64, total uint64) {
	var stat syscall.Statfs_t
	syscall.Statfs("/", &stat)
	total = stat.Blocks * uint64(stat.Bsize)
	free := stat.Bavail * uint64(stat.Bsize)
	if total > 0 {
		usd := total - free
		usedPercent = float64(usd) / float64(total) * 100.0
	}
	return usedPercent, total
}

func readNetwork() (sent, recv uint64) {
	file, err := os.Open("/proc/net/dev")
	if err != nil {
		return 0, 0
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, ":") && !strings.Contains(line, "lo:") {
			parts := strings.Split(line, ":")
			fields := strings.Fields(parts[1])
			if len(fields) >= 9 {
				r, _ := strconv.ParseUint(fields[0], 10, 64)
				s, _ := strconv.ParseUint(fields[8], 10, 64)
				recv += r
				sent += s
			}
		}
	}
	return
}

func StartMetricsCollector() {
	var lastSent, lastRecv uint64
	var lastTime time.Time
	var lastIdle, lastTotal uint64

	for {
		idle, total := readCPUTicks()
		ramPct, ramTot := readRAM()
		diskPct, diskTot := readDisk()
		sent, recv := readNetwork()

		now := time.Now()
		var sRate, rRate uint64
		cpuUsage := 0.0

		if !lastTime.IsZero() {
			dt := now.Sub(lastTime).Seconds()
			if dt > 0 {
				sRate = uint64(float64(sent-lastSent) / dt)
				rRate = uint64(float64(recv-lastRecv) / dt)
			}
			
			diffIdle := float64(idle - lastIdle)
			diffTotal := float64(total - lastTotal)
			if diffTotal > 0 {
				cpuUsage = (diffTotal - diffIdle) / diffTotal * 100.0
			}
		}

		lastSent, lastRecv = sent, recv
		lastTime = now
		lastIdle, lastTotal = idle, total

		mu.Lock()
		latestMetrics = SystemMetrics{
			CPUUsage:  cpuUsage,
			RAMUsage:  ramPct,
			RAMTotal:  ramTot,
			DiskUsage: diskPct,
			DiskTotal: diskTot,
			NetSent:   sRate,
			NetRecv:   rRate,
		}
		mu.Unlock()

		time.Sleep(1 * time.Second)
	}
}

func GetMetrics(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	m := latestMetrics
	mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(m)
}
