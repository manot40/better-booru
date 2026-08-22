package danbooru

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/manot40/better-booru/internal/config"
	"github.com/manot40/better-booru/internal/constant"
)

// Client is an HTTP client for interacting with the Danbooru API.
type Client struct {
	baseURL    string
	userID     string
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a new Danbooru API client using the given configuration.
func NewClient(cfg *config.Config) *Client {
	return &Client{
		baseURL: constant.DanbooruURL,
		userID:  cfg.DanbooruUserID,
		apiKey:  cfg.DanbooruAPIKey,
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

// NewClientWithHTTP creates a Danbooru API client with a custom HTTP client and base URL (useful for testing).
func NewClientWithHTTP(baseURL, userID, apiKey string, httpClient *http.Client) *Client {
	if baseURL == "" {
		baseURL = constant.DanbooruURL
	}
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 20 * time.Second}
	}
	return &Client{
		baseURL:    baseURL,
		userID:     userID,
		apiKey:     apiKey,
		httpClient: httpClient,
	}
}

func (c *Client) addAuth(q url.Values) {
	if c.userID != "" && c.apiKey != "" {
		q.Set("login", c.userID)
		q.Set("api_key", c.apiKey)
	}
}

func (c *Client) prepareRequest(req *http.Request) {
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Referer", c.baseURL+"/")

	if c.userID != "" && c.apiKey != "" {
		req.SetBasicAuth(c.userID, c.apiKey)
		req.Header.Set("User-Agent", fmt.Sprintf("BetterBooru/1.0 (by %s on Danbooru)", c.userID))
	} else {
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")
	}
}

func (c *Client) doRequest(ctx context.Context, reqURL *url.URL) (*http.Response, error) {
	var resp *http.Response
	maxRetries := 3

	for attempt := 0; attempt < maxRetries; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL.String(), nil)
		if err != nil {
			return nil, fmt.Errorf("creating request: %w", err)
		}
		c.prepareRequest(req)

		resp, err = c.httpClient.Do(req)
		if err != nil {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			if attempt < maxRetries-1 {
				backoff := time.Duration(1<<attempt)*time.Second + time.Duration(rand.Intn(500))*time.Millisecond
				select {
				case <-ctx.Done():
					return nil, ctx.Err()
				case <-time.After(backoff):
					continue
				}
			}
			return nil, fmt.Errorf("executing request: %w", err)
		}

		// If Cloudflare challenge (403/503/429) or transient 5xx, retry with jitter
		if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusTooManyRequests ||
			resp.StatusCode == http.StatusBadGateway || resp.StatusCode == http.StatusServiceUnavailable {
			_ = resp.Body.Close()
			if attempt < maxRetries-1 {
				backoff := time.Duration(1<<attempt)*time.Second + time.Duration(rand.Intn(1000))*time.Millisecond
				select {
				case <-ctx.Done():
					return nil, ctx.Err()
				case <-time.After(backoff):
					continue
				}
			}
			return nil, fmt.Errorf("danbooru request failed with status %d (possible Cloudflare challenge or rate limit)", resp.StatusCode)
		}

		return resp, nil
	}

	return resp, nil
}

// ListPosts fetches a list of posts from Danbooru.
func (c *Client) ListPosts(ctx context.Context, page, tags string, limit int) ([]DanbooruResponse, error) {
	if limit <= 0 {
		limit = 50
	} else if limit > 200 {
		limit = 200
	}

	reqURL, err := url.Parse(c.baseURL + "/posts.json")
	if err != nil {
		return nil, fmt.Errorf("parsing url: %w", err)
	}

	q := reqURL.Query()
	c.addAuth(q)
	q.Set("limit", strconv.Itoa(limit))
	if page != "" {
		q.Set("page", page)
	}
	if tags != "" {
		q.Set("tags", tags)
	}
	reqURL.RawQuery = q.Encode()

	resp, err := c.doRequest(ctx, reqURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("danbooru error %d: %s", resp.StatusCode, string(body))
	}

	var posts []DanbooruResponse
	if err := json.NewDecoder(resp.Body).Decode(&posts); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	return posts, nil
}

// GetPost fetches a single post by ID from Danbooru.
func (c *Client) GetPost(ctx context.Context, id int) (*DanbooruResponse, error) {
	reqURL, err := url.Parse(fmt.Sprintf("%s/posts/%d.json", c.baseURL, id))
	if err != nil {
		return nil, fmt.Errorf("parsing url: %w", err)
	}

	q := reqURL.Query()
	c.addAuth(q)
	reqURL.RawQuery = q.Encode()

	resp, err := c.doRequest(ctx, reqURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("danbooru error %d: %s", resp.StatusCode, string(body))
	}

	var post DanbooruResponse
	if err := json.NewDecoder(resp.Body).Decode(&post); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	return &post, nil
}

// CountPosts fetches the count of posts matching the given tags.
func (c *Client) CountPosts(ctx context.Context, tags string) (int, error) {
	reqURL, err := url.Parse(c.baseURL + "/counts/posts.json")
	if err != nil {
		return 0, fmt.Errorf("parsing url: %w", err)
	}

	q := reqURL.Query()
	c.addAuth(q)
	if tags != "" {
		q.Set("tags", tags)
	}
	reqURL.RawQuery = q.Encode()

	resp, err := c.doRequest(ctx, reqURL)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return 0, fmt.Errorf("danbooru error %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Counts struct {
			Posts int `json:"posts"`
		} `json:"counts"`
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("reading response: %w", err)
	}

	if err := json.Unmarshal(body, &result); err == nil && result.Counts.Posts > 0 {
		return result.Counts.Posts, nil
	}

	var direct struct {
		Count int `json:"count"`
	}
	if err := json.Unmarshal(body, &direct); err == nil {
		return direct.Count, nil
	}

	return 0, nil
}

// Autocomplete fetches tag autocompletion suggestions from Danbooru.
func (c *Client) Autocomplete(ctx context.Context, query string) ([]AutocompleteItem, error) {
	reqURL, err := url.Parse(c.baseURL + "/autocomplete.json")
	if err != nil {
		return nil, fmt.Errorf("parsing url: %w", err)
	}

	q := reqURL.Query()
	c.addAuth(q)
	q.Set("search[query]", query)
	q.Set("search[type]", "tag_query")
	q.Set("version", "1")
	q.Set("limit", "10")
	reqURL.RawQuery = q.Encode()

	resp, err := c.doRequest(ctx, reqURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("danbooru error %d: %s", resp.StatusCode, string(body))
	}

	var items []AutocompleteItem
	if err := json.NewDecoder(resp.Body).Decode(&items); err != nil {
		// Fallback if returned as raw slice of strings
		var stringList []string
		if err2 := json.NewDecoder(bytes.NewReader(bodySlice(resp.Body))).Decode(&stringList); err2 == nil {
			for _, s := range stringList {
				items = append(items, AutocompleteItem{
					Value: s,
					Label: s,
				})
			}
			return items, nil
		}
		return nil, fmt.Errorf("decoding autocomplete response: %w", err)
	}

	return items, nil
}

func bodySlice(r io.Reader) []byte {
	b, _ := io.ReadAll(r)
	return b
}
