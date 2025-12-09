import (
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

// GameSession holds the state for our game, ensuring thread-safety with a Mutex.
type GameSession struct {
	mu      sync.Mutex
	players int // Example state: count of currently connected players
	// Add other game-related state here as needed
}

// NewGameSession creates and returns a new, initialized GameSession.
func NewGameSession() *GameSession {
	return &GameSession{
		players: 0,
	}
}

// upgrader is a global instance of websocket.Upgrader.
// It specifies parameters for upgrading an HTTP connection to a WebSocket connection.
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// CheckOrigin specifies a function that is used to validate the origin of an incoming connection.
	// It's important for security. For simplicity in this example, we allow all origins.
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// ServeWS handles WebSocket connection requests.
// It upgrades the HTTP connection, prints connection messages, and manages player count.
func (gs *GameSession) ServeWS(w http.ResponseWriter, r *http.Request) {
	// Upgrade the HTTP connection to a WebSocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	// Increment player count and log connection
	gs.mu.Lock()
	gs.players++
	fmt.Printf("New Player Connected. Total players: %d\n", gs.players)
	gs.mu.Unlock()

	// Ensure the connection is closed and player count is decremented when the function exits
	defer func() {
		conn.Close()
		gs.mu.Lock()
		gs.players--
		fmt.Printf("Player Disconnected. Total players: %d\n", gs.players)
		gs.mu.Unlock()
	}()

	// Keep the connection alive by continuously reading messages.
	// This loop will block until the client sends a message or disconnects.
	// For this example, we don't process messages, just keep the connection open.
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			// Client disconnected or an error occurred (e.g., websocket.CloseError)
			break
		}
		// If you wanted to handle messages, you would do it here.
		// For example: fmt.Printf("Received message from player: %s\n", string(message))
	}
}

// ServeHello handles requests to the root path and returns a "Hello" message.
func (gs *GameSession) ServeHello(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello from the Go server!")
}

func main() {
	// Create a new game session instance
	gameSession := NewGameSession()

	// Register the HTTP handlers
	http.HandleFunc("/", gameSession.ServeHello)
	http.HandleFunc("/ws", gameSession.ServeWS)

	// Start the HTTP server
	port := ":8080"
	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(port, nil))
}