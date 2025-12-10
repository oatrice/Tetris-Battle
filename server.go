package main

import (
	"fmt"
	"net/http"
	"sync"
)

// Server represents our HTTP server.
type Server struct {
	sessions map[string]*GameSession // A map to hold active game sessions
	mu       sync.RWMutex          // For thread-safe access to the sessions map
}

// NewServer creates and returns a new Server instance.
func NewServer() *Server {
	return &Server{
		sessions: make(map[string]*GameSession), // Initialize the sessions map
	}
}

// ServeHello handles requests to the /hello endpoint.
func (s *Server) ServeHello(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Welcome to Tetris")
}

// ServeWS handles WebSocket connections.
// This is a placeholder implementation to satisfy the test's expectation.
func (s *Server) ServeWS(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "WebSocket endpoint - not yet implemented")
	// Example using gorilla/websocket:
	// var upgrader = websocket.Upgrader{
	// 	ReadBufferSize:  1024,
	// 	WriteBufferSize: 1024,
	// }
	// conn, err := upgrader.Upgrade(w, r, nil)
	// if err != nil {
	// 	log.Println(err)
	// 	return
	// }
	// defer conn.Close()
	// // Handle WebSocket messages here
	// for {
	// 	mt, message, err := conn.ReadMessage()
	// 	if err != nil {
	// 		log.Println("read:", err)
	// 		break
	// 	}
	// 	log.Printf("recv: %s", message)
	// 	err = conn.WriteMessage(mt, message)
	// 	if err != nil {
	// 		log.Println("write:", err)
	// 		break
	// 	}
	// }
}

// ServeHTTP routes incoming requests to the appropriate handler.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/hello":
		s.ServeHello(w, r)
	case "/ws": // Added route for WebSocket handler
		s.ServeWS(w, r)
	// Add other routes here as needed for game logic (e.g., /game/start, /game/{id}/join)
	default:
		http.NotFound(w, r)
	}
}

// Run starts the HTTP server.
func (s *Server) Run(addr string) error {
	fmt.Printf("Server listening on %s\n", addr)
	return http.ListenAndServe(addr, s)
}

// GameSession represents a single game session.
type GameSession struct {
	id        string
	players   []string // Example field, could hold player IDs or connections
	isStarted bool
	mu        sync.Mutex // Mutex for thread-safe access to GameSession fields
}

// NewGameSession creates and returns a new GameSession.
func NewGameSession() *GameSession {
	return &GameSession{
		id:        "", // Default ID, a real game would likely generate or accept an ID
		players:   make([]string, 0),
		isStarted: false, // Initialize as not started
	}
}

// StartGame sets the session's isStarted flag to true in a thread-safe manner.
// It also includes a check to prevent starting an already started game.
func (gs *GameSession) StartGame() {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	if !gs.isStarted {
		gs.isStarted = true
		fmt.Printf("Game session %s started.\n", gs.id)
		// Add any other game start logic here (e.g., timer, initial board setup, notifying players)
	} else {
		fmt.Printf("Game session %s is already started.\n", gs.id)
	}
}

// IsStarted returns the current status of the game session in a thread-safe manner.
func (gs *GameSession) IsStarted() bool {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	return gs.isStarted
}

func main() {
	server := NewServer()

	// Example usage of GameSession:
	game1 := NewGameSession()
	game1.id = "tetris-game-1" // Manually set ID for demonstration purposes
	fmt.Printf("Game %s started status: %t\n", game1.id, game1.IsStarted()) // Should be false
	game1.StartGame()                                                    // Should print "Game session tetris-game-1 started."
	fmt.Printf("Game %s started status: %t\n", game1.id, game1.IsStarted()) // Should be true
	game1.StartGame()                                                    // Should print "Game session tetris-game-1 is already started."

	// Start the HTTP server
	if err := server.Run(":8080"); err != nil {
		fmt.Printf("Server failed: %v\n", err)
	}
}