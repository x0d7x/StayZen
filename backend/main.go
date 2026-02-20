package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"
)

type PowerState struct {
	Mode       string
	AppName    string
	Cmd        *exec.Cmd
	Active     bool
	StartedAt  time.Time
	CancelFunc context.CancelFunc
	EndTime    time.Time
	mu         sync.RWMutex
}

type HistoryEntry struct {
	ID        int       `json:"id"`
	Mode      string    `json:"mode"`
	AppName   string    `json:"app_name,omitempty"`
	Duration  int       `json:"duration"`
	StartedAt time.Time `json:"started_at"`
	EndedAt   time.Time `json:"ended_at"`
}

type StatusResponse struct {
	Mode             string `json:"mode"`
	Active           bool   `json:"active"`
	RemainingSeconds int    `json:"remaining_seconds"`
	AppName          string `json:"app_name"`
	StartedAt        string `json:"started_at"`
}

type HistoryResponse struct {
	Entries      []HistoryEntry `json:"entries"`
	TotalSeconds int            `json:"total_seconds"`
}

type RequestBody struct {
	Seconds int    `json:"seconds"`
	AppName string `json:"app_name"`
}

var (
	powerState = &PowerState{
		Mode:   "idle",
		Active: false,
	}
	serverPort = "8080"
	history    []HistoryEntry
	historyID  = 0
	historyMu  sync.Mutex
)

func main() {
	log.SetOutput(os.Stdout)
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	log.Println("Starting StayZen backend service...")

	http.HandleFunc("/keep-awake-until", handleKeepAwakeUntil)
	http.HandleFunc("/monitor-app", handleMonitorApp)
	http.HandleFunc("/stop", handleStop)
	http.HandleFunc("/status", handleStatus)
	http.HandleFunc("/health", handleHealth)
	http.HandleFunc("/running-apps", handleRunningApps)
	http.HandleFunc("/history", handleHistory)

	addr := "127.0.0.1:" + serverPort
	log.Printf("Server listening on http://%s", addr)

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func handleKeepAwakeUntil(w http.ResponseWriter, r *http.Request) {
	log.Println("handleKeepAwakeUntil called")
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body RequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if body.Seconds <= 0 {
		http.Error(w, "Invalid seconds value", http.StatusBadRequest)
		return
	}

	log.Printf("Starting keep-awake for %d seconds", body.Seconds)

	powerState.mu.Lock()

	if powerState.CancelFunc != nil {
		powerState.CancelFunc()
		powerState.CancelFunc = nil
	}

	if powerState.Cmd != nil && powerState.Cmd.Process != nil {
		powerState.Cmd.Process.Kill()
		powerState.Cmd = nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	powerState.CancelFunc = cancel
	_ = ctx

	log.Println("Starting caffeinate command")
	cmd := exec.Command("caffeinate", "-t", strconv.Itoa(body.Seconds))
	if err := cmd.Start(); err != nil {
		log.Printf("Failed to start caffeinate: %v", err)
		powerState.mu.Unlock()
		http.Error(w, "Failed to start caffeinate", http.StatusInternalServerError)
		return
	}

	log.Println("Caffeinate started successfully")
	powerState.Cmd = cmd
	powerState.Active = true
	powerState.Mode = "time"
	powerState.StartedAt = time.Now()
	powerState.EndTime = powerState.StartedAt.Add(time.Duration(body.Seconds) * time.Second)
	powerState.AppName = ""

	powerState.mu.Unlock()

	go func() {
		cmd.Wait()
		powerState.mu.Lock()
		defer powerState.mu.Unlock()
		if powerState.Mode == "time" {
			powerState.Active = false
			powerState.Mode = "idle"
			powerState.Cmd = nil
		}
		log.Printf("Caffeinate time mode finished")
	}()

	log.Println("Responding with status")
	respondWithStatus(w, http.StatusOK)
	log.Println("Response sent")
}

func handleMonitorApp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body RequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if body.AppName == "" {
		http.Error(w, "App name is required", http.StatusBadRequest)
		return
	}

	powerState.mu.Lock()

	if powerState.CancelFunc != nil {
		powerState.CancelFunc()
		powerState.CancelFunc = nil
	}

	if powerState.Cmd != nil && powerState.Cmd.Process != nil {
		powerState.Cmd.Process.Kill()
		powerState.Cmd = nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	powerState.CancelFunc = cancel

	powerState.Mode = "monitor"
	powerState.AppName = body.AppName
	powerState.Active = false
	powerState.StartedAt = time.Now()

	powerState.mu.Unlock()

	go monitorAppLoop(body.AppName, ctx)

	respondWithStatus(w, http.StatusOK)
}

func monitorAppLoop(appName string, ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}

		isRunning, err := checkAppRunning(appName)
		if err != nil {
			log.Printf("Error checking app: %v", err)
			continue
		}

		powerState.mu.Lock()
		wasActive := powerState.Active
		powerState.mu.Unlock()

		if isRunning && !wasActive {
			cmd := exec.Command("caffeinate", "-dims")
			if err := cmd.Start(); err != nil {
				log.Printf("Failed to start caffeinate: %v", err)
			} else {
				powerState.mu.Lock()
				powerState.Cmd = cmd
				powerState.Active = true
				powerState.mu.Unlock()
				log.Printf("Started caffeinate for app: %s", appName)
			}
		} else if !isRunning && wasActive {
			powerState.mu.Lock()
			if powerState.Cmd != nil && powerState.Cmd.Process != nil {
				powerState.Cmd.Process.Kill()
				powerState.Cmd = nil
			}
			powerState.Active = false
			powerState.mu.Unlock()
			log.Printf("Stopped caffeinate - app not running: %s", appName)
		}
	}
}

func checkAppRunning(appName string) (bool, error) {
	cmd := exec.Command("pgrep", "-x", appName)
	err := cmd.Run()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			if exitErr.ExitCode() == 1 {
				return false, nil
			}
		}
		return false, err
	}
	return true, nil
}

func handleStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	powerState.mu.Lock()

	var previousMode string
	var previousAppName string
	var previousStartedAt time.Time

	if powerState.Active || powerState.Mode != "idle" {
		previousMode = powerState.Mode
		previousAppName = powerState.AppName
		previousStartedAt = powerState.StartedAt
	}

	if powerState.CancelFunc != nil {
		powerState.CancelFunc()
		powerState.CancelFunc = nil
	}

	if powerState.Cmd != nil && powerState.Cmd.Process != nil {
		powerState.Cmd.Process.Kill()
		powerState.Cmd = nil
	}

	powerState.Active = false
	powerState.Mode = "idle"
	powerState.AppName = ""
	powerState.EndTime = time.Time{}

	powerState.mu.Unlock()

	if previousMode != "" && previousMode != "idle" {
		duration := int(time.Since(previousStartedAt).Seconds())
		if duration > 5 {
			addHistoryEntry(previousMode, previousAppName, duration, previousStartedAt)
		}
	}

	respondWithStatus(w, http.StatusOK)
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	powerState.mu.RLock()
	defer powerState.mu.RUnlock()

	respondWithStatus(w, http.StatusOK)
}

func respondWithStatus(w http.ResponseWriter, code int) {
	powerState.mu.RLock()

	remaining := 0
	if powerState.Mode == "time" && !powerState.EndTime.IsZero() {
		remaining = int(time.Until(powerState.EndTime).Seconds())
		if remaining < 0 {
			remaining = 0
		}
	}

	response := StatusResponse{
		Mode:             powerState.Mode,
		Active:           powerState.Active,
		RemainingSeconds: remaining,
		AppName:          powerState.AppName,
		StartedAt:        powerState.StartedAt.Format(time.RFC3339),
	}

	powerState.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(response)
}

func handleRunningApps(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cmd := exec.Command("osascript", "-e", `
		set appList to {}
		tell application "System Events"
			repeat with proc in (every process whose background only is false)
				set appName to name of proc
				if appName is not "Finder" then
					try
						set appPath to path of application appName
						set end of appList to {appName, appPath}
					on error
						set end of appList to {appName, ""}
					end try
				end if
			end repeat
		end tell
		return appList
	`)
	output, err := cmd.Output()
	if err != nil {
		http.Error(w, "Failed to get running apps", http.StatusInternalServerError)
		return
	}

	type AppInfo struct {
		Name string `json:"name"`
		Path string `json:"path"`
	}

	var apps []AppInfo
	outputStr := strings.TrimSpace(string(output))
	outputStr = strings.TrimPrefix(outputStr, "{")
	outputStr = strings.TrimSuffix(outputStr, "}")

	if outputStr != "" {
		items := strings.Split(outputStr, "}, {")
		for _, item := range items {
			item = strings.Trim(item, "{}")
			parts := strings.Split(item, ", ")
			if len(parts) >= 2 {
				name := strings.Trim(parts[0], "\"")
				path := strings.Trim(parts[1], "\"")
				apps = append(apps, AppInfo{Name: name, Path: path})
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string][]AppInfo{"apps": apps})
}

func splitLines(s string) []string {
	var lines []string
	start := 0
	for i, c := range s {
		if c == '\n' || c == '\r' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	lines = append(lines, s[start:])
	return lines
}

func trimSpace(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}

func handleHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	historyMu.Lock()
	defer historyMu.Unlock()

	var totalSeconds int
	for _, entry := range history {
		totalSeconds += entry.Duration
	}

	response := HistoryResponse{
		Entries:      history,
		TotalSeconds: totalSeconds,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func addHistoryEntry(mode, appName string, duration int, startedAt time.Time) {
	historyMu.Lock()
	defer historyMu.Unlock()

	historyID++
	entry := HistoryEntry{
		ID:        historyID,
		Mode:      mode,
		AppName:   appName,
		Duration:  duration,
		StartedAt: startedAt,
		EndedAt:   time.Now(),
	}

	history = append([]HistoryEntry{entry}, history...)
	if len(history) > 50 {
		history = history[:50]
	}
}

func init() {
	if port := os.Getenv("STAYZEN_PORT"); port != "" {
		serverPort = port
	}
}
