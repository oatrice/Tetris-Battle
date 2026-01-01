package tetrisserver

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// ================= Types =================

type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type Client struct {
	hub               *Hub
	conn              *websocket.Conn
	send              chan []byte
	id                string
	name              string
	room              *Room
	attackMode        string // "garbage" or "lines"
	showGhostPiece    bool   // Ghost piece visibility
	effectType        string // Visual effect type
	useCascadeGravity bool   // Puyo-style cascade gravity
	allowHoldPiece    bool   // Allow hold piece feature
	increaseGravity   bool   // Speed increases with level
}

type Room struct {
	id      string
	clients map[*Client]bool
	mu      sync.Mutex
}

type Hub struct {
	clients map[*Client]bool
	// One waiting client for 1v1 matchmaking
	waitingClient *Client
	rooms         map[string]*Room
	register      chan *Client
	unregister    chan *Client
	mu            sync.Mutex
}

//go:embed all:public
var content embed.FS

// ================= Logic =================

func NewHub() *Hub {
	return &Hub{
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]*Room),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client registered: %s", client.id)

			// Send room status to inform client if host is waiting
			go client.sendRoomStatus()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)

				// Clear from matchmaking
				if h.waitingClient == client {
					h.waitingClient = nil
				}

				// Handle room disconnect
				if client.room != nil {
					client.room.removeClient(client)
				}
			}
			h.mu.Unlock()
			log.Printf("Client unregistered: %s", client.id)
		}
	}
}

func NewRoom(id string) *Room {
	return &Room{
		id:      id,
		clients: make(map[*Client]bool),
	}
}

func (r *Room) removeClient(c *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.clients, c)

	// Notify other player
	for other := range r.clients {
		other.send <- toJson(Message{Type: "player_left"})
	}
}

func (r *Room) broadcast(sender *Client, msg Message) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for client := range r.clients {
		if client != sender {
			client.send <- toJson(msg)
		}
	}
}

func toJson(v interface{}) []byte {
	b, _ := json.Marshal(v)
	return b
}

func (c *Client) sendGameStart(opponentId string, opponentName string, matchId string, attackMode string) {
	c.send <- toJson(Message{
		Type: "game_start",
		Payload: map[string]string{
			"opponentId":   opponentId,
			"opponentName": opponentName,
			"matchId":      matchId,
			"attackMode":   attackMode,
		},
	})
}

func (c *Client) sendRoomStatus() {
	c.hub.mu.Lock()
	defer c.hub.mu.Unlock()

	if c.hub.waitingClient != nil {
		// There's a host waiting - send their settings
		host := c.hub.waitingClient
		log.Printf("[ROOM_STATUS] Sending host settings to client %s: attack=%s, ghost=%v, effect=%s, cascade=%v, hold=%v, increaseGravity=%v",
			c.id, host.attackMode, host.showGhostPiece, host.effectType, host.useCascadeGravity, host.allowHoldPiece, host.increaseGravity)
		c.send <- toJson(Message{
			Type: "room_status",
			Payload: map[string]interface{}{
				"hasHost": true,
				"hostSettings": map[string]interface{}{
					"attackMode":        host.attackMode,
					"showGhostPiece":    host.showGhostPiece,
					"effectType":        host.effectType,
					"useCascadeGravity": host.useCascadeGravity,
					"allowHoldPiece":    host.allowHoldPiece,
					"increaseGravity":   host.increaseGravity,
				},
			},
		})
	} else {
		// No host waiting - this client can be host
		log.Printf("[ROOM_STATUS] No host waiting, client %s can be host", c.id)
		c.send <- toJson(Message{
			Type: "room_status",
			Payload: map[string]interface{}{
				"hasHost": false,
			},
		})
	}
}

// ================= HTTP Handlers =================

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins
	},
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Error unmarshaling: %v", err)
			continue
		}

		c.handleMessage(msg)
	}
}

func (c *Client) writePump() {
	for {
		message, ok := <-c.send
		if !ok {
			c.conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}

		w, err := c.conn.NextWriter(websocket.TextMessage)
		if err != nil {
			return
		}
		w.Write(message)

		if err := w.Close(); err != nil {
			return
		}
	}
}

func (c *Client) handleMessage(msg Message) {
	switch msg.Type {
	case "join_game":
		// Extract all settings from payload
		if payloadMap, ok := msg.Payload.(map[string]interface{}); ok {
			if name, ok := payloadMap["name"].(string); ok {
				c.name = name
			}
			if attackMode, ok := payloadMap["attackMode"].(string); ok {
				c.attackMode = attackMode
			}
			if showGhost, ok := payloadMap["showGhostPiece"].(bool); ok {
				c.showGhostPiece = showGhost
			}
			if effectType, ok := payloadMap["effectType"].(string); ok {
				c.effectType = effectType
			}
			if cascade, ok := payloadMap["useCascadeGravity"].(bool); ok {
				c.useCascadeGravity = cascade
			}
			if incGravity, ok := payloadMap["increaseGravity"].(bool); ok {
				c.increaseGravity = incGravity
			} else {
				c.increaseGravity = true // Default to true if not specified
			}
			if holdPiece, ok := payloadMap["allowHoldPiece"].(bool); ok {
				c.allowHoldPiece = holdPiece
			} else {
				c.allowHoldPiece = true // Default to true if not specified
			}
		}
		// Set defaults
		if c.name == "" {
			c.name = "Player " + c.id[len(c.id)-4:]
		}
		if c.attackMode == "" {
			c.attackMode = "garbage"
		}
		if c.effectType == "" {
			c.effectType = "explosion"
		}
		// showGhostPiece and useCascadeGravity default to false (Go zero values)
		// increaseGravity defaults to true (set above)

		log.Printf("[JOIN] %s (%s) with settings: AttackMode=%s, Ghost=%v, Effect=%s, Cascade=%v, Hold=%v, IncreaseGravity=%v",
			c.id, c.name, c.attackMode, c.showGhostPiece, c.effectType, c.useCascadeGravity, c.allowHoldPiece, c.increaseGravity)

		c.hub.mu.Lock()
		if c.hub.waitingClient != nil {
			// Match found!
			opponent := c.hub.waitingClient
			c.hub.waitingClient = nil

			// Create Room
			roomID := fmt.Sprintf("room-%d", time.Now().UnixNano())
			room := NewRoom(roomID)
			c.hub.rooms[roomID] = room

			// Assign players
			c.room = room
			opponent.room = room
			room.clients[c] = true
			room.clients[opponent] = true
			c.hub.mu.Unlock()

			// Use HOST (waiting client) attackMode for both players
			syncedAttackMode := opponent.attackMode

			log.Printf("[CONFIG] Host: %s (AttackMode: %s) | Guest: %s (AttackMode: %s) -> Synced: %s",
				opponent.name, opponent.attackMode, c.name, c.attackMode, syncedAttackMode)

			// Notify Start with synced attackMode
			c.sendGameStart(opponent.id, opponent.name, roomID, syncedAttackMode)
			opponent.sendGameStart(c.id, c.name, roomID, syncedAttackMode)

			log.Printf("Match started: %s (%s) vs %s (%s) in Room %s, AttackMode: %s", c.id, c.name, opponent.id, opponent.name, roomID, syncedAttackMode)

		} else {
			// Wait - this client becomes the host
			c.hub.waitingClient = c

			// Broadcast room_status to ALL other connected clients who are not in a room
			// This notifies any guests who connected before host clicked "Join"
			for otherClient := range c.hub.clients {
				if otherClient != c && otherClient.room == nil {
					log.Printf("[BROADCAST] Notifying client %s that host %s is now waiting", otherClient.id, c.name)
					otherClient.send <- toJson(Message{
						Type: "room_status",
						Payload: map[string]interface{}{
							"hasHost": true,
							"hostSettings": map[string]interface{}{
								"attackMode":        c.attackMode,
								"showGhostPiece":    c.showGhostPiece,
								"effectType":        c.effectType,
								"useCascadeGravity": c.useCascadeGravity,
								"allowHoldPiece":    c.allowHoldPiece,
								"increaseGravity":   c.increaseGravity,
							},
						},
					})
				}
			}

			c.hub.mu.Unlock()
			log.Printf("[HOST] %s (%s) waiting with: attack=%s, ghost=%v, effect=%s, cascade=%v, hold=%v, increaseGravity=%v",
				c.id, c.name, c.attackMode, c.showGhostPiece, c.effectType, c.useCascadeGravity, c.allowHoldPiece, c.increaseGravity)
			c.send <- toJson(Message{Type: "waiting_for_opponent"})
		}

	case "game_state", "attack", "game_over", "pause", "resume":
		if c.room != nil {
			log.Printf("Action from %s: %s", c.name, msg.Type)
			c.room.broadcast(c, msg)
		}
	}
}

// ================= Main =================

// Logger allows Android to receive logs from Go
type Logger interface {
	Log(msg string)
}

var globalLogger Logger

// SetLogger sets the logger instance from Android
func SetLogger(l Logger) {
	globalLogger = l
	// Redirect standard log output to this logger as well
	log.SetOutput(&androidWriter{l: l})
}

// VersionInfo matches the structure of public/version.json
type VersionInfo struct {
	Version   string `json:"version"`
	Hash      string `json:"hash"`
	Timestamp string `json:"timestamp"`
}

var currentVersion string = "lib-v1.3.0" // Default fallback

func loadVersion() {
	file, err := content.Open("public/version.json")
	if err != nil {
		log.Printf("Could not open version.json: %v", err)
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		log.Printf("Could not read version.json: %v", err)
		return
	}

	var v VersionInfo
	if err := json.Unmarshal(data, &v); err != nil {
		log.Printf("Could not unmarshal version.json: %v", err)
		return
	}

	currentVersion = fmt.Sprintf("%s-%s-%s", v.Version, v.Hash, v.Timestamp)
}

// GetVersion returns the current version of the Go library (synced with Frontend)
func GetVersion() string {
	return currentVersion
}

// androidWriter adapts Logger to io.Writer for standard log package
type androidWriter struct {
	l Logger
}

func (w *androidWriter) Write(p []byte) (n int, err error) {
	msg := string(p)
	if globalLogger != nil {
		globalLogger.Log(msg)
	}
	return len(p), nil
}

// logMiddleware intercepts HTTP requests and logs them
func logMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Capture status code/logging logic (omitted for brevity)
		if globalLogger != nil {
			// e.g., "[HTTP] GET /app.js from 192.168.1.5"
			globalLogger.Log(fmt.Sprintf("[HTTP] %s %s from %s", r.Method, path, r.RemoteAddr))
		}

		// Explicit Mime Handling (Important for Android/Embedded)
		// Use strings.HasSuffix to handle cases correctly
		if strings.HasSuffix(path, ".js") {
			w.Header().Set("Content-Type", "application/javascript")
		} else if strings.HasSuffix(path, ".css") {
			w.Header().Set("Content-Type", "text/css")
		} else if strings.HasSuffix(path, ".html") {
			w.Header().Set("Content-Type", "text/html")
		} else if strings.HasSuffix(path, ".json") {
			w.Header().Set("Content-Type", "application/json")
		} else if strings.HasSuffix(path, ".wasm") {
			w.Header().Set("Content-Type", "application/wasm")
		} else if strings.HasSuffix(path, ".png") {
			w.Header().Set("Content-Type", "image/png")
		} else if strings.HasSuffix(path, ".ico") {
			w.Header().Set("Content-Type", "image/x-icon")
		}

		next.ServeHTTP(w, r)
	})
}

// Stop triggers the server to shutdown (placeholder for now)
func Stop() {
	// In a real implementation, we would use a context or channel to stop the server
	// For now, Android can just kill the process/activity
}

// Start launches the HTTP and WebSocket server on the specified port (e.g., ":8080")
// usage: tetrisserver.Start(":8080")
// NewServerHandler creates and configures the main HTTP handler
func NewServerHandler() http.Handler {
	hub := NewHub()
	go hub.run()

	// Use a new ServeMux to avoid global state conflicts if restarted
	mux := http.NewServeMux()

	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println(err)
			return
		}

		// Log WebSocket connection
		log.Printf("New WebSocket connection from %s", r.RemoteAddr)

		client := &Client{
			hub:  hub,
			conn: conn,
			send: make(chan []byte, 256),
			id:   fmt.Sprintf("%d", time.Now().UnixNano()),
		}
		client.hub.register <- client

		go client.writePump()
		go client.readPump()
	})

	// Serve static files (Embedded Frontend)
	// We use a sub-filesystem because the files are inside "public" folder in the embed
	publicFS, err := fs.Sub(content, "public")
	if err != nil {
		log.Println("Failed to create sub filesystem: ", err)
	} else {
		// Apply middleware to file server
		fileHandler := http.FileServer(http.FS(publicFS))
		mux.Handle("/", logMiddleware(fileHandler))
	}

	// Client Logging Bridge
	mux.HandleFunc("/debug/log", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			return
		}
		buf := new(strings.Builder)
		_, _ = io.Copy(buf, r.Body)
		msg := strings.TrimSpace(buf.String())
		if globalLogger != nil && msg != "" {
			globalLogger.Log("[CLIENT] " + msg)
		}
	})

	// Version Endpoint
	mux.HandleFunc("/debug/version", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Private-Network", "true") // Crucial for Local Network Access
		if r.Method == "OPTIONS" {
			return
		}
		w.Write([]byte(GetVersion()))
	})

	return mux
}

// Start launches the HTTP and WebSocket server on the specified port (e.g., ":8080")
// usage: tetrisserver.Start(":8080")
func Start(port string) {
	loadVersion() // Load version on start

	handler := NewServerHandler()

	log.Println("Server starting on " + port)
	log.Println("Version: " + GetVersion())

	// Allow external access
	if err := http.ListenAndServe(port, handler); err != nil {
		log.Println("ListenAndServe: ", err)
	}
}
