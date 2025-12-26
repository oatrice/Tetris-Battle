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
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	id   string
	name string
	room *Room
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

func (c *Client) sendGameStart(opponentId string, opponentName string, matchId string) {
	c.send <- toJson(Message{
		Type: "game_start",
		Payload: map[string]string{
			"opponentId":   opponentId,
			"opponentName": opponentName,
			"matchId":      matchId,
		},
	})
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
		// Extract name from payload
		if payloadMap, ok := msg.Payload.(map[string]interface{}); ok {
			if name, ok := payloadMap["name"].(string); ok {
				c.name = name
			}
		}
		if c.name == "" {
			c.name = "Player " + c.id[len(c.id)-4:]
		}

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

			// Notify Start
			c.sendGameStart(opponent.id, opponent.name, roomID)
			opponent.sendGameStart(c.id, c.name, roomID)

			log.Printf("Match started: %s (%s) vs %s (%s) in Room %s", c.id, c.name, opponent.id, opponent.name, roomID)

		} else {
			// Wait
			c.hub.waitingClient = c
			c.hub.mu.Unlock()
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

// GetVersion returns the current version of the Go library
func GetVersion() string {
	return "lib-v1.1.2"
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
func Start(port string) {
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

	log.Println("Server starting on " + port)
	log.Println("Version: " + GetVersion())

	// Allow external access
	if err := http.ListenAndServe(port, mux); err != nil {
		log.Println("ListenAndServe: ", err)
	}
}
