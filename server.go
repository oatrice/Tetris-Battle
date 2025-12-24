package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// ==========================================
// Hub: Manages all active clients and rooms
// ==========================================

type Hub struct {
	clients    map[*Client]bool
	rooms      map[string]*Room
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.Mutex

	// Matchmaking queue
	waitingClient *Client
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]*Room),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client registered: %s", client.id)
			client.sendIdentity()

		case client := <-h.unregister:
			h.handleDisconnect(client)

		case message := <-h.broadcast:
			// Broadcast to all (debug mostly)
			h.mu.Lock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) handleDisconnect(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.send)

		// Remove from waiting queue if there
		if h.waitingClient == client {
			h.waitingClient = nil
		}

		// Handle Room Disconnect
		if client.room != nil {
			client.room.handlePlayerLeave(client)
			// If room empty, clean up
			if len(client.room.clients) == 0 {
				delete(h.rooms, client.room.id)
			}
		}
		log.Printf("Client disconnected: %s", client.id)
	}
}

// ==========================================
// Room: Manages a single 1v1 game
// ==========================================

type Room struct {
	id      string
	clients map[*Client]bool
	mu      sync.Mutex
}

func NewRoom(id string) *Room {
	return &Room{
		id:      id,
		clients: make(map[*Client]bool),
	}
}

func (r *Room) broadcast(sender *Client, message []byte) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Broadcast to everyone in room EXCEPT sender (usually)
	// But actually for game state, we usually send to opponent.
	// For simplicity, we send to everyone in room, and client filters.
	for client := range r.clients {
		if client != sender {
			select {
			case client.send <- message:
			default:
				// Handle error
			}
		}
	}
}

func (r *Room) handlePlayerLeave(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.clients, client)

	// Notify remaining players
	leaveMsg, _ := json.Marshal(Message{
		Type:    "player_left",
		Payload: map[string]string{"id": client.id},
	})

	for c := range r.clients {
		c.send <- leaveMsg
	}
}

// ==========================================
// Client: Represents a connected user
// ==========================================

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	id   string
	room *Room
}

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
			c.sendGameStart(opponent.id)
			opponent.sendGameStart(c.id)

			log.Printf("Match started: %s vs %s", c.id, opponent.id)

		} else {
			// Wait
			c.hub.waitingClient = c
			c.hub.mu.Unlock()
			c.send <- toJson(Message{Type: "waiting_for_opponent"})
		}

	case "game_state", "attack", "game_over":
		if c.room != nil {
			// Forward to opponent
			// Re-wrap to perform sender injection
			msg.SenderID = c.id
			bytes, _ := json.Marshal(msg)
			c.room.broadcast(c, bytes)
		}
	}
}

func (c *Client) sendIdentity() {
	c.send <- toJson(Message{
		Type:     "identity",
		SenderID: c.id,
	})
}

func (c *Client) sendGameStart(opponentID string) {
	c.send <- toJson(Message{
		Type:    "game_start",
		Payload: map[string]string{"opponentId": opponentID},
	})
}

// ==========================================
// Helpers & Types
// ==========================================

type Message struct {
	Type     string      `json:"type"`
	Payload  interface{} `json:"payload,omitempty"`
	SenderID string      `json:"senderId,omitempty"`
}

func toJson(v interface{}) []byte {
	b, _ := json.Marshal(v)
	return b
}

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	id := fmt.Sprintf("user-%d", time.Now().UnixNano())
	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256), id: id}
	client.hub.register <- client

	go client.writePump()
	go client.readPump()
}

func main() {
	hub := NewHub()
	go hub.Run()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	http.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Tetris Server Online")
	})

	log.Println("Server listening on :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
