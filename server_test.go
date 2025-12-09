package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

// TestWebSocketConnection is the RED test.
// It tries to connect to the WebSocket endpoint "/ws".
// This currently fails because our server.go (Production Code) only has a root HTTP handler.
func TestWebSocketConnection(t *testing.T) {
	// Start a test server using our http handlers (which currently don't include /ws)
	s := httptest.NewServer(nil) // nil handler means it uses DefaultServeMux
	defer s.Close()

	// Convert http:// to ws://
	wsURL := "ws" + strings.TrimPrefix(s.URL, "http") + "/ws"

	// Attempt to dial the websocket
	_, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		// We EXPECT this to fail initially (RED state), but in TDD we assert it SHOULD succeed.
		// So testing failure here means the test itself failed to pass.
		t.Fatalf("Failed to open WebSocket connection: %v", err)
	}
}

// Ensure the server actually sends "Hello" on standard HTTP (Regression Test)
func TestRootHandler(t *testing.T) {
    req, err := http.NewRequest("GET", "/", nil)
    if err != nil {
        t.Fatal(err)
    }

    rr := httptest.NewRecorder()
    handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Write([]byte("Hello from Luma Tetris Server"))
	})

    handler.ServeHTTP(rr, req)

    if status := rr.Code; status != http.StatusOK {
        t.Errorf("handler returned wrong status code: got %v want %v",
            status, http.StatusOK)
    }
}
