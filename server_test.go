package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
)

// TestWebSocketConnection verifies that we can upgrade HTTP to WebSocket
// using the GameSession.ServeWS handler.
func TestWebSocketConnection(t *testing.T) {
	// 1. Initialize GameSession
	gs := NewGameSession()

	// 2. Create a test server that uses our ServeWS handler
	s := httptest.NewServer(http.HandlerFunc(gs.ServeWS))
	defer s.Close()

	// 3. Convert http:// -> ws://
	wsURL := "ws" + strings.TrimPrefix(s.URL, "http")

	// 4. Connect using Gorilla Dial
	_, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to open WebSocket connection: %v", err)
	}
}

// TestServeHello verifies the root handler returns the correct greeting.
func TestServeHello(t *testing.T) {
	// 1. Initialize GameSession
	gs := NewGameSession()

	// 2. Create a request to "/"
	req, err := http.NewRequest("GET", "/", nil)
	if err != nil {
		t.Fatal(err)
	}

	// 3. Create a ResponseRecorder
	rr := httptest.NewRecorder()

	// 4. Call ServeHello directly
	gs.ServeHello(rr, req)

	// 5. Check Status Code
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	// 6. Check Body
	expected := "Hello from the Go server!"
	if rr.Body.String() != expected {
		t.Errorf("handler returned unexpected body: got %v want %v",
			rr.Body.String(), expected)
	}
}
