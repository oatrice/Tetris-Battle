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

func (c *Client) sendGameStart(opponentId string, opponentName string) {
	c.send <- toJson(Message{
		Type: "game_start",
		Payload: map[string]string{
			"opponentId":   opponentId,
			"opponentName": opponentName,
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
			c.sendGameStart(opponent.id, opponent.name)
			opponent.sendGameStart(c.id, c.name)

			log.Printf("Match started: %s (%s) vs %s (%s)", c.id, c.name, opponent.id, opponent.name)

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

func main() {
	hub := NewHub()
	go hub.run()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println(err)
			return
		}

		client := &Client{
			hub:  hub,
			conn: conn,
			send: make(chan []byte, 256),
			id:   fmt.Sprintf("user-%d", time.Now().UnixNano()),
		}
		client.hub.register <- client

		go client.writePump()
		go client.readPump()
	})

	log.Println("Server started on :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
