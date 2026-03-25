package system

import (
	"bufio"
	"encoding/json"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

type SystemMetrics struct {
	CPUUsage  float64 `json:"cpu"`
	RAMUsed   uint64  `json:"ramUsed"`
	RAMTotal  uint64  `json:"ramTotal"`
	DiskUsed  uint64  `json:"diskUsed"`
	DiskTotal uint64  `json:"diskTotal"`
	NetSent   uint64  `json:"netSent"`
	NetRecv   uint64  `json:"netRecv"`
	OS        string  `json:"os"`
	IP        string  `json:"ip"`
	MAC       string  `json:"mac"`
	Interface string  `json:"interface"`
	Serial    string  `json:"serial"`
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

func readRAM() (used, total uint64) {
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
		used = memTotal - memAvailable
	}
	return used, memTotal
}

func readDisk() (used, total uint64) {
	var stat syscall.Statfs_t
	syscall.Statfs("/", &stat)
	total = stat.Blocks * uint64(stat.Bsize)
	free := stat.Bavail * uint64(stat.Bsize)
	if total > 0 {
		used = total - free
	}
	return used, total
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

func getOS() string {
	file, err := os.Open("/etc/os-release")
	if err != nil {
		return "Linux"
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "PRETTY_NAME=") {
			return strings.Trim(strings.TrimPrefix(line, "PRETTY_NAME="), "\"")
		}
	}
	return "Linux"
}

func getNetworkDetails() (name, ip, mac string) {
	name, ip, mac = "N/A", "N/A", "N/A"

	ifaces, err := net.Interfaces()
	if err != nil {
		return
	}

	for _, i := range ifaces {
		// Skip loopback and down interfaces
		if i.Flags&net.FlagLoopback != 0 || i.Flags&net.FlagUp == 0 {
			continue
		}

		// Skip virtual/docker interfaces
		if strings.HasPrefix(i.Name, "docker") || strings.HasPrefix(i.Name, "veth") || strings.HasPrefix(i.Name, "br-") {
			continue
		}

		addrs, err := i.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			var ipNet *net.IPNet
			switch v := addr.(type) {
			case *net.IPNet:
				ipNet = v
			}

			if ipNet != nil && !ipNet.IP.IsLoopback() && ipNet.IP.To4() != nil {
				name = i.Name
				ip = ipNet.IP.String()
				mac = i.HardwareAddr.String()
				return // Found the primary active IPv4 interface
			}
		}
	}
	return
}

func getSerial() string {
	// Try the command-based approach requested by user
	cmd := exec.Command("sudo", "dmidecode", "-s", "system-serial-number")
	output, err := cmd.Output()
	if err == nil {
		serial := strings.TrimSpace(string(output))
		if serial != "" && !strings.Contains(strings.ToLower(serial), "not specified") {
			return serial
		}
	}

	// Fallback to file-based reads
	paths := []string{
		"/sys/class/dmi/id/product_serial",
		"/sys/class/dmi/id/board_serial",
		"/sys/class/dmi/id/chassis_serial",
		"/sys/devices/virtual/dmi/id/product_serial",
		"/proc/device-tree/serial-number",
	}

	for _, p := range paths {
		if b, err := os.ReadFile(p); err == nil {
			serial := strings.TrimSpace(string(b))
			// Filter out common useless strings
			low := strings.ToLower(serial)
			if serial != "" &&
				!strings.Contains(low, "not specified") &&
				!strings.Contains(low, "to be filled") &&
				!strings.Contains(low, "default string") {
				return serial
			}
		}
	}

	// Machine ID fallback for unique identification on modern Linux (Ubuntu)
	if b, err := os.ReadFile("/etc/machine-id"); err == nil {
		id := strings.TrimSpace(string(b))
		if id != "" && len(id) > 8 {
			return "ID-" + id[:8]
		}
	}

	// UUID fallback
	if b, err := os.ReadFile("/sys/class/dmi/id/product_uuid"); err == nil {
		uuid := strings.TrimSpace(string(b))
		if uuid != "" && len(uuid) > 8 {
			return "UUID-" + uuid[:8]
		}
	}

	return "DEVOPS-NODE-PRIMARY"
}

func StartMetricsCollector() {
	var lastSent, lastRecv uint64
	var lastTime time.Time
	var lastIdle, lastTotal uint64

	osName := getOS()

	for {
		iface, ip, mac := getNetworkDetails()
		serial := getSerial()
		idle, total := readCPUTicks()
		ramUsed, ramTot := readRAM()
		diskUsed, diskTot := readDisk()
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
			RAMUsed:   ramUsed,
			RAMTotal:  ramTot,
			DiskUsed:  diskUsed,
			DiskTotal: diskTot,
			NetSent:   sRate,
			NetRecv:   rRate,
			OS:        osName,
			IP:        ip,
			MAC:       mac,
			Interface: iface,
			Serial:    serial,
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
