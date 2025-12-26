package tetrisserver

import (
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

// TDD: Red -> Green -> Refactor
// This test verifies that the server handles static files correctly,
// mimicking a "native" web server behavior (correct status, mime types).
// It acts as a "Parity Check" for the Go library serving Nuxt assets.

func TestServerParity(t *testing.T) {
	// 1. Get the Handler (This function doesn't exist yet - RED)
	handler := NewServerHandler()

	// 2. Create a test server
	ts := httptest.NewServer(handler)
	defer ts.Close()

	// 3. Walk through the embedded 'public' filesystem
	//    and verify every file is served correctly.

	// Access the unexported 'content' var from server.go
	// (Check if we can access it since we are in same package)
	publicFS, err := fs.Sub(content, "public")
	if err != nil {
		t.Fatalf("Failed to create sub fs: %v", err)
	}

	err = fs.WalkDir(publicFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}

		// Prepare Request
		url := ts.URL + "/" + path
		resp, err := ts.Client().Get(url)
		if err != nil {
			t.Errorf("Failed to GET %s: %v", path, err)
			return nil
		}
		defer resp.Body.Close()

		// A. Verify Status Code -> 200 OK
		if resp.StatusCode != http.StatusOK {
			t.Errorf("[%s] Expected 200 OK, got %d", path, resp.StatusCode)
		}

		// B. Verify Content-Type (Critical for Browser/WebView)
		ext := strings.ToLower(filepath.Ext(path))
		contentType := resp.Header.Get("Content-Type")

		// Define expectations
		expectedType := ""
		switch ext {
		case ".html":
			expectedType = "text/html"
		case ".js":
			expectedType = "application/javascript"
		case ".css":
			expectedType = "text/css"
		case ".json":
			expectedType = "application/json"
		case ".png":
			expectedType = "image/png"
		case ".ico":
			expectedType = "image/x-icon"
		case ".svg":
			expectedType = "image/svg+xml"
		}

		// If we have an expectation, enforce it
		if expectedType != "" && !strings.Contains(contentType, expectedType) {
			t.Errorf("[%s] Invalid Content-Type. Expected containing '%s', got '%s'", path, expectedType, contentType)
		} else if expectedType == "" {
			t.Logf("[%s] Warning: No specific expectation for extension '%s'. Got: '%s'", path, ext, contentType)
		}

		// C. Verify Content Integrity
		// Read actual file content
		f, _ := publicFS.Open(path)
		defer f.Close()
		expectedBytes, _ := io.ReadAll(f)

		// Read response body
		bodyBytes, _ := io.ReadAll(resp.Body)

		if len(bodyBytes) != len(expectedBytes) {
			t.Errorf("[%s] Content Length mismatch. Expected %d, got %d", path, len(expectedBytes), len(bodyBytes))
		}

		return nil
	})

	if err != nil {
		t.Fatalf("WalkDir failed: %v", err)
	}
}

func TestVersionEndpoint(t *testing.T) {
	handler := NewServerHandler()
	ts := httptest.NewServer(handler)
	defer ts.Close()

	url := ts.URL + "/debug/version"
	resp, err := ts.Client().Get(url)
	if err != nil {
		t.Fatalf("Failed to GET /debug/version: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected 200 OK, got %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	version := string(body)
	expected := "lib-v1.1.4"

	if version != expected {
		t.Errorf("Expected version '%s', got '%s'", expected, version)
	}
}
