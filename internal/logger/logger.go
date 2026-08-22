package logger

import (
	"errors"
	"fmt"
	"io"
	"log"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// DailyRotateWriter writes log output to daily-rotated log files inside a target directory.
// It implements io.WriteCloser and is safe for concurrent use.
type DailyRotateWriter struct {
	dir         string
	timeFunc    func() time.Time
	mu          sync.Mutex
	currentDay  string
	currentFile *os.File
	closed      bool
}

// NewDailyRotateWriter creates a new DailyRotateWriter for the given directory using the system clock.
// dir can be an absolute path or relative to the launch directory.
func NewDailyRotateWriter(dir string) (*DailyRotateWriter, error) {
	return NewDailyRotateWriterWithClock(dir, time.Now)
}

// NewDailyRotateWriterWithClock creates a new DailyRotateWriter with a custom clock function (useful for tests).
func NewDailyRotateWriterWithClock(dir string, timeFunc func() time.Time) (*DailyRotateWriter, error) {
	if dir == "" {
		return nil, errors.New("logs directory cannot be empty")
	}

	if timeFunc == nil {
		timeFunc = time.Now
	}

	absDir, err := filepath.Abs(dir)
	if err != nil {
		return nil, fmt.Errorf("resolving logs directory path: %w", err)
	}

	if err := os.MkdirAll(absDir, 0755); err != nil {
		return nil, fmt.Errorf("creating logs directory: %w", err)
	}

	w := &DailyRotateWriter{
		dir:      absDir,
		timeFunc: timeFunc,
	}

	// Ensure the initial file for the current day can be opened.
	if err := w.rotateLocked(w.timeFunc()); err != nil {
		return nil, err
	}

	return w, nil
}

// Write writes data to the current day's log file, rotating to a new file if the day has changed.
func (w *DailyRotateWriter) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.closed {
		return 0, os.ErrClosed
	}

	now := w.timeFunc()
	day := now.Format("2006-01-02")

	if day != w.currentDay || w.currentFile == nil {
		if err := w.rotateLocked(now); err != nil {
			return 0, err
		}
	}

	return w.currentFile.Write(p)
}

// rotateLocked opens the appropriate daily log file while holding the mutex.
func (w *DailyRotateWriter) rotateLocked(now time.Time) error {
	day := now.Format("2006-01-02")

	if w.currentFile != nil {
		_ = w.currentFile.Sync()
		_ = w.currentFile.Close()
		w.currentFile = nil
	}

	if err := os.MkdirAll(w.dir, 0755); err != nil {
		return fmt.Errorf("ensuring logs directory exists: %w", err)
	}

	filename := fmt.Sprintf("booru_server_%s.log", day)
	filePath := filepath.Join(w.dir, filename)

	file, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("opening log file %s: %w", filePath, err)
	}

	w.currentFile = file
	w.currentDay = day
	return nil
}

// Close flushes and closes the active log file.
func (w *DailyRotateWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.closed {
		return nil
	}
	w.closed = true

	if w.currentFile != nil {
		_ = w.currentFile.Sync()
		err := w.currentFile.Close()
		w.currentFile = nil
		return err
	}
	return nil
}

// Dir returns the absolute directory path where logs are stored.
func (w *DailyRotateWriter) Dir() string {
	return w.dir
}

// CurrentDay returns the date string (YYYY-MM-DD) currently active.
func (w *DailyRotateWriter) CurrentDay() string {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.currentDay
}

// CurrentFilename returns the filename of the currently active log file.
func (w *DailyRotateWriter) CurrentFilename() string {
	w.mu.Lock()
	defer w.mu.Unlock()
	return fmt.Sprintf("booru_server_%s.log", w.currentDay)
}

// InitLogger configures the global slog and stdlib log output.
// If logsDir is non-empty, logs are redirected to daily-rotated files in logsDir.
// If logsDir is empty, logs are directed to os.Stdout.
// Returns an io.Closer (nil if stdout) and an io.Writer for use in middleware like Fiber logger.
func InitLogger(logsDir string) (io.Closer, io.Writer, error) {
	var writer io.Writer = os.Stdout
	var closer io.Closer

	if logsDir != "" {
		rotator, err := NewDailyRotateWriter(logsDir)
		if err != nil {
			return nil, nil, fmt.Errorf("initializing daily log writer: %w", err)
		}
		writer = rotator
		closer = rotator
	}

	handler := slog.NewTextHandler(writer, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	slog.SetDefault(slog.New(handler))
	log.SetOutput(writer)

	return closer, writer, nil
}
